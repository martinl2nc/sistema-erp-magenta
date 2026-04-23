'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAllPagosEmitidos, useAllPagosEmitidosTotales, useAnularPagoEmitido } from '@/hooks/usePagosEmitidos';
import { useMetodosPago, useCuentasBancarias } from '@/hooks/useCobros';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/Pagination';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate as formatDateUtil, getClientDisplayName } from '@/utils/formatters';
import { PAGINATION, TIMEOUTS } from '@/constants';
import type { PagoEmitidoListado } from '@/services/pagos-emitidos.service';

// ─── Date preset helpers ──────────────────────────────────────

type DatePreset = 'hoy' | 'semana' | 'mes' | 'custom';

function getPresetRange(preset: DatePreset): { desde: string; hasta: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'hoy') {
    const s = fmt(today);
    return { desde: s, hasta: s };
  }
  if (preset === 'semana') {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { desde: fmt(monday), hasta: fmt(today) };
  }
  if (preset === 'mes') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { desde: fmt(first), hasta: fmt(today) };
  }
  return { desde: '', hasta: '' };
}

// ─── Método de pago icons ─────────────────────────────────────

const METODO_ICONS: Record<string, string> = {
  EFECTIVO:      'solar:hand-money-linear',
  TRANSFERENCIA: 'solar:transfer-horizontal-linear',
  YAPE:          'solar:smartphone-linear',
  PLIN:          'solar:smartphone-linear',
  CHEQUE:        'solar:checklist-minimalistic-linear',
  DETRACCION:    'solar:bill-check-linear',
};

function getMetodoIcon(codigo: string): string {
  return METODO_ICONS[codigo.toUpperCase()] ?? 'solar:card-linear';
}

// ─── Anulación inline ─────────────────────────────────────────

interface AnulacionPanelProps {
  pagoId: string;
  comprobanteCompraId: string;
  onClose: () => void;
}

