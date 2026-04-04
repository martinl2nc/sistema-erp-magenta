'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';

import { useSaveQuote, useDeleteQuote, useSendQuoteWebhook } from '@/hooks/useQuotes';
import { useLogEmailSend } from '@/hooks/useEmailHistory';
import { clientsKeys } from '@/hooks/useClients';

import ClientFormModal from '@/features/clients/ClientFormModal';
import QuotePDFPreviewModal from './QuotePDFPreviewModal';
import type { Client } from '@/services/clients.service';
import type { Product } from '@/services/products.service';
import type { Seller } from '@/services/sellers.service';
import type { CompanyConfig } from '@/services/companyConfig.service';
import type { Quote, QuoteFormData, QuoteStatus } from '@/services/quotes.service';
import { isWebhookConfigured, buildWebhookPayload } from '@/services/webhook.service';
import { useQuoteFormState } from './useQuoteFormState';
import { formatCurrency, getClientDisplayName, validateQuoteForm, blobToBase64, downloadBlob } from './quoteForm.utils';
import { QuotePDFDocument } from './QuotePDFTemplate';

interface QuoteFormProps {
  id?: string;
  initialQuote?: Quote;
  initialAllClients: Client[];
  initialActiveClients: Client[];
  initialProducts: Product[];
  initialSellers: Seller[];
  companyConfig: CompanyConfig | null;
}

