'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useActualizarComprobanteExterno } from '@/hooks/useFacturas';
import { getClientDisplayName } from '@/utils/formatters';
import { validateRegistrarExterna } from '@/features/facturacion/registrarExterna.utils';
import type { Client } from '@/services/clients.service';
import type { Comprobante, PedidoElegible } from '@/services/facturas.service';
import type { RegistrarExternaState } from '@/features/facturacion/registrarExterna.utils';

interface Props {
  comprobante: Comprobante;
  initialClients: Client[];
  pedidosElegibles: PedidoElegible[];
}

const INPUT_CLASS =
  'w-full bg-[#0F1115] border border-[#334155] rounded-lg py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors';

const LABEL_CLASS = 'block text-xs font-medium text-[#94A3B8] mb-1.5';

const TIPOS_DOC = [
  { codigo: '01', label: 'Factura Electrónica' },
  { codigo: '03', label: 'Boleta de Venta Electrónica' },
];

export default function EditarExternaForm({ comprobante, initialClients, pedidosElegibles }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fechaISO = comprobante.fecha_emision
    ? comprobante.fecha_emision.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [state, setState] = useState<RegistrarExternaState>({
    cliente_id: comprobante.cliente_id,
    tipo_doc_codigo: comprobante.tipo_doc_codigo,
    serie: comprobante.serie,
    correlativo: String(comprobante.correlativo),
    fecha_emision: fechaISO,
    subtotal: String(comprobante.subtotal ?? ''),
    igv_monto: String(comprobante.mto_igv ?? ''),
    total: String(comprobante.mto_imp_venta ?? ''),
    pedido_id: comprobante.pedido_id ?? '',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);

  const actualizarMutation = useActualizarComprobanteExterno();

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return initialClients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return initialClients
      .filter(
        (c) =>
          getClientDisplayName(c).toLowerCase().includes(q) ||
          c.numero_documento?.includes(q),
      )
      .slice(0, 20);
  }, [initialClients, clientSearch]);

  const set = (field: keyof RegistrarExternaState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setState((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    // En edición, adjuntos son opcionales — validar solo si se subió alguno
    const filesToValidate = { pdf: pdfFile ?? new File([], 'placeholder'), xml: xmlFile ?? new File([], 'placeholder') };
    const stateForValidation = { ...state };
    const error = validateRegistrarExterna(stateForValidation, filesToValidate);
    // Omitir errores de adjuntos en edición — son opcionales
    const isFileError = error?.includes('PDF') || error?.includes('XML');
    if (error && !isFileError) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await actualizarMutation.mutateAsync({
        id: comprobante.id,
        payload: {
          cliente_id: state.cliente_id,
          tipo_doc_codigo: state.tipo_doc_codigo,
          serie: state.serie.trim().toUpperCase(),
          correlativo: parseInt(state.correlativo, 10),
          fecha_emision: state.fecha_emision,
          subtotal: parseFloat(state.subtotal),
          igv_monto: parseFloat(state.igv_monto),
          total: parseFloat(state.total),
          pedido_id: state.pedido_id || null,
        },
        files: {
          ...(pdfFile ? { pdf: pdfFile } : {}),
          ...(xmlFile ? { xml: xmlFile } : {}),
        },
      });
      toast.success('Comprobante actualizado correctamente');
      router.push('/facturacion');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0D1117]">
      {/* Header */}
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link href="/facturacion" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">
            <iconify-icon icon="solar:arrow-left-linear" class="text-xl"></iconify-icon>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-[#E2E8F0]">Editar Comprobante Externo</h1>
            <p className="text-xs text-[#94A3B8]">{comprobante.serie_numero}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <>
              <iconify-icon icon="solar:spinner-bold-duotone" class="animate-spin text-base"></iconify-icon>
              Guardando...
            </>
          ) : (
            <>
              <iconify-icon icon="solar:check-circle-linear" class="text-base"></iconify-icon>
              Guardar cambios
            </>
          )}
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {validationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {validationError}
            </div>
          )}

          {/* Cliente */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#E2E8F0]">Cliente</h2>
            <div>
              <label className={LABEL_CLASS}>Buscar cliente</label>
              <input
                type="text"
                placeholder="Nombre, razón social o RUC..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Cliente *</label>
              <select value={state.cliente_id} onChange={set('cliente_id')} className={INPUT_CLASS}>
                <option value="">-- Seleccioná --</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getClientDisplayName(c)} {c.numero_documento ? `(${c.numero_documento})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Datos del comprobante */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#E2E8F0]">Datos del comprobante</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Tipo de comprobante *</label>
                <select value={state.tipo_doc_codigo} onChange={set('tipo_doc_codigo')} className={INPUT_CLASS}>
                  {TIPOS_DOC.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Fecha de emisión *</label>
                <input type="date" value={state.fecha_emision} onChange={set('fecha_emision')} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Serie *</label>
                <input type="text" placeholder="Ej: F001" value={state.serie} onChange={set('serie')} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Correlativo *</label>
                <input type="number" min="1" value={state.correlativo} onChange={set('correlativo')} className={INPUT_CLASS} />
              </div>
            </div>
          </section>

          {/* Montos */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#E2E8F0]">Montos (S/)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLASS}>Subtotal *</label>
                <input type="number" min="0" step="0.01" value={state.subtotal} onChange={set('subtotal')} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>IGV *</label>
                <input type="number" min="0" step="0.01" value={state.igv_monto} onChange={set('igv_monto')} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Total *</label>
                <input type="number" min="0.01" step="0.01" value={state.total} onChange={set('total')} className={INPUT_CLASS} />
              </div>
            </div>
          </section>

          {/* Pedido */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#E2E8F0]">Pedido asociado <span className="text-[#94A3B8] font-normal">(opcional)</span></h2>
            <select value={state.pedido_id} onChange={set('pedido_id')} className={INPUT_CLASS}>
              <option value="">Sin pedido</option>
              {pedidosElegibles.map((p) => (
                <option key={p.id} value={p.id}>
                  Pedido #{p.numero_pedido}
                </option>
              ))}
            </select>
          </section>

          {/* Adjuntos */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#E2E8F0]">
              Adjuntos <span className="text-[#94A3B8] font-normal">(opcional — dejá vacío para conservar los actuales)</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Reemplazar PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#3B82F6]/20 file:text-[#3B82F6] file:text-xs file:cursor-pointer hover:file:bg-[#3B82F6]/30 cursor-pointer"
                />
                {pdfFile ? (
                  <p className="text-xs text-[#10B981] mt-1">{pdfFile.name}</p>
                ) : comprobante.enlace_pdf ? (
                  <p className="text-xs text-[#94A3B8] mt-1">Conservando adjunto actual</p>
                ) : null}
              </div>
              <div>
                <label className={LABEL_CLASS}>Reemplazar XML</label>
                <input
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={(e) => setXmlFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#3B82F6]/20 file:text-[#3B82F6] file:text-xs file:cursor-pointer hover:file:bg-[#3B82F6]/30 cursor-pointer"
                />
                {xmlFile ? (
                  <p className="text-xs text-[#10B981] mt-1">{xmlFile.name}</p>
                ) : comprobante.enlace_xml ? (
                  <p className="text-xs text-[#94A3B8] mt-1">Conservando adjunto actual</p>
                ) : null}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
