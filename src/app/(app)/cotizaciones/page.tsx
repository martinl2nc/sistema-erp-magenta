'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  useQuotesList,
  useUpdateQuoteStatus,
  useDeleteQuote,
  useUpdateQuoteFollowup
} from '@/hooks/useQuotes'
import { useSellersActive } from '@/hooks/useSellers'
import { useDebounce } from '@/hooks/useDebounce'
import Pagination from '@/components/ui/Pagination'
import type { Quote, QuoteStatus } from '@/services/quotes.service'
import EmailHistoryModal from '@/features/quotes/EmailHistoryModal'
import GenerarPedidoModal from '@/features/pedidos/GenerarPedidoModal'
import {
  formatCurrency,
  formatDate as formatDateUtil,
  getClientDisplayName
} from '@/utils/formatters'
import { PAGINATION, TIMEOUTS } from '@/constants'

export default function QuotesList() {
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)
  const [historyQuote, setHistoryQuote] = useState<{
    id: string
    idStr: string
  } | null>(null)
  const [pedidoQuote, setPedidoQuote] = useState<Quote | null>(null)

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE)

  const {
    data: result,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuotesList({
    page,
    pageSize,
    search: debouncedSearch,
    vendedor_id: selectedSellerId || undefined,
    estado: selectedStatus || undefined
  })
  const quotes = result?.data ?? []
  const totalItems = result?.count ?? 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const { data: sellers = [] } = useSellersActive()
  const updateStatusMutation = useUpdateQuoteStatus()
  const deleteMutation = useDeleteQuote()
  const updateFollowupMutation = useUpdateQuoteFollowup()

  const handleFilterChange =
    (setter: (v: string) => void) => (value: string) => {
      setter(value)
      setPage(1)
    }

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus as QuoteStatus })
  }

  const getEstadoClass = (estado: string) => {
    if (estado === 'Enviada' || estado === 'Aprobada')
      return 'bg-[#10B981]/10 text-[#10B981]'
    if (estado === 'Cancelada') return 'bg-[#EF4444]/10 text-[#EF4444]'
    return 'bg-[#94A3B8]/10 text-[#94A3B8]'
  }

  const handleDelete = (id: string) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar esta cotización?'
    )
    if (!confirmed) return
    deleteMutation.mutate(id, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al eliminar la cotización'),
    })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return formatDateUtil(date)
  }

  const getClientName = (cliente: Quote['clientes']) => {
    if (!cliente) return 'Desconocido'
    const displayName = getClientDisplayName(cliente)
    return `${displayName} (Doc: ${cliente.numero_documento || 'N/A'})`
  }

  const getSellerName = (vendedor: Quote['perfiles_usuario']) =>
    vendedor?.nombre || 'No asignado'

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">
          Gestor de Cotizaciones
        </h1>
        <button
          onClick={() => router.push('/cotizaciones/nueva')}
          className="hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0F1115] flex gap-2 text-sm font-medium text-white bg-[#3B82F6] rounded-md pt-2 pr-4 pb-2 pl-4 shadow-sm items-center justify-center cursor-pointer"
        >
          <iconify-icon
            icon="solar:add-circle-linear"
            stroke-width="1.5"
            class="text-lg"
          ></iconify-icon>
          Crear Cotización
        </button>
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <select
              title="Filtrar por vendedor"
              value={selectedSellerId}
              onChange={(e) =>
                handleFilterChange(setSelectedSellerId)(e.target.value)
              }
              className="appearance-none w-full sm:w-44 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
            >
              <option value="">Por Vendedor</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon
                icon="solar:alt-arrow-down-linear"
                stroke-width="1.5"
                class="text-lg"
              ></iconify-icon>
            </div>
          </div>
          <div className="relative group">
            <select
              title="Filtrar por estado"
              value={selectedStatus}
              onChange={(e) =>
                handleFilterChange(setSelectedStatus)(e.target.value)
              }
              className="appearance-none w-full sm:w-44 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer"
            >
              <option value="">Por Estado</option>
              <option value="Borrador">Borrador</option>
              <option value="Enviada">Enviada</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon
                icon="solar:alt-arrow-down-linear"
                stroke-width="1.5"
                class="text-lg"
              ></iconify-icon>
            </div>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon
              icon="solar:magnifer-linear"
              stroke-width="1.5"
              class="text-lg"
            ></iconify-icon>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por Correlativo, Doc o Nombre..."
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
          />
        </div>
      </div>

      <div className={`bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1 transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
            <iconify-icon
              icon="solar:spinner-linear"
              class="animate-spin text-xl text-[#3B82F6]"
            ></iconify-icon>
            Cargando cotizaciones...
          </div>
        )}
        {!isLoading && isError && (
          <div className="p-8 text-center text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        )}
        {!isLoading && !isError && quotes.length === 0 && (
          <div className="p-8 text-center text-[#94A3B8] text-sm">
            No se encontraron cotizaciones con los filtros aplicados.
          </div>
        )}

        {!isLoading && !isError && quotes.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#E2E8F0]">
                      COT-{quote.numero_correlativo}
                    </span>
                    {quote.estado === 'Aprobada' ||
                    quote.estado === 'Enviada' ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${getEstadoClass(quote.estado)}`}
                      >
                        {quote.estado}
                      </span>
                    ) : (
                      <select
                        value={quote.estado}
                        onChange={(e) =>
                          handleStatusChange(quote.id, e.target.value)
                        }
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border-none cursor-pointer ${getEstadoClass(quote.estado)}`}
                      >
                        <option value="Borrador" className="bg-[#181B21]">
                          Borrador
                        </option>
                        <option value="Cancelada" className="bg-[#181B21]">
                          Cancelada
                        </option>
                      </select>
                    )}
                  </div>
                  <p className="text-sm text-[#E2E8F0]">
                    {getClientName(quote.clientes)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]">
                      {formatDate(quote.fecha_emision)}
                    </span>
                    <span className="text-sm font-semibold text-[#E2E8F0]">
                      {formatCurrency(quote.total_final)}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Vendedor: {getSellerName(quote.perfiles_usuario)}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#334155]">
                    {quote.estado === 'Enviada' && (
                      <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quote.seguimiento_automatico ?? true}
                          onChange={() =>
                            updateFollowupMutation.mutate({
                              id: quote.id,
                              value: !(quote.seguimiento_automatico ?? true)
                            })
                          }
                          disabled={updateFollowupMutation.isPending}
                          className="w-4 h-4 rounded accent-[#A855F7] cursor-pointer disabled:opacity-50"
                        />
                        Seguim.
                      </label>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {quote.estado === 'Enviada' && (
                        <button
                          onClick={() => setPedidoQuote(quote)}
                          className="border border-[#10B981]/40 text-[#10B981] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#10B981]/10 transition-colors"
                          title="Generar Pedido"
                        >
                          <iconify-icon
                            icon="solar:box-linear"
                            class="text-lg"
                          ></iconify-icon>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setHistoryQuote({
                            id: quote.id,
                            idStr: `COT-${quote.numero_correlativo}`
                          })
                        }
                        className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                        title="Historial de envíos"
                      >
                        <iconify-icon
                          icon="solar:history-2-linear"
                          class="text-lg"
                        ></iconify-icon>
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/cotizaciones/editar/${quote.id}`)
                        }
                        className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                        title="Editar cotización"
                      >
                        <iconify-icon
                          icon="solar:pen-linear"
                          class="text-lg"
                        ></iconify-icon>
                      </button>
                      <button
                        onClick={() => handleDelete(quote.id)}
                        disabled={deleteMutation.isPending}
                        className="border border-red-500/50 text-red-500 text-xs font-medium px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <iconify-icon
                          icon="solar:trash-bin-trash-linear"
                          class="text-lg"
                        ></iconify-icon>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0F1115]">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[100px]">
                      ID
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">
                      Fecha
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">
                      Cliente
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[160px]">
                      Vendedor
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px] text-right">
                      Total
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[140px]">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px] text-center">
                      Seguim.
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[200px] text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="group hover:bg-[#334155]/10 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">
                        COT-{quote.numero_correlativo}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">
                        {formatDate(quote.fecha_emision)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">
                        {getClientName(quote.clientes)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">
                        {getSellerName(quote.perfiles_usuario)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium text-right">
                        {formatCurrency(quote.total_final)}
                      </td>
                      <td className="px-5 py-3.5 text-sm uppercase">
                        {quote.estado === 'Aprobada' ||
                        quote.estado === 'Enviada' ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full ${getEstadoClass(quote.estado)}`}
                          >
                            {quote.estado}
                          </span>
                        ) : (
                          <select
                            value={quote.estado}
                            onChange={(e) =>
                              handleStatusChange(quote.id, e.target.value)
                            }
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border-none cursor-pointer ${getEstadoClass(quote.estado)}`}
                          >
                            <option value="Borrador" className="bg-[#181B21]">
                              Borrador
                            </option>
                            <option value="Cancelada" className="bg-[#181B21]">
                              Cancelada
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {quote.estado === 'Enviada' ? (
                          <input
                            type="checkbox"
                            checked={quote.seguimiento_automatico ?? true}
                            onChange={() =>
                              updateFollowupMutation.mutate({
                                id: quote.id,
                                value: !(quote.seguimiento_automatico ?? true)
                              })
                            }
                            disabled={updateFollowupMutation.isPending}
                            className="w-4 h-4 rounded accent-[#A855F7] cursor-pointer disabled:opacity-50"
                          />
                        ) : (
                          <span className="text-[#334155]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                        {quote.estado === 'Enviada' && (
                          <button
                            onClick={() => setPedidoQuote(quote)}
                            className="border border-[#10B981]/40 text-[#10B981] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#10B981]/10 transition-colors"
                            title="Generar Pedido"
                          >
                            <iconify-icon
                              icon="solar:box-linear"
                              class="text-lg"
                            ></iconify-icon>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setHistoryQuote({
                              id: quote.id,
                              idStr: `COT-${quote.numero_correlativo}`
                            })
                          }
                          className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                          title="Historial de envíos"
                        >
                          <iconify-icon
                            icon="solar:history-2-linear"
                            class="text-lg"
                          ></iconify-icon>
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/cotizaciones/editar/${quote.id}`)
                          }
                          className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors"
                          title="Editar cotización"
                        >
                          <iconify-icon
                            icon="solar:pen-linear"
                            class="text-lg"
                          ></iconify-icon>
                        </button>
                        <button
                          onClick={() => handleDelete(quote.id)}
                          disabled={deleteMutation.isPending}
                          className="border border-red-500/50 text-red-500 text-xs font-medium px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <iconify-icon
                            icon="solar:trash-bin-trash-linear"
                            class="text-lg"
                          ></iconify-icon>
                        </button>
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
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      <EmailHistoryModal
        isOpen={Boolean(historyQuote)}
        onClose={() => setHistoryQuote(null)}
        cotizacionId={historyQuote?.id ?? null}
        quoteIdStr={historyQuote?.idStr ?? ''}
      />
      <GenerarPedidoModal
        isOpen={Boolean(pedidoQuote)}
        onClose={() => setPedidoQuote(null)}
        quote={pedidoQuote}
      />
    </div>
  )
}