export default function QuoteForm({
  id,
  initialQuote,
  initialAllClients,
  initialActiveClients,
  initialProducts,
  initialSellers,
  companyConfig,
}: QuoteFormProps) {
  const router = useRouter();
  const isEditing = Boolean(id);

  // Catalog data now comes from server-side props
  const allClients = initialAllClients;
  const activeClients = initialActiveClients;
  const sellers = initialSellers;
  const products = initialProducts;
  const existingQuote = initialQuote;

  // Only mutation hooks remain client-side
  const saveQuoteMutation = useSaveQuote();
  const deleteQuoteMutation = useDeleteQuote();
  const webhookMutation = useSendQuoteWebhook();
  const logEmailSendMutation = useLogEmailSend();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfQuoteIdStr, setPdfQuoteIdStr] = useState('');
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [showMobileTotals, setShowMobileTotals] = useState(false);

  const {
    quoteData,
    lineItems,
    totals,
    selectableClients,
    isVendorLocked,
    handleQuoteChange,
    addLineItem,
    removeLineItem,
    updateLineItem,
  } = useQuoteFormState({
    isEditing,
    existingQuote,
    activeClients,
    allClients,
    products,
  });

  const currentDisplayId = isEditing && existingQuote?.numero_correlativo
    ? `Editando COT-${existingQuote.numero_correlativo}`
    : 'Nueva Cotización';

  const handleClientCreated = (newClient: Client) => {
    queryClient.invalidateQueries({ queryKey: clientsKeys.all() });
    handleQuoteChange('cliente_id', String(newClient.id));
  };

  const handleSave = (status: QuoteStatus, skipNavigation = false) => {
    const validationError = validateQuoteForm(quoteData, lineItems);
    if (validationError) { setError(validationError); return; }

    setError(null);
    const finalQuoteData: QuoteFormData = {
      ...quoteData,
      estado: status,
      vendedor_id: quoteData.vendedor_id || null,
      subtotal: totals.subtotal,
      igv_monto: totals.igv_monto,
      total_final: totals.total_final,
      lineas: lineItems,
    };

    saveQuoteMutation.mutate(finalQuoteData, {
      onSuccess: () => {
        if (!skipNavigation) router.push('/cotizaciones');
      },
      onError: (err) => toast.error('Error al guardar cotización: ' + err.message),
    });
  };

  const handleOpenPreview = async () => {
    const validationError = validateQuoteForm(quoteData, lineItems);
    if (validationError) { setError(validationError); return; }

    setIsPreviewLoading(true);
    setError(null);
    webhookMutation.reset();

    try {
      const client = allClients.find(c => c.id === quoteData.cliente_id) || null;
      const seller = sellers.find(s => s.id === quoteData.vendedor_id);

      const finalQuoteData: QuoteFormData = {
        ...quoteData,
        id: savedQuoteId || quoteData.id,
        estado: quoteData.estado,
        vendedor_id: quoteData.vendedor_id || null,
        subtotal: totals.subtotal,
        igv_monto: totals.igv_monto,
        total_final: totals.total_final,
        lineas: lineItems,
      };

      const savedQuote = await saveQuoteMutation.mutateAsync(finalQuoteData);
      const quoteIdStr = `COT-${savedQuote.numero_correlativo}`;

      const doc = (
        <QuotePDFDocument
          quoteData={{ ...quoteData, id: savedQuote.id }}
          totals={totals}
          lineItems={lineItems}
          client={client}
          sellerName={seller?.nombre || ''}
          quoteIdStr={quoteIdStr}
          companyConfig={companyConfig}
          products={products}
        />
      );
      const blob = await pdf(doc).toBlob();
      const blobUrl = URL.createObjectURL(blob);

      setSavedQuoteId(savedQuote.id);
      setPdfBlob(blob);
      setPdfBlobUrl(blobUrl);
      setPdfQuoteIdStr(quoteIdStr);
      setIsPDFModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error al generar la vista previa.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreviewModal = () => {
    setIsPDFModalOpen(false);
    if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
    setPdfBlob(null);
  };

  const handleDownloadFromModal = () => {
    if (pdfBlob && pdfQuoteIdStr) downloadBlob(pdfBlob, `${pdfQuoteIdStr}.pdf`);
  };

  const handleSendFromModal = async () => {
    if (!pdfBlob || !pdfQuoteIdStr) return;
    setIsSending(true);

    try {
      const client = allClients.find(c => c.id === quoteData.cliente_id) || null;
      const seller = sellers.find(s => s.id === quoteData.vendedor_id);

      const finalQuoteData: QuoteFormData = {
        ...quoteData,
        id: savedQuoteId || quoteData.id,
        estado: 'Enviada',
        vendedor_id: quoteData.vendedor_id || null,
        subtotal: totals.subtotal,
        igv_monto: totals.igv_monto,
        total_final: totals.total_final,
        lineas: lineItems,
      };

      await saveQuoteMutation.mutateAsync(finalQuoteData);

      if (isWebhookConfigured() && client?.email) {
        const pdfBase64 = await blobToBase64(pdfBlob);
        const payload = buildWebhookPayload({
          pdfBase64,
          pdfFilename: `${pdfQuoteIdStr}.pdf`,
          client,
          sellerName: seller?.nombre || 'No asignado',
          quoteIdStr: pdfQuoteIdStr,
          totalFinal: totals.total_final,
          fechaEmision: quoteData.fecha_emision,
        });
        if (payload) {
          try {
            await webhookMutation.mutateAsync(payload);
            toast.success(`Cotización ${pdfQuoteIdStr} enviada al cliente`);
            const cotizacionId = savedQuoteId || quoteData.id;
            if (cotizacionId) logEmailSendMutation.mutate({ cotizacionId, email: client.email! });
          } catch {
            toast.warning(`Cotización ${pdfQuoteIdStr} guardada — error al enviar el correo`);
          }
        } else {
          toast.success(`Cotización ${pdfQuoteIdStr} guardada como Enviada`);
        }
      } else {
        toast.success(`Cotización ${pdfQuoteIdStr} guardada como Enviada`);
      }

      handleClosePreviewModal();
      router.push('/cotizaciones');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error al enviar la cotización.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta cotización? Esta acción eliminará también todos sus ítems de forma irreversible.');
    if (!confirmed) return;

    deleteQuoteMutation.mutate(id, {
      onSuccess: () => router.push('/cotizaciones'),
      onError: (err) => toast.error('Error al eliminar: ' + err.message),
    });
  };

  const isSaving = saveQuoteMutation.isPending || deleteQuoteMutation.isPending || isPreviewLoading;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      {/* Top Header */}
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Inicio</span>
          <span className="text-[#334155]">/</span>
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/cotizaciones')}>Cotizaciones</span>
          <span className="text-[#334155]">/</span>
          <span className="text-[#E2E8F0] font-medium">{currentDisplayId}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">{currentDisplayId}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
            ${quoteData.estado === 'Aprobada' || quoteData.estado === 'Enviada' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
              quoteData.estado === 'Borrador' ? 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20' :
              quoteData.estado === 'Cancelada' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' :
            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
            {quoteData.estado}
          </span>
        </div>

        {/* Master Data */}
        <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#94A3B8]">Cliente Registrado <span className="text-red-400">*</span></label>
                  <button type="button" onClick={() => setIsClientModalOpen(true)} className="text-xs font-medium text-[#3B82F6] hover:text-[#60A5FA] px-2 py-0.5 rounded hover:bg-[#3B82F6]/10 transition-colors focus:outline-none flex items-center gap-1">
                    <iconify-icon icon="solar:add-circle-linear" class="text-sm"></iconify-icon>
                    Nuevo
                  </button>
                </div>
                <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={quoteData.cliente_id} onChange={(e) => handleQuoteChange('cliente_id', e.target.value)}>
                  <option value="">Seleccionar Cliente...</option>
                  {selectableClients.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Vendedor Asignado</label>
                {isVendorLocked ? (
                  <div className="w-full bg-[#0F1115]/60 border border-[#334155]/60 rounded-lg px-3 py-2.5 text-sm text-[#94A3B8] cursor-not-allowed flex items-center gap-2">
                    <iconify-icon icon="solar:lock-linear" class="text-base shrink-0"></iconify-icon>
                    <span className="text-[#E2E8F0]">
                      {sellers.find(s => s.id === quoteData.vendedor_id)?.nombre || '—'}
                    </span>
                  </div>
                ) : (
                  <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={quoteData.vendedor_id || ''} onChange={(e) => handleQuoteChange('vendedor_id', e.target.value)}>
                    <option value="">(Sin Asignar)</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-[#E2E8F0]">Aplicar IGV (18%)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={quoteData.aplica_igv} onChange={(e) => handleQuoteChange('aplica_igv', e.target.checked)} />
                  <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#0F1115] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Descuento Global (S/)</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-[#94A3B8] sm:text-sm font-medium">S/</span>
                  </div>
                  <input type="number" min="0" step="0.01" value={quoteData.descuento_global_monto} onChange={(e) => handleQuoteChange('descuento_global_monto', parseFloat(e.target.value) || 0)} className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Observaciones Específicas (PDF)</label>
                <textarea rows={2} value={quoteData.observaciones_pdf || ''} onChange={(e) => handleQuoteChange('observaciones_pdf', e.target.value)} placeholder="Se imprimirá en el PDF..." className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6] resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-[#181B21] border border-[#334155] rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#334155]">
            {lineItems.map((item, index) => (
              <div key={index} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <select value={item.producto_id || ''} onChange={(e) => updateLineItem(index, 'producto_id', e.target.value || null)} className="flex-1 bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-2 focus:border-[#3B82F6] focus:outline-none">
                    <option value="">Personalizado...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button onClick={() => removeLineItem(index)} className="shrink-0 text-[#EF4444]/80 hover:text-[#EF4444] p-2 rounded hover:bg-[#EF4444]/10 transition-colors">
                    <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg block"></iconify-icon>
                  </button>
                </div>
                <input type="text" value={item.nombre_producto_historico} onChange={(e) => updateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Descripción del producto..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Cant.</label>
                    <input type="number" min="1" value={item.cantidad} onChange={(e) => updateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Precio U.</label>
                    <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => updateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Desc. (S/)</label>
                    <input type="number" min="0" step="0.01" value={item.descuento_linea_monto} onChange={(e) => updateLineItem(index, 'descuento_linea_monto', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">Sub:&nbsp;</span>
                  <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(item.subtotal_linea)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#0F1115] border-b border-[#334155]">
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[220px]">De Catálogo</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase min-w-[250px]">Producto personalizado</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[100px]">Cant.</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[140px]">Precio U. (S/)</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[130px]">Desc (S/)</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[120px] text-right">Subtotal</th>
                  <th className="py-3 px-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-[#334155]/10">
                    <td className="py-3 px-4">
                      <select value={item.producto_id || ''} onChange={(e) => updateLineItem(index, 'producto_id', e.target.value || null)} className="w-full bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-1.5 focus:border-[#3B82F6] focus:outline-none">
                        <option value="">Personalizado...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input type="text" value={item.nombre_producto_historico} onChange={(e) => updateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Escriba aquí..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" min="1" value={item.cantidad} onChange={(e) => updateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => updateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" min="0" step="0.01" value={item.descuento_linea_monto} onChange={(e) => updateLineItem(index, 'descuento_linea_monto', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-[#94A3B8] text-right pt-1.5">{formatCurrency(item.subtotal_linea)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => removeLineItem(index)} className="text-[#EF4444]/80 hover:text-[#EF4444] p-1.5 rounded hover:bg-[#EF4444]/10 transition-colors">
                        <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg block"></iconify-icon>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#334155] bg-[#181B21]">
            <button onClick={addLineItem} className="flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 px-3 py-1.5 rounded transition-colors focus:outline-none">
              <iconify-icon icon="solar:add-circle-linear" class="text-lg"></iconify-icon> Añadir Fila Opcional
            </button>
          </div>
        </div>
        <div className="h-4 md:h-28"></div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-[#181B21] border-t border-[#334155] shadow-xl z-20">
        {/* Mobile footer */}
        <div className="md:hidden px-4 py-3 space-y-2">
          {showMobileTotals && (
            <div className="space-y-1.5 pb-2 border-b border-[#334155]">
              <div className="flex justify-between text-xs text-[#94A3B8]">
                <span>Subtotal</span><span className="text-[#E2E8F0]">{formatCurrency(totals.subtotal)}</span>
              </div>
              {quoteData.aplica_igv && (
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>IGV (18%)</span><span className="text-[#E2E8F0]">{formatCurrency(totals.igv_monto)}</span>
                </div>
              )}
              {quoteData.descuento_global_monto > 0 && (
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>Descuento Global</span><span className="text-[#EF4444]">- {formatCurrency(quoteData.descuento_global_monto)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button onClick={() => setShowMobileTotals(v => !v)} className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">
              <iconify-icon icon={showMobileTotals ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} class="text-sm"></iconify-icon>
              {showMobileTotals ? 'ocultar' : 'detalles'}
            </button>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-[#94A3B8]">Total</span>
              <span className="text-lg font-semibold text-[#E2E8F0]">{formatCurrency(totals.total_final)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {isEditing && (
              <button onClick={handleDelete} disabled={isSaving} className="p-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors shrink-0" title="Eliminar">
                <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon>
              </button>
            )}
            <button onClick={() => handleSave('Borrador')} disabled={isSaving} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#334155] bg-[#181B21] text-[#E2E8F0] hover:bg-[#334155]/40 text-xs font-medium disabled:opacity-50 transition-colors">
              <iconify-icon icon="solar:diskette-linear" class="text-base"></iconify-icon>
              Guardar
            </button>
          </div>
          <button onClick={handleOpenPreview} disabled={isSaving} className="flex items-center justify-center gap-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50 w-full">
            <iconify-icon icon="solar:eye-linear" class="text-base"></iconify-icon>
            {isPreviewLoading ? 'Generando...' : 'Ver PDF'}
          </button>
        </div>

        {/* Desktop footer */}
        <div className="hidden md:block p-6">
          <div className="flex flex-col items-end w-full">
            <div className="w-full sm:w-80 space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm text-[#94A3B8]">
                <span>Subtotal</span><span className="font-medium text-[#E2E8F0]">{formatCurrency(totals.subtotal)}</span>
              </div>
              {quoteData.aplica_igv && (
                <div className="flex justify-between items-center text-sm text-[#94A3B8]">
                  <span>IGV (18%)</span><span className="font-medium text-[#E2E8F0]">{formatCurrency(totals.igv_monto)}</span>
                </div>
              )}
              {quoteData.descuento_global_monto > 0 && (
                <div className="flex justify-between items-center text-sm text-[#94A3B8]">
                  <span>Descuento Global</span><span className="font-medium text-[#EF4444]">- {formatCurrency(quoteData.descuento_global_monto)}</span>
                </div>
              )}
              <div className="h-px bg-[#334155] w-full my-3"></div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-[#94A3B8] pb-1.5">Total Final</span>
                <span className="text-3xl font-medium tracking-tight text-[#E2E8F0]">{formatCurrency(totals.total_final)}</span>
              </div>
            </div>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 justify-end items-center">
              {isEditing && (
                <button onClick={handleDelete} disabled={isSaving} className="px-5 py-2.5 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 text-sm font-medium disabled:opacity-50 transition-colors mr-auto sm:mr-0 flex items-center gap-2">
                  <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon> Eliminar Cotización
                </button>
              )}
              <button onClick={() => handleSave('Borrador')} disabled={isSaving} className="px-5 py-2.5 rounded-lg border border-[#334155] bg-[#181B21] text-[#E2E8F0] hover:bg-[#334155]/40 text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2">
                <iconify-icon icon="solar:diskette-linear" class="text-lg"></iconify-icon> Guardar Borrador
              </button>
              <button onClick={handleOpenPreview} disabled={isSaving} className="bg-[#3B82F6] hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                <iconify-icon icon="solar:eye-linear" class="text-lg"></iconify-icon>
                {isPreviewLoading ? 'Generando...' : 'Ver PDF'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      <ClientFormModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSuccess={handleClientCreated} />
      <QuotePDFPreviewModal isOpen={isPDFModalOpen} onClose={handleClosePreviewModal} blobUrl={pdfBlobUrl} quoteIdStr={pdfQuoteIdStr} isSending={isSending} onDownload={handleDownloadFromModal} onSend={handleSendFromModal} />
    </div>
  );
}
