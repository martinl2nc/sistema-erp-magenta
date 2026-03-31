'use client';

import { useState, useMemo } from 'react';
import { usePedidosList } from '@/hooks/usePedidos';
import { useAuth } from '@/context/AuthContext';
import type { Pedido, PedidoEstado } from '@/services/pedidos.service';
import PedidoDetailDrawer from '@/features/pedidos/PedidoDetailDrawer';

const ESTADO_LABELS: Record<PedidoEstado, string> = {
  pendiente_facturacion: 'Pendiente',
  procesando_facturacion: 'Procesando',
  facturado: 'Facturado',
  error_facturacion: 'Error',
  anulado: 'Anulado',
};

const ESTADO_STYLES: Record<PedidoEstado, string> = {
  pendiente_facturacion: 'bg-yellow-500/10 text-yellow-400',
  procesando_facturacion: 'bg-blue-500/10 text-blue-400',
  facturado: 'bg-[#10B981]/10 text-[#10B981]',
  error_facturacion: 'bg-red-500/10 text-red-400',
  anulado: 'bg-[#94A3B8]/10 text-[#94A3B8]',
};

export default function PedidosPage() {
  const { role, user } = useAuth();
  const { data: allPedidos = [], isLoading, isError, error } = usePedidosList();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const pedidos = useMemo(() => {
    let list = allPedidos;
    if (role === 'vendedor' && user?.id) {
      list = list.filter((p) => p.vendedor_id === user.id);
    }
    const search = searchTerm.trim().toLowerCase();
    if (search) {
      list = list.filter((p) => {
        const cot = p.cotizaciones;
        const cliente = cot?.clientes;
        const fields = [
          String(cot?.numero_correlativo || ''),
          cliente?.razon_social || '',
          cliente?.nombres_contacto || '',
          cliente?.apellidos_contacto || '',
          cliente?.numero_documento || '',
          p.nro_oc_cliente || '',
        ];
        return fields.some((f) => f.toLowerCase().includes(search));
      });
    }
    if (selectedEstado) {
      list = list.filter((p) => p.estado === selectedEstado);
    }
    return list;
  }, [allPedidos, role, user?.id, searchTerm, selectedEstado]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
  };

  const getClienteName = (p: Pedido) => {
    const c = p.cotizaciones?.clientes;
    if (!c) return '—';
    if (c.razon_social?.trim()) return c.razon_social;
    return `${c.nombres_contacto || ''} ${c.apellidos_contacto || ''}`.trim() || '—';
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Pedidos</h1>
      </div>

      {/* Filters */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative group">
          <select
            title="Filtrar por estado"
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="appearance-none w-full sm:w-48 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cotización, cliente u OC..."
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
          />
        </div>
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Cargando pedidos...
          </div>
        )}
        {!isLoading && isError && (
          <div className="p-8 text-center text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        )}
        {!isLoading && !isError && pedidos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <iconify-icon icon="solar:box-linear" class="text-5xl text-[#334155]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">No hay pedidos registrados aún.</p>
            <p className="text-xs text-[#94A3B8]">Los pedidos se generan desde el módulo de Cotizaciones.</p>
          </div>
        )}

        {!isLoading && !isError && pedidos.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {pedidos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPedido(p)}
                  className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5 cursor-pointer hover:border-[#3B82F6]/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#E2E8F0]">
                      COT-{p.cotizaciones?.numero_correlativo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLES[p.estado]}`}>
                      {ESTADO_LABELS[p.estado]}
                    </span>
                  </div>
                  <p className="text-sm text-[#E2E8F0]">{getClienteName(p)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]">{formatDate(p.fecha_creacion)}</span>
                    <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(p.cotizaciones?.total_final ?? 0)}</span>
                  </div>
                  {p.nro_oc_cliente && (
                    <p className="text-xs text-[#94A3B8]">OC: {p.nro_oc_cliente}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0F1115]">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px]">Cotización</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px]">OC Cliente</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Fecha</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px] text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[140px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {pedidos.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPedido(p)}
                      className="hover:bg-[#334155]/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">
                        COT-{p.cotizaciones?.numero_correlativo}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getClienteName(p)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{p.nro_oc_cliente || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{formatDate(p.fecha_creacion)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium text-right">
                        {formatCurrency(p.cotizaciones?.total_final ?? 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-block w-fit ${ESTADO_STYLES[p.estado]}`}>
                          {ESTADO_LABELS[p.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <PedidoDetailDrawer
        pedido={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />
    </div>
  );
}
