'use client';

import { useState } from 'react';
import { useGuiasRemision } from '@/hooks/useGuiasRemision';
import type { EstadoGuiaRemision, GuiaRemision, PaginatedGuias } from '@/services/guiasRemision.service';
import { getClientDisplayName, formatDate } from '@/utils/formatters';

const ESTADOS: { value: string; label: string; color: string }[] = [
  { value: '', label: 'Todos', color: '' },
  { value: 'borrador', label: 'Borrador', color: 'text-[#94A3B8] bg-[#334155]/40' },
  { value: 'enviando', label: 'Enviando', color: 'text-yellow-400 bg-yellow-400/10' },
  { value: 'aceptada_sunat', label: 'Aceptada SUNAT', color: 'text-[#10B981] bg-[#10B981]/10' },
  { value: 'rechazada_sunat', label: 'Rechazada', color: 'text-[#EF4444] bg-[#EF4444]/10' },
];

function EstadoBadge({ estado }: { estado: EstadoGuiaRemision }) {
  const cfg = ESTADOS.find(e => e.value === estado);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${cfg?.color ?? ''}`}>
      {cfg?.label ?? estado}
    </span>
  );
}

export default function GuiasRemisionClient({ initialGuias }: { initialGuias?: PaginatedGuias }) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);

  const params = { page, pageSize: 20, search: search || undefined, estado: estadoFilter || undefined };
  const { data, isLoading, isError } = useGuiasRemision(
    params,
    page === 1 && !search && !estadoFilter ? initialGuias : undefined,
  );

  const guias = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleEstado = (v: string) => {
    setEstadoFilter(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <iconify-icon
            icon="solar:magnifer-linear"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-base pointer-events-none"
          ></iconify-icon>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por serie, destinatario, documento..."
            className="w-full bg-[#181B21] border border-[#334155] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        <div className="relative">
          <select
            value={estadoFilter}
            onChange={e => handleEstado(e.target.value)}
            title="Estado"
            className="appearance-none bg-[#181B21] border border-[#334155] rounded-lg px-3 py-2.5 pr-8 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
          >
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-[#334155]/30 rounded" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm">
          Error al cargar las guías de remisión.
        </div>
      ) : guias.length === 0 ? (
        <div className="bg-[#181B21] border border-dashed border-[#334155] rounded-xl p-12 text-center">
          <iconify-icon icon="solar:document-linear" class="text-3xl text-[#334155] mb-2"></iconify-icon>
          <p className="text-sm text-[#94A3B8]">No hay guías de remisión registradas.</p>
          <p className="text-xs text-[#64748B] mt-1">
            Emitís una guía desde el detalle de un pedido.
          </p>
        </div>
      ) : (
        <div className="bg-[#181B21] border border-[#334155] rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F1115] border-b border-[#334155]">
                  {['Serie-Número', 'Fecha Emisión', 'Fecha Traslado', 'Destinatario', 'Motivo', 'Estado', 'Archivos'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {guias.map(g => (
                  <GuiaRow key={g.id} guia={g} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#334155]">
            {guias.map(g => (
              <GuiaCard key={g.id} guia={g} />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#94A3B8]">
          <span>{total} guías en total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-[#181B21] border border-[#334155] rounded-lg disabled:opacity-40 hover:border-[#94A3B8] transition-colors"
            >
              ←
            </button>
            <span className="px-3 py-1.5">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-[#181B21] border border-[#334155] rounded-lg disabled:opacity-40 hover:border-[#94A3B8] transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GuiaRow({ guia }: { guia: GuiaRemision }) {
  const clienteNombre = guia.clientes
    ? getClientDisplayName(guia.clientes as Parameters<typeof getClientDisplayName>[0])
    : guia.destinatario_razon_social;

  return (
    <tr className="hover:bg-[#334155]/10 transition-colors">
      <td className="px-3 py-3 font-mono text-sm text-[#3B82F6] font-medium whitespace-nowrap">
        {guia.serie_numero}
      </td>
      <td className="px-3 py-3 text-sm text-[#94A3B8] whitespace-nowrap">
        {formatDate(guia.fecha_emision)}
      </td>
      <td className="px-3 py-3 text-sm text-[#94A3B8] whitespace-nowrap">
        {formatDate(guia.fecha_inicio_traslado)}
      </td>
      <td className="px-3 py-3 text-sm text-[#E2E8F0] max-w-[180px]">
        <p className="truncate">{clienteNombre}</p>
        <p className="text-[10px] text-[#64748B] font-mono">{guia.destinatario_num_doc}</p>
      </td>
      <td className="px-3 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
        {guia.motivo_traslado_codigo}
      </td>
      <td className="px-3 py-3">
        <EstadoBadge estado={guia.estado_sunat} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {guia.enlace_pdf && (
            <a
              href={guia.enlace_pdf}
              target="_blank"
              rel="noopener noreferrer"
              title="Descargar PDF"
              className="text-[#EF4444] hover:text-red-300 transition-colors"
            >
              <iconify-icon icon="solar:file-download-linear" class="text-lg"></iconify-icon>
            </a>
          )}
          {guia.enlace_xml && (
            <a
              href={guia.enlace_xml}
              target="_blank"
              rel="noopener noreferrer"
              title="Descargar XML"
              className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
            >
              <iconify-icon icon="solar:file-text-linear" class="text-lg"></iconify-icon>
            </a>
          )}
          {!guia.enlace_pdf && !guia.enlace_xml && (
            <span className="text-xs text-[#334155]">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function GuiaCard({ guia }: { guia: GuiaRemision }) {
  const clienteNombre = guia.clientes
    ? getClientDisplayName(guia.clientes as Parameters<typeof getClientDisplayName>[0])
    : guia.destinatario_razon_social;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-[#3B82F6] font-medium">{guia.serie_numero}</span>
        <EstadoBadge estado={guia.estado_sunat} />
      </div>
      <p className="text-sm text-[#E2E8F0]">{clienteNombre}</p>
      <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
        <span>Emisión: {formatDate(guia.fecha_emision)}</span>
        <span>•</span>
        <span>Traslado: {formatDate(guia.fecha_inicio_traslado)}</span>
      </div>
      <div className="flex gap-2 pt-1">
        {guia.enlace_pdf && (
          <a href={guia.enlace_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[#EF4444] flex items-center gap-1">
            <iconify-icon icon="solar:file-download-linear" class="text-sm"></iconify-icon> PDF
          </a>
        )}
        {guia.enlace_xml && (
          <a href={guia.enlace_xml} target="_blank" rel="noopener noreferrer" className="text-xs text-[#94A3B8] flex items-center gap-1">
            <iconify-icon icon="solar:file-text-linear" class="text-sm"></iconify-icon> XML
          </a>
        )}
      </div>
    </div>
  );
}
