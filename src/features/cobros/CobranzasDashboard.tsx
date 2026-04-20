'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCuentasPorCobrar, useKpisCuentasPorCobrar } from '@/hooks/useCobros';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate as formatDateUtil, getClientDisplayName } from '@/utils/formatters';
import { PAGINATION } from '@/constants';
import Pagination from '@/components/ui/Pagination';
import RegistrarCobroModal from './RegistrarCobroModal';
import HistorialCobrosDrawer from './HistorialCobrosDrawer';
import type { CuentaPorCobrar } from '@/services/cobros.service';

const ESTADO_PAGO_STYLES: Record<string, string> = {
  Pendiente: 'bg-yellow-500/10 text-yellow-400',
  Parcial: 'bg-orange-500/10 text-orange-400',
  Pagado: 'bg-[#10B981]/10 text-[#10B981]',
};

type FormaPagoFilter = '' | 'Contado' | 'Credito';

export default function CobranzasDashboard() {
  const { role } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [formaPagoFilter, setFormaPagoFilter] = useState<FormaPagoFilter>('');
  const [showPagados, setShowPagados] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: result, isLoading, isFetching, isError } = useCuentasPorCobrar({
    page,
    pageSize,
    search: debouncedSearch,
    formaPago: formaPagoFilter || undefined,
    showPagados,
  });

  const cuentas = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const { data: kpis } = useKpisCuentasPorCobrar();

  // Modal/Drawer state
  const [selectedForPago, setSelectedForPago] = useState<CuentaPorCobrar | null>(null);
  const [selectedForHistorial, setSelectedForHistorial] = useState<CuentaPorCobrar | null>(null);

  const handleFormaPagoChange = (val: FormaPagoFilter) => { setFormaPagoFilter(val); setPage(1); };
  const handleShowPagadosChange = (val: boolean) => { setShowPagados(val); setPage(1); };
  const handleSearchChange = (val: string) => { setSearchTerm(val); setPage(1); };
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1); };

  const formatDate = (d: string) => formatDateUtil(new Date(d));

  const getClienteName = (c: CuentaPorCobrar) =>
    getClientDisplayName({
      razon_social: c.razon_social,
      nombres_contacto: c.nombres_contacto,
      apellidos_contacto: c.apellidos_contacto,
    }) || '—';

  // Role guard
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <iconify-icon icon="solar:lock-linear" class="text-5xl text-[#334155]"></iconify-icon>
        <p className="text-sm text-[#94A3B8]">Solo los administradores pueden acceder al módulo de cobranzas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Cobranzas</h1>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Por Cobrar (Pendientes)</p>
          <p className="text-xl font-bold text-yellow-400">{formatCurrency(kpis?.totalPendiente ?? 0)}</p>
        </div>
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Por Cobrar (Parciales)</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(kpis?.totalParcial ?? 0)}</p>
        </div>
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Total Cobrado</p>
          <p className="text-xl font-bold text-[#10B981]">{formatCurrency(kpis?.totalCobrado ?? 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative group">
          <select
            title="Filtrar por forma de pago"
            value={formaPagoFilter}
            onChange={(e) => handleFormaPagoChange(e.target.value as FormaPagoFilter)}
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
            placeholder="Buscar por serie o cliente..."
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
            Cargando cuentas por cobrar...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">Error al cargar cuentas por cobrar.</p>
          </div>
        )}

        {!isLoading && !isError && cuentas.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <iconify-icon icon="solar:wallet-check-linear" class="text-5xl text-[#10B981]/40"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">
              {totalItems === 0 && !debouncedSearch && !formaPagoFilter
                ? 'No hay comprobantes con saldo pendiente.'
                : 'No hay resultados con los filtros seleccionados.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && cuentas.length > 0 && (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {cuentas.map((c) => (
                <div key={c.comprobante_id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#E2E8F0]">{c.serie_numero}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_PAGO_STYLES[c.estado_pago] || ''}`}>
                      {c.estado_pago}
                    </span>
                  </div>
                  <p className="text-sm text-[#E2E8F0]">{getClienteName(c)}</p>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>{c.forma_pago}</span>
                    <span>{formatDate(c.fecha_emision)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#94A3B8] uppercase">Saldo</p>
                      <p className={`text-sm font-semibold ${c.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-[#10B981]'}`}>
                        {formatCurrency(c.saldo_pendiente)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#94A3B8] uppercase">Total</p>
                      <p className="text-sm text-[#E2E8F0]">{formatCurrency(c.monto_cobrable)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {c.saldo_pendiente > 0 && (
                      <button
                        onClick={() => setSelectedForPago(c)}
                        className="flex-1 bg-[#10B981] text-white text-sm font-medium py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <iconify-icon icon="solar:wallet-money-linear" class="text-base"></iconify-icon>
                        Registrar Pago
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedForHistorial(c)}
                      className="flex-1 border border-[#334155] text-[#94A3B8] text-sm font-medium py-2 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors flex items-center justify-center gap-2"
                    >
                      <iconify-icon icon="solar:history-linear" class="text-base"></iconify-icon>
                      Historial
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0F1115]">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[130px]">Comprobante</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px]">F. Pago</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Cobrable</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Saldo</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px]">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[170px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {cuentas.map((c) => (
                    <tr key={c.comprobante_id} className="hover:bg-[#334155]/10 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.tipo_doc_codigo === '01' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                            {c.tipo_doc_codigo === '01' ? 'F' : 'B'}
                          </span>
                          {c.serie_numero}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getClienteName(c)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{c.forma_pago}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8] text-right">{formatCurrency(c.total_facturado)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] text-right">
                        {formatCurrency(c.monto_cobrable)}
                        {c.detraccion_monto && c.detraccion_monto > 0 && (
                          <span className="block text-[10px] text-orange-400">-{formatCurrency(c.detraccion_monto)} detr.</span>
                        )}
                      </td>
                      <td className={`px-5 py-3.5 text-sm font-semibold text-right ${c.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-[#10B981]'}`}>
                        {formatCurrency(c.saldo_pendiente)}
                        {c.total_notas_credito > 0 && (
                          <span className="block text-[10px] text-red-400">-{formatCurrency(c.total_notas_credito)} NC</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-block ${ESTADO_PAGO_STYLES[c.estado_pago] || ''}`}>
                          {c.estado_pago}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.saldo_pendiente > 0 && (
                            <button
                              onClick={() => setSelectedForPago(c)}
                              className="border border-[#10B981]/40 text-[#10B981] text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#10B981]/10 transition-colors whitespace-nowrap flex items-center gap-1.5"
                            >
                              <iconify-icon icon="solar:wallet-money-linear" class="text-base"></iconify-icon>
                              Pago
                            </button>
                          )}
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
                  ))}
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
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Modals */}
      <RegistrarCobroModal
        isOpen={Boolean(selectedForPago)}
        onClose={() => setSelectedForPago(null)}
        comprobante={selectedForPago}
        onSuccess={() => setSelectedForPago(null)}
      />

      <HistorialCobrosDrawer
        isOpen={Boolean(selectedForHistorial)}
        onClose={() => setSelectedForHistorial(null)}
        comprobante={selectedForHistorial}
      />
    </div>
  );
}
