'use client';

import { useState } from 'react';
import { useCompras, useKpisCompras } from '@/hooks/useCompras';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, formatLongDate, getClientDisplayName } from '@/utils/formatters';
import { PAGINATION, TIMEOUTS } from '@/constants';
import Pagination from '@/components/ui/Pagination';
import RegistrarPagoModal from './RegistrarPagoModal';
import HistorialPagosDrawer from './HistorialPagosDrawer';
import ListadoPagosEmitidos from './ListadoPagosEmitidos';
import AgingReportCompras from './AgingReportCompras';
import type { ComprobanteCompra, KpisCompras, PaginatedCompras } from '@/services/compras.service';

interface Props {
  initialKpis?: KpisCompras;
  initialCompras?: PaginatedCompras;
}

const ESTADO_STYLES: Record<string, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400',
  parcial:   'bg-orange-500/10 text-orange-400',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial:   'Parcial',
};

interface AgingInfo {
  label: string;
  style: string;
}

function getAgingInfo(fechaVencimiento: string | null): AgingInfo {
  if (!fechaVencimiento) return { label: 'Sin fecha', style: 'text-[#94A3B8]' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  const dias = Math.floor((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));

  if (dias <= 0)  return { label: `En ${Math.abs(dias)}d`, style: 'text-[#10B981]' };
  if (dias <= 30) return { label: `${dias}d`,              style: 'text-yellow-400' };
  if (dias <= 60) return { label: `${dias}d`,              style: 'text-orange-400' };
  return              { label: `${dias}d`,              style: 'text-red-400' };
}

function getProveedorName(c: ComprobanteCompra): string {
  if (!c.proveedores) return '—';
  return getClientDisplayName({
    razon_social:       c.proveedores.razon_social,
    nombres_contacto:   c.proveedores.nombres_contacto,
    apellidos_contacto: c.proveedores.apellidos_contacto,
  }) || '—';
}

type Tab = 'pagos' | 'transacciones' | 'aging';

export default function ComprasPagosDashboard({ initialKpis, initialCompras }: Props) {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>('pagos');

  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [formaPagoFilter, setFormaPagoFilter] = useState('');
  const [showPagados,   setShowPagados]   = useState(false);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const [selectedForPago,      setSelectedForPago]      = useState<ComprobanteCompra | null>(null);
  const [selectedForHistorial, setSelectedForHistorial] = useState<ComprobanteCompra | null>(null);

  const isDefaultQuery = page === 1 && pageSize === PAGINATION.DEFAULT_PAGE_SIZE
    && !debouncedSearch && !formaPagoFilter && !showPagados;

  const { data: result, isLoading, isFetching, isError } = useCompras(
    { page, pageSize, showPagados, search: debouncedSearch || undefined, formaPago: formaPagoFilter || undefined },
    isDefaultQuery ? initialCompras : undefined,
  );

  const handleSearchChange     = (v: string) => { setSearchTerm(v);      setPage(1); };
  const handleFormaPagoChange  = (v: string) => { setFormaPagoFilter(v); setPage(1); };
  const handleShowPagadosChange = (v: boolean) => { setShowPagados(v);   setPage(1); };

  const { data: kpis } = useKpisCompras(initialKpis);

  const compras    = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <iconify-icon icon="solar:lock-linear" class="text-5xl text-[#334155]"></iconify-icon>
        <p className="text-sm text-[#94A3B8]">Solo los administradores pueden acceder a cuentas por pagar.</p>
      </div>
    );
  }

  const today = formatLongDate(new Date());

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Cuentas por Pagar</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Al {today}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
          {kpis?.countPendientes ?? 0} pendiente{(kpis?.countPendientes ?? 0) !== 1 ? 's' : ''}
          {(kpis?.countParciales ?? 0) > 0 && (
            <>
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block ml-2"></span>
              {kpis!.countParciales} parcial{kpis!.countParciales !== 1 ? 'es' : ''}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#334155] mb-6 gap-1">
        {([['pagos', 'Pagos'], ['transacciones', 'Transacciones'], ['aging', 'x Antigüedad']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Pagos */}
      {tab === 'pagos' && (<>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Total por Pagar</p>
          <p className="text-xl font-bold text-yellow-400">{formatCurrency(kpis?.totalCxP ?? 0)}</p>
        </div>
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Pendientes</p>
          <p className="text-xl font-bold text-[#E2E8F0]">{kpis?.countPendientes ?? 0}</p>
        </div>
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Pagos Parciales</p>
          <p className="text-xl font-bold text-orange-400">{kpis?.countParciales ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative group">
          <select
            title="Filtrar por forma de pago"
            value={formaPagoFilter}
            onChange={(e) => handleFormaPagoChange(e.target.value)}
            className="appearance-none w-full sm:w-48 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
          >
            <option value="">Todas las formas</option>
            <option value="Contado">Contado</option>
            <option value="Credito">Crédito</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" class="text-lg"></iconify-icon>
          </div>
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:magnifer-linear" class="text-lg"></iconify-icon>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por serie o proveedor..."
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={showPagados}
            onChange={(e) => handleShowPagadosChange(e.target.checked)}
            className="w-4 h-4 rounded border-[#334155] bg-[#0F1115] text-[#3B82F6] focus:ring-[#3B82F6] focus:ring-offset-0 cursor-pointer"
          />
          Mostrar pagados
        </label>
      </div>

      {/* Table Container */}
      <div className={`bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1 transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Cargando cuentas por pagar...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">Error al cargar cuentas por pagar.</p>
          </div>
        )}

        {!isLoading && !isError && compras.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <iconify-icon icon="solar:wallet-check-linear" class="text-5xl text-[#10B981]/40"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">No hay cuentas pendientes de pago.</p>
          </div>
        )}

        {!isLoading && !isError && compras.length > 0 && (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {compras.map((c) => {
                const aging = getAgingInfo(c.fecha_vencimiento);
                return (
                  <div key={c.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#E2E8F0]">{c.serie_numero}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLES[c.estado_pago] ?? 'bg-[#334155] text-[#94A3B8]'}`}>
                        {ESTADO_LABELS[c.estado_pago] ?? c.estado_pago}
                      </span>
                    </div>
                    <p className="text-sm text-[#E2E8F0]">{getProveedorName(c)}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8]">
                        {c.fecha_vencimiento ? `Vence: ${formatDate(c.fecha_vencimiento)}` : 'Sin vencimiento'}
                      </span>
                      <span className={`font-medium ${aging.style}`}>{aging.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#94A3B8] uppercase">Saldo</p>
                        <p className="text-sm font-semibold text-yellow-400">{formatCurrency(c.saldo_pendiente)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#94A3B8] uppercase">Total</p>
                        <p className="text-sm text-[#94A3B8]">{formatCurrency(c.mto_imp_venta)}</p>
                        {c.detraccion_monto && c.detraccion_monto > 0 && (
                          <p className="text-[10px] text-orange-400">-{formatCurrency(c.detraccion_monto)} detr.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setSelectedForPago(c)}
                        className="flex-1 bg-[#10B981] text-white text-sm font-medium py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <iconify-icon icon="solar:wallet-money-linear" class="text-base"></iconify-icon>
                        Registrar Pago
                      </button>
                      <button
                        onClick={() => setSelectedForHistorial(c)}
                        className="flex-1 border border-[#334155] text-[#94A3B8] text-sm font-medium py-2 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors flex items-center justify-center gap-2"
                      >
                        <iconify-icon icon="solar:history-linear" class="text-base"></iconify-icon>
                        Historial
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0F1115]">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[140px]">Comprobante</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Proveedor</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px]">F. Vencimiento</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Saldo</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[85px]">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px] text-right">Antigüedad</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[170px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {compras.map((c) => {
                    const aging = getAgingInfo(c.fecha_vencimiento);
                    return (
                      <tr key={c.id} className="hover:bg-[#334155]/10 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">{c.serie_numero}</td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getProveedorName(c)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">
                          {c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8] text-right">
                          {formatCurrency(c.mto_imp_venta)}
                          {c.detraccion_monto && c.detraccion_monto > 0 && (
                            <span className="block text-[10px] text-orange-400">-{formatCurrency(c.detraccion_monto)} detr.</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-right text-yellow-400">{formatCurrency(c.saldo_pendiente)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-block ${ESTADO_STYLES[c.estado_pago] ?? 'bg-[#334155] text-[#94A3B8]'}`}>
                            {ESTADO_LABELS[c.estado_pago] ?? c.estado_pago}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-sm font-medium text-right ${aging.style}`}>
                          {aging.label}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedForPago(c)}
                              className="border border-[#10B981]/40 text-[#10B981] text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#10B981]/10 transition-colors whitespace-nowrap flex items-center gap-1.5"
                            >
                              <iconify-icon icon="solar:wallet-money-linear" class="text-base"></iconify-icon>
                              Pago
                            </button>
                            <button
                              onClick={() => setSelectedForHistorial(c)}
                              className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors whitespace-nowrap flex items-center gap-1.5"
                            >
                              <iconify-icon icon="solar:history-linear" class="text-base"></iconify-icon>
                              Historial
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

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

      </>)}

      {/* Tab: Transacciones */}
      {tab === 'transacciones' && <ListadoPagosEmitidos embedded />}

      {/* Tab: x Antigüedad */}
      {tab === 'aging' && <AgingReportCompras embedded />}

      <RegistrarPagoModal
        isOpen={Boolean(selectedForPago)}
        onClose={() => setSelectedForPago(null)}
        comprobanteCompraId={selectedForPago?.id ?? ''}
        saldoPendiente={selectedForPago?.saldo_pendiente ?? 0}
        monedaComprobante={selectedForPago?.moneda ?? 'PEN'}
        serieNumero={selectedForPago?.serie_numero ?? ''}
        onSuccess={() => setSelectedForPago(null)}
      />

      <HistorialPagosDrawer
        isOpen={Boolean(selectedForHistorial)}
        onClose={() => setSelectedForHistorial(null)}
        comprobanteCompraId={selectedForHistorial?.id ?? null}
        serieNumero={selectedForHistorial?.serie_numero ?? ''}
        montoTotal={selectedForHistorial?.mto_imp_venta ?? 0}
        saldoPendiente={selectedForHistorial?.saldo_pendiente ?? 0}
      />
    </div>
  );
}
