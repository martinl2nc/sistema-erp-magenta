'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePedidosList } from '@/hooks/usePedidos';
import { useFacturasList, useEnviarASunat } from '@/hooks/useFacturas';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/Pagination';
import { useTiposDocumento } from '@/hooks/useCatalogos';
import { useAuth } from '@/context/AuthContext';
import EmitirComprobanteModal from '@/features/facturacion/EmitirComprobanteModal';
import NotaCreditoModal from '@/features/facturacion/NotaCreditoModal';
import type { Pedido } from '@/services/pedidos.service';
import type { Comprobante } from '@/services/facturas.service';
import { formatCurrency, formatDate as formatDateUtil, getClientDisplayName } from '@/utils/formatters';
import { PAGINATION, TIMEOUTS } from '@/constants';

type Tab = 'pendientes' | 'emitidas';

const ESTADO_STYLES: Record<string, string> = {
  pendiente_facturacion: 'bg-yellow-500/10 text-yellow-400',
  procesando_facturacion: 'bg-blue-500/10 text-blue-400',
  facturado: 'bg-[#10B981]/10 text-[#10B981]',
  error_facturacion: 'bg-red-500/10 text-red-400',
  anulado: 'bg-[#94A3B8]/10 text-[#94A3B8]',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente_facturacion: 'Pendiente',
  procesando_facturacion: 'Procesando',
  facturado: 'Facturado',
  error_facturacion: 'Error',
  anulado: 'Anulado',
};

// TIPO_DOC_LABELS se construye dinámicamente desde cat_tipo_documento

