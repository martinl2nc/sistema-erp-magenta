'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuotesList, useUpdateQuoteStatus, useDeleteQuote, useUpdateQuoteFollowup } from '@/hooks/useQuotes';
import { useSellersList } from '@/hooks/useSellers';
import type { Quote, QuoteStatus } from '@/services/quotes.service';
import EmailHistoryModal from '@/features/quotes/EmailHistoryModal';

export default function QuotesList() {
  const router = useRouter();

  const { data: quotes = [], isLoading, isError, error } = useQuotesList();
  const { data: sellers = [] } = useSellersList();
  const updateStatusMutation = useUpdateQuoteStatus();
  const deleteMutation = useDeleteQuote();
  const updateFollowupMutation = useUpdateQuoteFollowup();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [historyQuote, setHistoryQuote] = useState<{ id: string; idStr: string } | null>(null);

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus as QuoteStatus });
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta cotización?');
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  const normalizeAccent = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    const search = normalizeAccent(searchTerm.trim());
    return quotes.filter(quote => {
      let matchSearch = true;
      if (search !== '') {
        const cliente = quote.clientes;
        const fields = [
          String(quote.numero_correlativo || ''),
          String(cliente?.razon_social || ''),
          String(cliente?.numero_documento || ''),
          String(cliente?.nombres_contacto || ''),
          String(cliente?.apellidos_contacto || ''),
        ];
        matchSearch = fields.some(f => normalizeAccent(f).includes(search));
      }
      const matchSeller = selectedSeller === '' || quote.perfiles_usuario?.nombre === selectedSeller;
      const matchStatus = selectedStatus === '' || quote.estado === selectedStatus;
      return matchSearch && matchSeller && matchStatus;
    });
  }, [quotes, searchTerm, selectedSeller, selectedStatus]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };

  const getClientName = (cliente: Quote['clientes']) => {
    if (!cliente) return 'Desconocido';
    if (cliente.razon_social?.trim()) return `${cliente.razon_social} (Doc: ${cliente.numero_documento || 'N/A'})`;
    const fullName = `${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`.trim();
    if (fullName) return `${fullName} (Doc: ${cliente.numero_documento || 'N/A'})`;
    return 'Sin Nombre';
  };

  const getSellerName = (vendedor: Quote['perfiles_usuario']) =>
    vendedor?.nombre || 'No asignado';

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Gestor de Cotizaciones</h1>
        <button
          onClick={() => router.push('/cotizaciones/nueva')}
          className="hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0F1115] flex gap-2 text-sm font-medium text-white bg-[#3B82F6] rounded-md pt-2 pr-4 pb-2 pl-4 shadow-sm items-center justify-center cursor-pointer"
        >
          <iconify-icon icon="solar:add-circle-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
          Crear Cotización
        </button>
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <select title="Filtrar por vendedor" value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)} className="appearance-none w-full sm:w-44 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer">
              <option value="">Por Vendedor</option>
              {sellers.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
          </div>
          <div className="relative group">
            <select title="Filtrar por estado" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="appearance-none w-full sm:w-44 bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-10 text-sm text-[#E2E8F0] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors cursor-pointer">
              <option value="">Por Estado</option>
              <option value="Borrador">Borrador</option>
              <option value="Enviada">Enviada</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
          </div>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por Correlativo, Doc o Nombre..." className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors" />
        </div>
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-lg md:overflow-hidden flex flex-col shadow-sm mb-6 md:flex-1">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Cargando cotizaciones...
          </div>
        )}
        {!isLoading && isError && (
          <div className="p-8 text-center text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        )}
        {!isLoading && !isError && filteredQuotes.length === 0 && (
          <div className="p-8 text-center text-[#94A3B8] text-sm">
            No se encontraron cotizaciones con los filtros aplicados.
          </div>
        )}

        {!isLoading && !isError && filteredQuotes.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#E2E8F0]">COT-{quote.numero_correlativo}</span>
                    <select value={quote.estado} onChange={(e) => handleStatusChange(quote.id, e.target.value)} className={`text-[10px] font-bold px-2 py-1 rounded-full border-none cursor-pointer ${quote.estado === 'Aprobada' || quote.estado === 'Enviada' ? 'bg-[#10B981]/10 text-[#10B981]' : quote.estado === 'Borrador' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                      <option value="Borrador" className="bg-[#181B21]">Borrador</option>
                      <option value="Aprobada" className="bg-[#181B21]">Aprobada</option>
                      <option value="Enviada" className="bg-[#181B21]">Enviada</option>
                      <option value="Cancelada" className="bg-[#181B21]">Cancelada</option>
                    </select>
                  </div>
                  <p className="text-sm text-[#E2E8F0]">{getClientName(quote.clientes)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]">{formatDate(quote.fecha_emision)}</span>
                    <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(quote.total_final)}</span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">Vendedor: {getSellerName(quote.perfiles_usuario)}</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#334155]">
                    {quote.estado === 'Enviada' && (
                      <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] cursor-pointer">
                        <input type="checkbox" checked={quote.seguimiento_automatico ?? true} onChange={() => updateFollowupMutation.mutate({ id: quote.id, value: !(quote.seguimiento_automatico ?? true) })} disabled={updateFollowupMutation.isPending} className="w-4 h-4 rounded accent-[#A855F7] cursor-pointer disabled:opacity-50" />
                        Seguim.
                      </label>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => setHistoryQuote({ id: quote.id, idStr: `COT-${quote.numero_correlativo}` })} className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors" title="Historial de envíos">
                        <iconify-icon icon="solar:history-2-linear" class="text-lg"></iconify-icon>
                      </button>
                      <button onClick={() => router.push(`/cotizaciones/editar/${quote.id}`)} className="border border-[#334155] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#334155]/50 transition-colors">Editar</button>
                      <button onClick={() => handleDelete(quote.id)} disabled={deleteMutation.isPending} className="border border-red-500/50 text-red-500 text-xs font-medium px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Eliminar">
                        <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon>
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
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[100px]">ID</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px]">Fecha</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[160px]">Vendedor</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[120px] text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[140px]">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[90px] text-center">Seguim.</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase w-[200px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="group hover:bg-[#334155]/10 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium">COT-{quote.numero_correlativo}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{formatDate(quote.fecha_emision)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0]">{getClientName(quote.clientes)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{getSellerName(quote.perfiles_usuario)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#E2E8F0] font-medium text-right">{formatCurrency(quote.total_final)}</td>
                      <td className="px-5 py-3.5 text-sm uppercase">
                        <select value={quote.estado} onChange={(e) => handleStatusChange(quote.id, e.target.value)} className={`text-[10px] font-bold px-2 py-1 rounded-full border-none cursor-pointer ${quote.estado === 'Aprobada' || quote.estado === 'Enviada' ? 'bg-[#10B981]/10 text-[#10B981]' : quote.estado === 'Borrador' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                          <option value="Borrador" className="bg-[#181B21]">Borrador</option>
                          <option value="Aprobada" className="bg-[#181B21]">Aprobada</option>
                          <option value="Enviada" className="bg-[#181B21]">Enviada</option>
                          <option value="Cancelada" className="bg-[#181B21]">Cancelada</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {quote.estado === 'Enviada' ? (
                          <input type="checkbox" checked={quote.seguimiento_automatico ?? true} onChange={() => updateFollowupMutation.mutate({ id: quote.id, value: !(quote.seguimiento_automatico ?? true) })} disabled={updateFollowupMutation.isPending} className="w-4 h-4 rounded accent-[#A855F7] cursor-pointer disabled:opacity-50" />
                        ) : (
                          <span className="text-[#334155]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                        <button onClick={() => setHistoryQuote({ id: quote.id, idStr: `COT-${quote.numero_correlativo}` })} className="border border-[#334155] text-[#94A3B8] text-xs font-medium px-2 py-1.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors" title="Historial de envíos">
                          <iconify-icon icon="solar:history-2-linear" class="text-lg"></iconify-icon>
                        </button>
                        <button onClick={() => router.push(`/cotizaciones/editar/${quote.id}`)} className="border border-[#334155] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#334155]/50 transition-colors whitespace-nowrap">Editar</button>
                        <button onClick={() => handleDelete(quote.id)} disabled={deleteMutation.isPending} className="border border-red-500/50 text-red-500 text-xs font-medium px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Eliminar">
                          <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <EmailHistoryModal
        isOpen={Boolean(historyQuote)}
        onClose={() => setHistoryQuote(null)}
        cotizacionId={historyQuote?.id ?? null}
        quoteIdStr={historyQuote?.idStr ?? ''}
      />
    </div>
  );
}