function AnulacionPanel({ pagoId, comprobanteCompraId, onClose }: AnulacionPanelProps) {
  const [motivo, setMotivo] = useState('');
  const { user } = useAuth();
  const { mutateAsync: anularPago, isPending } = useAnularPagoEmitido(comprobanteCompraId);

  const handleConfirm = async () => {
    if (!motivo.trim()) { toast.error('Ingresá un motivo para la anulación.'); return; }
    try {
      await anularPago({ pago_id: pagoId, anulado_por: user!.id, motivo });
      toast.success('Pago anulado correctamente.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular pago');
    }
  };

  return (
    <div className="mt-2 border border-red-500/20 rounded-md p-3 space-y-2 bg-red-500/5">
      <p className="text-xs text-red-400 font-medium">¿Confirmar anulación?</p>
      <input
        type="text"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className="w-full bg-[#181B21] border border-red-500/30 rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-red-500/50"
      />
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {isPending ? 'Anulando...' : 'Confirmar'}
        </button>
        <button onClick={onClose} className="flex-1 text-[#94A3B8] hover:text-[#E2E8F0] text-xs py-1.5 rounded-md transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

interface ListadoPagosEmitidosProps {
  embedded?: boolean;
}

export default function ListadoPagosEmitidos({ embedded = false }: ListadoPagosEmitidosProps) {
  const { role } = useAuth();

  const [preset, setPreset] = useState<DatePreset>('mes');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [anulando, setAnulando] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const dateRange = preset === 'custom'
    ? { desde: customDesde, hasta: customHasta }
    : getPresetRange(preset);

  const filterParams = {
    fechaDesde:       dateRange.desde || undefined,
    fechaHasta:       dateRange.hasta || undefined,
    cuentaBancariaId: cuentaFilter    || undefined,
    metodoPagoCodigo: metodoFilter    || undefined,
    search:           debouncedSearch || undefined,
  };

  const { data: result, isLoading, isFetching, isError, error } = useAllPagosEmitidos({
    ...filterParams,
    page,
    pageSize,
  });
  const { data: totales } = useAllPagosEmitidosTotales(filterParams);

  const pagos      = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const { data: metodos = [] } = useMetodosPago();
  const { data: cuentas = [] } = useCuentasBancarias();

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const getProveedor = (p: PagoEmitidoListado): string => {
    const prov = p.comprobantes_compra?.proveedores;
    if (!prov) return '—';
    return getClientDisplayName({
      razon_social:       prov.razon_social,
      nombres_contacto:   prov.nombres_contacto,
      apellidos_contacto: prov.apellidos_contacto,
    }) || '—';
  };

  const formatDate = (d: string) => formatDateUtil(new Date(d));

  const PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Mes actual' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className={embedded ? 'flex flex-col gap-6 flex-1' : 'max-w-7xl w-full mx-auto flex flex-col gap-6 md:h-full'}>
      {/* Filtros */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 space-y-4">
        {/* Presets de fecha */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setPreset(key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                preset === key
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#0F1115] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#334155]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {preset === 'custom' && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8] shrink-0">Desde</label>
              <input
                type="date"
                value={customDesde}
                onChange={(e) => { setCustomDesde(e.target.value); setPage(1); }}
                className="bg-[#0F1115] border border-[#334155] rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8] shrink-0">Hasta</label>
              <input
                type="date"
                value={customHasta}
                onChange={(e) => { setCustomHasta(e.target.value); setPage(1); }}
                className="bg-[#0F1115] border border-[#334155] rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
          </div>
        )}

        {/* Search + Dropdowns */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Buscar por comprobante o Nro. Op..."
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
            />
          </div>

          <div className="relative">
            <select
              value={cuentaFilter}
              onChange={(e) => handleFilterChange(setCuentaFilter)(e.target.value)}
              className="appearance-none bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
            >
              <option value="">Todas las cuentas</option>
              {cuentas.map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.banco} — {cb.numero_cuenta}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
          </div>

          <div className="relative">
            <select
              value={metodoFilter}
              onChange={(e) => handleFilterChange(setMetodoFilter)(e.target.value)}
              className="appearance-none bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
            >
              <option value="">Todos los métodos</option>
              {metodos.map((m) => (
                <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
          </div>
        </div>

        {/* Totales */}
        {totales && (
          <div className="flex items-center gap-4 text-sm pt-1 border-t border-[#334155]">
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Pagos vigentes</p>
              <p className="font-semibold text-[#E2E8F0]">{totales.count}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Total pagado</p>
              <p className="font-bold text-[#10B981]">{formatCurrency(totales.monto)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className={`bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm md:flex-1 transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-12 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Cargando transacciones...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#EF4444]">Error al cargar transacciones</p>
            <p className="text-xs text-[#94A3B8]">{(error as Error)?.message}</p>
          </div>
        )}

        {!isLoading && !isError && pagos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <iconify-icon icon="solar:bill-list-linear" class="text-4xl text-[#334155]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">No hay pagos para el período seleccionado.</p>
          </div>
        )}

        {!isLoading && !isError && pagos.length > 0 && (
          <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {pagos.map((pago) => (
              <div key={pago.id} className={`border border-[#334155] rounded-lg p-4 space-y-2.5 ${pago.anulado ? 'opacity-50 bg-red-500/5' : 'bg-[#0F1115]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-[#3B82F6]">
                    {pago.comprobantes_compra?.serie_numero ?? '—'}
                  </span>
                  <span className="text-xs text-[#94A3B8]">{formatDate(pago.fecha_pago)}</span>
                </div>
                <p className="text-sm text-[#E2E8F0]">{getProveedor(pago)}</p>
                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                  <iconify-icon icon={getMetodoIcon(pago.metodo_pago_codigo ?? '')} class="text-base shrink-0"></iconify-icon>
                  <span>{pago.cat_metodos_pago?.descripcion ?? pago.metodo_pago_codigo ?? '—'}</span>
                </div>
                {pago.referencia_operacion && (
                  <p className="text-xs text-[#94A3B8] font-mono">Op: {pago.referencia_operacion}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-sm font-bold ${pago.anulado ? 'line-through text-[#94A3B8]' : 'text-[#10B981]'}`}>
                    {formatCurrency(pago.monto_pagado)}
                  </span>
                  {pago.anulado && (
                    <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">ANULADO</span>
                  )}
                  <div className="flex items-center gap-3">
                    {pago.comprobante_img_url && (
                      <a href={pago.comprobante_img_url} target="_blank" rel="noreferrer" className="text-[#3B82F6]">
                        <iconify-icon icon="solar:gallery-linear" class="text-base"></iconify-icon>
                      </a>
                    )}
                    {role === 'admin' && !pago.anulado && (
                      <button onClick={() => setAnulando(anulando === pago.id ? null : pago.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                        <iconify-icon icon="solar:trash-bin-minimalistic-linear" class="text-base"></iconify-icon>
                      </button>
                    )}
                  </div>
                </div>
                {anulando === pago.id && (
                  <AnulacionPanel pagoId={pago.id} comprobanteCompraId={pago.comprobante_compra_id} onClose={() => setAnulando(null)} />
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#334155] bg-[#0F1115]">
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">Comprobante</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">Pago</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">Nro. Op.</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase text-right whitespace-nowrap">Monto</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase whitespace-nowrap">Registrado por</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                {pagos.map((pago) => (
                  <tr
                    key={pago.id}
                    className={`transition-colors ${
                      pago.anulado
                        ? 'opacity-50 bg-red-500/5'
                        : 'hover:bg-[#334155]/20'
                    }`}
                  >
                    <td className="px-4 py-3.5 text-sm text-[#94A3B8] whitespace-nowrap">
                      {formatDate(pago.fecha_pago)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-mono text-[#3B82F6]">
                        {pago.comprobantes_compra?.serie_numero ?? '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 max-w-[180px]">
                      <span className="text-sm text-[#E2E8F0] truncate block" title={getProveedor(pago)}>
                        {getProveedor(pago)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <iconify-icon
                          icon={getMetodoIcon(pago.metodo_pago_codigo ?? '')}
                          class="text-base text-[#94A3B8] shrink-0"
                        ></iconify-icon>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-[#E2E8F0] whitespace-nowrap">
                            {pago.cat_metodos_pago?.descripcion ?? pago.metodo_pago_codigo ?? '—'}
                          </span>
                          {pago.cuentas_bancarias_empresa && (
                            <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                              {pago.cuentas_bancarias_empresa.banco} — {pago.cuentas_bancarias_empresa.numero_cuenta}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-sm text-[#94A3B8] font-mono">
                      {pago.referencia_operacion ?? '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className={`text-sm font-bold ${pago.anulado ? 'line-through text-[#94A3B8]' : 'text-[#10B981]'}`}>
                        {formatCurrency(pago.monto_pagado)}
                      </span>
                      {pago.anulado && (
                        <span className="ml-2 text-[10px] font-bold bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">
                          ANULADO
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-[#94A3B8]">
                      {pago.perfiles_usuario?.nombre ?? '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {pago.comprobante_img_url && (
                          <a
                            href={pago.comprobante_img_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver voucher"
                            className="text-[#3B82F6] hover:text-blue-400 transition-colors"
                          >
                            <iconify-icon icon="solar:gallery-linear" class="text-base"></iconify-icon>
                          </a>
                        )}
                        {role === 'admin' && !pago.anulado && (
                          <button
                            onClick={() => setAnulando(anulando === pago.id ? null : pago.id)}
                            title="Anular pago"
                            className="text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            <iconify-icon icon="solar:trash-bin-minimalistic-linear" class="text-base"></iconify-icon>
                          </button>
                        )}
                      </div>
                      {anulando === pago.id && (
                        <AnulacionPanel
                          pagoId={pago.id}
                          comprobanteCompraId={pago.comprobante_compra_id}
                          onClose={() => setAnulando(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!isLoading && !isError && totalPages > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
