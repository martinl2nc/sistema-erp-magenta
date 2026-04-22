'use client';

import { useState } from 'react';
import { useCompras } from '@/hooks/useCompras';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, getClientDisplayName } from '@/utils/formatters';
import { PAGINATION } from '@/constants';
import Pagination from '@/components/ui/Pagination';
import RegistrarCompraModal from './RegistrarCompraModal';
import RegistrarPagoModal from './RegistrarPagoModal';
import HistorialPagosDrawer from './HistorialPagosDrawer';
import type { ComprobanteCompra, PaginatedCompras } from '@/services/compras.service';

interface Props {
  initialCompras?: PaginatedCompras;
}

const ESTADO_STYLES: Record<string, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400',
  parcial:   'bg-orange-500/10 text-orange-400',
  pagado:    'bg-[#10B981]/10 text-[#10B981]',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial:   'Parcial',
  pagado:    'Pagado',
};

const TIPO_DOC_BADGE: Record<string, { label: string; style: string }> = {
  '01': { label: 'F',  style: 'bg-blue-500/15 text-blue-400' },
  '03': { label: 'B',  style: 'bg-purple-500/15 text-purple-400' },
  '02': { label: 'H',  style: 'bg-teal-500/15 text-teal-400' },
  '14': { label: 'S',  style: 'bg-slate-500/15 text-slate-400' },
};

type EstadoFilter = '' | 'pendiente' | 'parcial' | 'pagado';

function getProveedorName(c: ComprobanteCompra): string {
  if (!c.proveedores) return '—';
  return getClientDisplayName({
    razon_social:       c.proveedores.razon_social,
    nombres_contacto:   c.proveedores.nombres_contacto,
    apellidos_contacto: c.proveedores.apellidos_contacto,
  }) || '—';
}

export default function ComprasFacturacionDashboard({ initialCompras }: Props) {
  const { role } = useAuth();

  const [searchTerm,   setSearchTerm]   = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('');
  const [showPagados,  setShowPagados]  = useState(true);
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  const [isNuevaCompraOpen,    setIsNuevaCompraOpen]    = useState(false);
  const [selectedForPago,      setSelectedForPago]      = useState<ComprobanteCompra | null>(null);
  const [selectedForHistorial, setSelectedForHistorial] = useState<ComprobanteCompra | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const isDefaultQuery = page === 1 && pageSize === PAGINATION.DEFAULT_PAGE_SIZE && !debouncedSearch && !estadoFilter && showPagados;

  const { data: result, isLoading, isFetching, isError } = useCompras(
    { page, pageSize, search: debouncedSearch, estadoPago: estadoFilter || undefined, showPagados },
    isDefaultQuery ? initialCompras : undefined,
  );

  const compras    = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleEstadoChange    = (val: EstadoFilter) => { setEstadoFilter(val); setPage(1); };
  const handleSearchChange    = (val: string)        => { setSearchTerm(val);   setPage(1); };
  const handleShowPagados     = (val: boolean)       => { setShowPagados(val);  setPage(1); };
  const handlePageSizeChange  = (size: number)       => { setPageSize(size);    setPage(1); };

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <iconify-icon icon="solar:lock-linear" class="text-5xl text-[#334155]"></iconify-icon>
        <p className="text-sm text-[#94A3B8]">Solo los administradores pueden acceder al módulo de compras.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Facturación de Compras</h1>
        <button
          onClick={() => setIsNuevaCompraOpen(true)}
          className="flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <iconify-icon icon="solar:add-circle-linear" class="text-base"></iconify-icon>
          Nueva Compra
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative">
          <select
            title="Filtrar por estado de pago"
            value={estadoFilter}
            onChange={(e) => handleEstadoChange(e.target.value as EstadoFilter)}
            className="appearance-none w-full sm:w-48 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
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
            placeholder="Buscar por comprobante..."
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={showPagados}
            onChange={(e) => handleShowPagados(e.target.checked)}
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
            Cargando comprobantes...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">Error al cargar comprobantes de compra.</p>
          </div>
        )}

        {!isLoading && !isError && compras.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <iconify-icon icon="solar:bill-list-linear" class="text-5xl text-[#334155]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">
              {!debouncedSearch && !estadoFilter
                ? 'No hay comprobantes registrados.'
                : 'No hay resultados con los filtros seleccionados.'}
            </p>
            {!debouncedSearch && !estadoFilter && (
              <button
                onClick={() => setIsNuevaCompraOpen(true)}
                className="mt-2 text-sm text-[#3B82F6] hover:text-blue-400 transition-colors"
              >
                Registrar primera compra
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && compras.length > 0 && (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {compras.map((c) => {
                const tipoBadge = TIPO_DOC_BADGE[c.tipo_doc_codigo] ?? { label: c.tipo_doc_codigo, style: 'bg-slate-500/15 text-slate-400' };
                return (
                  <div key={c.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tipoBadge.style}`}>{tipoBadge.label}</span>
                        <span className="text-sm font-semibold text-[#E2E8F0]">{c.serie_numero}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLES[c.estado_pago] ?? ''}`}>
                        {ESTADO_LABELS[c.estado_pago] ?? c.estado_pago}
                      </span>
                    </div>
                    <p className="text-sm text-[#E2E8F0]">{getProveedorName(c)}</p>
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>{c.cat_categorias_gasto?.nombre ?? '—'}</span>
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
                        <p className="text-sm text-[#E2E8F0]">{formatCurrency(c.mto_imp_venta)}</p>
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
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0F1115]">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[140px]">Comprobante</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Proveedor</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Categoría</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[100px]">F. Emisión</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px] text-right">Saldo</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px]">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[170px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {compras.map((c) => {
                    const tipoBadge = TIPO_DOC_BADGE[c.tipo_doc_codigo] ?? { label: c.tipo_doc_codigo, style: 'bg-slate-500/15 text-slate-400' };
                    return (
                      <tr key={c.id} className="hover:bg-[#334155]/10 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tipoBadge.style}`}>{tipoBadge.label}</span>
                            {c.serie_numero}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getProveedorName(c)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8] truncate max-w-[120px]">
                          {c.cat_categorias_gasto?.nombre ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{formatDate(c.fecha_emision)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8] text-right">{formatCurrency(c.mto_imp_venta)}</td>
                        <td className={`px-5 py-3.5 text-sm font-semibold text-right ${c.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-[#10B981]'}`}>
                          {formatCurrency(c.saldo_pendiente)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-block ${ESTADO_STYLES[c.estado_pago] ?? ''}`}>
                            {ESTADO_LABELS[c.estado_pago] ?? c.estado_pago}
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
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      <RegistrarCompraModal
        isOpen={isNuevaCompraOpen}
        onClose={() => setIsNuevaCompraOpen(false)}
        onSuccess={() => setIsNuevaCompraOpen(false)}
      />

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
