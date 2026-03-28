'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateNotaCredito } from '@/hooks/useFacturas';
import { useQueryClient } from '@tanstack/react-query';
import { pedidosKeys } from '@/hooks/usePedidos';
import type { Comprobante } from '@/services/facturas.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  factura: Comprobante | null;
}

const TIPOS_NOTA = [
  { value: '01', label: 'Anulación total', desc: 'Cancela completamente el comprobante' },
  { value: '07', label: 'Corrección de datos', desc: 'Corrige RUC, razón social u otro dato' },
] as const;

export default function NotaCreditoModal({ isOpen, onClose, factura }: Props) {
  const queryClient = useQueryClient();
  const createNota = useCreateNotaCredito();

  const [tipoNota, setTipoNota] = useState<'01' | '07'>('01');
  const [motivo, setMotivo] = useState('');

  if (!isOpen || !factura) return null;

  const clienteName = factura.clientes?.razon_social?.trim()
    || `${factura.clientes?.nombres_contacto || ''} ${factura.clientes?.apellidos_contacto || ''}`.trim()
    || 'Cliente desconocido';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

  const handleClose = () => {
    setTipoNota('01');
    setMotivo('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }
    try {
      await createNota.mutateAsync({
        comprobante_id: factura.id,
        motivo: motivo.trim(),
      });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
      toast.success('Nota de crédito registrada. Se enviará a SUNAT vía n8n.');
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la nota de crédito');
    }
  };

  const isSubmitting = createNota.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#334155] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-2.5">
            <iconify-icon icon="solar:document-add-linear" class="text-red-400 text-xl"></iconify-icon>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Nota de Crédito</p>
              <p className="text-xs text-[#94A3B8]">{factura.serie_numero}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors"
          >
            <iconify-icon icon="solar:close-linear" class="text-lg"></iconify-icon>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* Resumen comprobante */}
          <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Comprobante</p>
                <p className="text-sm font-medium text-[#E2E8F0]">{factura.serie_numero}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#94A3B8]">Total</p>
                <p className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(factura.mto_imp_venta)}</p>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8]">Cliente: <span className="text-[#E2E8F0]">{clienteName}</span></p>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-yellow-400 text-base shrink-0 mt-0.5"></iconify-icon>
            <p className="text-xs text-[#94A3B8]">
              La nota de crédito quedará en estado <span className="text-yellow-400">borrador</span> hasta que n8n la emita ante SUNAT. El comprobante original se marcará como anulado.
            </p>
          </div>

          {/* Tipo de nota */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-2">
              Tipo de Nota <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {TIPOS_NOTA.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => setTipoNota(tipo.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                    tipoNota === tipo.value
                      ? 'border-red-400/50 bg-red-400/5'
                      : 'border-[#334155] hover:border-[#334155]/80 hover:bg-[#0F1115]'
                  }`}
                >
                  <p className={`text-sm font-medium ${tipoNota === tipo.value ? 'text-red-400' : 'text-[#E2E8F0]'}`}>
                    {tipo.value} — {tipo.label}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{tipo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Motivo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Describe el motivo de la anulación o corrección..."
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#334155] shrink-0 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 border border-[#334155] text-[#94A3B8] text-sm font-medium py-2.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !motivo.trim()}
            className="flex-1 bg-red-500 text-white text-sm font-medium py-2.5 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Registrando...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:document-add-linear" class="text-base"></iconify-icon>
                Emitir Nota de Crédito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