export default function FacturacionPage() {
  const router = useRouter();
  const { role } = useAuth();
  const { mutateAsync: enviarASunat } = useEnviarASunat();
  const { data: tiposDoc = [] } = useTiposDocumento();

  // Mapa dinámico: '01' → 'Factura', '03' → 'Boleta de Venta', etc.
  const tipoDocLabels = useMemo(
    () => Object.fromEntries(tiposDoc.map((t) => [t.codigo, t.descripcion])),
    [tiposDoc]
  );

  const [tab, setTab] = useState<Tab>('pendientes');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);

  // Filtros y paginación tab pendientes
  const [searchPendientes, setSearchPendientes] = useState('');
  const [filterEstadoPendiente, setFilterEstadoPendiente] = useState('');
  const [pagePendientes, setPagePendientes] = useState(1);
  const [pageSizePendientes, setPageSizePendientes] = useState(PAGINATION.DEFAULT_PAGE_SIZE);

  // Filtros y paginación tab emitidas
  const [searchEmitidas, setSearchEmitidas] = useState('');
  const [filterTipoDoc, setFilterTipoDoc] = useState('');
  const [pageEmitidas, setPageEmitidas] = useState(1);
  const [pageSizeEmitidas, setPageSizeEmitidas] = useState(PAGINATION.DEFAULT_PAGE_SIZE);

  const debouncedSearchEmitidas = useDebounce(searchEmitidas, TIMEOUTS.SEARCH_DEBOUNCE);

  // Pendientes: carga sin paginación (siempre son pocos — cola de trabajo activa)
  const { data: pedidosResult = { data: [], count: 0 }, isLoading: loadingPedidos, isError: errorPedidos } = usePedidosList({
    pageSize: 200,
  });
  const pedidos = pedidosResult.data;

  // Emitidas: paginación server-side (crece indefinidamente)
  const { data: comprobantesResult, isLoading: loadingComprobantes, isError: errorComprobantes } = useFacturasList({
    page: pageEmitidas,
    pageSize: pageSizeEmitidas,
    search: debouncedSearchEmitidas,
    tipo_doc: filterTipoDoc || undefined,
  });
  const comprobantes = comprobantesResult?.data ?? [];
  const totalEmitidas = comprobantesResult?.count ?? 0;
  const totalPagesEmitidas = Math.ceil(totalEmitidas / pageSizeEmitidas);

  const pendientesBase = useMemo(
    () => pedidos.filter((p) => ['pendiente_facturacion', 'error_facturacion'].includes(p.estado)),
    [pedidos]
  );

  const procesando = useMemo(
    () => pedidos.filter((p) => ['procesando_facturacion'].includes(p.estado)),
    [pedidos]
  );

  const pendientesFiltered = useMemo(() => {
    let list = pendientesBase;
    if (filterEstadoPendiente) list = list.filter((p) => p.estado === filterEstadoPendiente);
    const search = searchPendientes.trim().toLowerCase();
    if (search) {
      list = list.filter((p) => {
        const c = p.clientes;
        return [
          String(p.numero_pedido || ''),
          c?.razon_social || '',
          c?.nombres_contacto || '',
          c?.apellidos_contacto || '',
          c?.numero_documento || '',
          p.nro_oc_cliente || '',
        ].some((f) => f.toLowerCase().includes(search));
      });
    }
    return list;
  }, [pendientesBase, filterEstadoPendiente, searchPendientes]);

  const totalPendientes = pendientesFiltered.length;
  const totalPagesPendientes = Math.ceil(totalPendientes / pageSizePendientes);
  const pendientes = useMemo(() => {
    const from = (pagePendientes - 1) * pageSizePendientes;
    return pendientesFiltered.slice(from, from + pageSizePendientes);
  }, [pendientesFiltered, pagePendientes, pageSizePendientes]);

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <iconify-icon icon="solar:lock-linear" class="text-5xl text-[#334155]"></iconify-icon>
        <p className="text-sm text-[#94A3B8]">Solo los administradores pueden acceder al módulo de facturación.</p>
      </div>
    );
  }

  const formatDate = (d: string) => formatDateUtil(new Date(d));

  const getClienteNamePedido = (p: Pedido) => {
    const c = p.clientes;
    if (!c) return '—';
    return getClientDisplayName(c) || '—';
  };

  const getClienteNameComprobante = (f: Comprobante) => {
    if (!f.clientes) return '—';
    return getClientDisplayName(f.clientes) || '—';
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Facturación</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
            {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
            {procesando.length > 0 && (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block ml-2"></span>
                {procesando.length} procesando
              </>
            )}
          </div>
          {role === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/facturacion/externa')}
                className="bg-[#334155] hover:bg-[#475569] text-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#334155] focus:ring-offset-2 focus:ring-offset-[#0F1115] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <iconify-icon icon="solar:upload-linear" class="text-lg"></iconify-icon>
                Registrar Externa
              </button>
              <button
                onClick={() => router.push('/facturacion/nueva')}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0F1115] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <iconify-icon icon="solar:add-circle-linear" class="text-lg"></iconify-icon>
                Crear Factura
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#334155] mb-6 gap-1">
        {([['pendientes', 'Bandeja de Facturación'], ['emitidas', 'Comprobantes Emitidos']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            {label}
            {key === 'pendientes' && totalPendientes > 0 && (
              <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {totalPendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Pendientes */}
      {tab === 'pendientes' && (
        <>
          <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 shadow-sm flex flex-col lg:flex-row gap-4">
            <div className="relative group">
              <select
                title="Filtrar por estado"
                value={filterEstadoPendiente}
                onChange={(e) => { setFilterEstadoPendiente(e.target.value); setPagePendientes(1); }}
                className="appearance-none w-full sm:w-52 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente_facturacion">Pendiente</option>
                <option value="error_facturacion">Con error</option>
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
                value={searchPendientes}
                onChange={(e) => { setSearchPendientes(e.target.value); setPagePendientes(1); }}
                placeholder="Buscar por pedido, cliente u OC..."
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
              />
            </div>
          </div>
          <div className="bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1">
          {loadingPedidos && (
            <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
              <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
              Cargando...
            </div>
          )}

          {errorPedidos && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">Error al cargar los pedidos pendientes.</p>
            </div>
          )}

          {!loadingPedidos && !errorPedidos && totalPendientes === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <iconify-icon icon="solar:check-circle-linear" class="text-5xl text-[#10B981]/40"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">No hay pedidos pendientes de facturación.</p>
            </div>
          )}

          {!loadingPedidos && !errorPedidos && totalPendientes > 0 && (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {pendientes.map((p) => (
                  <div key={p.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#E2E8F0]">PED-{p.numero_pedido}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLES[p.estado]}`}>
                        {ESTADO_LABELS[p.estado]}
                      </span>
                    </div>
                    <p className="text-sm text-[#E2E8F0]">{getClienteNamePedido(p)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94A3B8]">{formatDate(p.fecha_creacion)}</span>
                      <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(p.total_final ?? 0)}</span>
                    </div>
                    <button
                      onClick={() => setSelectedPedido(p)}
                      className="w-full bg-[#10B981] text-white text-sm font-medium py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <iconify-icon icon="solar:bill-list-linear" class="text-base"></iconify-icon>
                      Emitir Comprobante
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#334155] bg-[#0F1115]">
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px]">Pedido</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px]">OC</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Fecha Pedido</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px] text-right">Total</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Estado</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[160px] text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                    {pendientes.map((p) => (
                      <tr key={p.id} className="hover:bg-[#334155]/10 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">PED-{p.numero_pedido}</td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">
                          <div>
                            <p>{getClienteNamePedido(p)}</p>
                            {p.clientes?.numero_documento && (
                              <p className="text-xs text-[#94A3B8]">{p.clientes.tipo_documento?.toUpperCase()}: {p.clientes.numero_documento}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{p.nro_oc_cliente || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{formatDate(p.fecha_creacion)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium text-right">{formatCurrency(p.total_final ?? 0)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-block w-fit ${ESTADO_STYLES[p.estado]}`}>
                            {ESTADO_LABELS[p.estado]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedPedido(p)}
                            className="border border-[#10B981]/40 text-[#10B981] text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#10B981]/10 transition-colors whitespace-nowrap flex items-center gap-1.5 ml-auto"
                          >
                            <iconify-icon icon="solar:bill-list-linear" class="text-base"></iconify-icon>
                            Emitir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!loadingPedidos && !errorPedidos && (
            <Pagination
              currentPage={pagePendientes}
              totalPages={totalPagesPendientes}
              totalItems={totalPendientes}
              pageSize={pageSizePendientes}
              onPageChange={setPagePendientes}
              onPageSizeChange={(size) => { setPageSizePendientes(size); setPagePendientes(1); }}
            />
          )}
        </div>
        </>
      )}

      {/* Tab: Emitidas */}
      {tab === 'emitidas' && (
        <>
          <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 shadow-sm flex flex-col lg:flex-row gap-4">
            <div className="relative group">
              <select
                title="Filtrar por tipo de comprobante"
                value={filterTipoDoc}
                onChange={(e) => { setFilterTipoDoc(e.target.value); setPageEmitidas(1); }}
                className="appearance-none w-full sm:w-52 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
              >
                <option value="">Todos los tipos</option>
                {tiposDoc.map((t) => (
                  <option key={t.codigo} value={t.codigo}>{t.descripcion}</option>
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
                value={searchEmitidas}
                onChange={(e) => { setSearchEmitidas(e.target.value); setPageEmitidas(1); }}
                placeholder="Buscar por serie, cliente o documento..."
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
              />
            </div>
          </div>
          <div className="bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1">
          {loadingComprobantes && (
            <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
              <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
              Cargando comprobantes...
            </div>
          )}

          {errorComprobantes && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">Error al cargar los comprobantes.</p>
            </div>
          )}

          {!loadingComprobantes && !errorComprobantes && comprobantes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <iconify-icon icon="solar:bill-list-linear" class="text-5xl text-[#334155]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">{comprobantes.length === 0 ? 'No hay comprobantes emitidos aún.' : 'No hay comprobantes que coincidan con los filtros.'}</p>
            </div>
          )}

          {!loadingComprobantes && !errorComprobantes && comprobantes.length > 0 && (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {comprobantes.map((f) => (
                  <div key={f.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#E2E8F0]">{f.serie_numero}</span>
                        {f.origen_emision === 'sol' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">SOL</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${f.estado_sunat === 'anulada' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' : 'bg-[#10B981]/10 text-[#10B981]'}`}>
                        {f.estado_sunat}
                      </span>
                    </div>
                    <p className="text-sm text-[#E2E8F0]">{getClienteNameComprobante(f)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94A3B8]">{formatDate(f.fecha_emision)}</span>
                      <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(f.mto_imp_venta)}</span>
                    </div>
                    <div className="flex gap-2 pt-1 items-center">
                      {f.enlace_pdf && (
                        <a href={f.enlace_pdf} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-blue-400">
                          <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                          PDF
                        </a>
                      )}
                      {f.enlace_xml && (
                        <a href={f.enlace_xml} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#E2E8F0]">
                          <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                          XML
                        </a>
                      )}
                      {f.enlace_cdr && (
                        <a href={f.enlace_cdr} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#E2E8F0]">
                          <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                          CDR
                        </a>
                      )}
                      {['borrador', 'aceptada_sunat', 'rechazada_sunat', 'emitida'].includes(f.estado_sunat) && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await enviarASunat(f.id);
                              if (res.success) {
                                toast.success(`Comprobante ${f.serie_numero} procesado con éxito`);
                              } else {
                                toast.error(res.error || 'Error al procesar comprobante');
                              }
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Error al procesar comprobante');
                            }
                          }}
                          className="flex items-center justify-center p-1.5 rounded-lg bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 transition-colors"
                          title="Reparar / Re-enviar"
                        >
                          <iconify-icon icon="solar:restart-linear" class="text-lg"></iconify-icon>
                        </button>
                      )}
                      {f.origen_emision === 'sol' && (
                        <button
                          onClick={() => router.push(`/facturacion/externa/${f.id}/editar`)}
                          className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                          title="Editar comprobante externo"
                        >
                          <iconify-icon icon="solar:pen-linear" class="text-base"></iconify-icon>
                        </button>
                      )}
                      {f.estado_sunat !== 'anulada' && f.tipo_doc_codigo !== '07' && (
                        <button onClick={() => setSelectedComprobante(f)}
                          className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                          <iconify-icon icon="solar:document-add-linear" class="text-base"></iconify-icon>
                          Nota Crédito
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-[#334155] bg-[#0F1115]">
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[110px]">Serie-Nro.</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[80px]">Tipo</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Fecha</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px] text-right">Total</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[100px]">Estado</th>
                      <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[180px] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                    {comprobantes.map((f) => (
                      <tr key={f.id} className="hover:bg-[#334155]/10 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">
                          <div className="flex items-center gap-2">
                            {f.serie_numero}
                            {f.origen_emision === 'sol' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">SOL</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{tipoDocLabels[f.tipo_doc_codigo] || f.tipo_doc_codigo}</td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getClienteNameComprobante(f)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{formatDate(f.fecha_emision)}</td>
                        <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium text-right">{formatCurrency(f.mto_imp_venta)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${f.estado_sunat === 'anulada' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' : 'bg-[#10B981]/10 text-[#10B981]'}`}>
                            {f.estado_sunat}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {f.enlace_pdf && (
                              <a href={f.enlace_pdf} target="_blank" rel="noreferrer"
                                className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                                title="Descargar PDF">
                                <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                              </a>
                            )}
                            {f.enlace_xml && (
                              <a href={f.enlace_xml} target="_blank" rel="noreferrer"
                                className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                                title="Descargar XML">
                                XML
                              </a>
                            )}
                            {f.enlace_cdr && (
                              <a href={f.enlace_cdr} target="_blank" rel="noreferrer"
                                className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                                title="Descargar CDR (SUNAT)">
                                CDR
                              </a>
                            )}
                            {['borrador', 'aceptada_sunat', 'rechazada_sunat', 'emitida'].includes(f.estado_sunat) && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await enviarASunat(f.id);
                                    if (res.success) {
                                      toast.success(`Comprobante ${f.serie_numero} procesado con éxito`);
                                    } else {
                                      toast.error(res.error || 'Error al procesar comprobante');
                                    }
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : 'Error al procesar comprobante');
                                  }
                                }}
                                className="flex items-center justify-center p-1.5 rounded-lg bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 transition-colors"
                                title="Reparar / Re-enviar"
                              >
                                <iconify-icon icon="solar:restart-linear" class="text-sm"></iconify-icon>
                              </button>
                            )}
                            {f.origen_emision === 'sol' && (
                              <button
                                onClick={() => router.push(`/facturacion/externa/${f.id}/editar`)}
                                className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors flex items-center"
                                title="Editar comprobante externo"
                              >
                                <iconify-icon icon="solar:pen-linear" class="text-xs"></iconify-icon>
                              </button>
                            )}
                            {f.estado_sunat !== 'anulada' && f.tipo_doc_codigo !== '07' && (
                              <button
                                onClick={() => setSelectedComprobante(f)}
                                className="border border-red-500/30 text-red-400 text-xs font-medium px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                                title="Emitir nota de crédito"
                              >
                                <iconify-icon icon="solar:document-add-linear" class="text-base"></iconify-icon>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!loadingComprobantes && !errorComprobantes && totalPagesEmitidas > 0 && (
            <Pagination
              currentPage={pageEmitidas}
              totalPages={totalPagesEmitidas}
              totalItems={totalEmitidas}
              pageSize={pageSizeEmitidas}
              onPageChange={setPageEmitidas}
              onPageSizeChange={(size) => { setPageSizeEmitidas(size); setPageEmitidas(1); }}
            />
          )}
        </div>
        </>
      )}

      <EmitirComprobanteModal
        isOpen={Boolean(selectedPedido)}
        onClose={() => setSelectedPedido(null)}
        pedido={selectedPedido}
      />
      <NotaCreditoModal
        isOpen={Boolean(selectedComprobante)}
        onClose={() => setSelectedComprobante(null)}
        factura={selectedComprobante}
      />
    </div>
  );
}
