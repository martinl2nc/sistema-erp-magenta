'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { pedidosService } from '@/services/pedidos.service';
import { useUpdatePedidoForEmision } from '@/hooks/usePedidos';
import { triggerFacturacionWebhook } from '@/services/webhook.service';
import type { Pedido } from '@/services/pedidos.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pedido: Pedido | null;
}

export default function EmitirComprobanteModal({ isOpen, onClose, pedido }: Props) {
  const updateForEmision = useUpdatePedidoForEmision();

  const [tipoComprobante, setTipoComprobante] = useState<'factura' | 'boleta'>('factura');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [isLoadingSustento, setIsLoadingSustento] = useState(false);

  const cliente = pedido?.cotizaciones?.clientes;

  useEffect(() => {
    if (!pedido || !cliente) return;
    const preferido = cliente.comprobante_preferido?.toLowerCase();
    setTipoComprobante(preferido === 'boleta' ? 'boleta' : 'factura');
    setDireccionFacturacion(cliente.direccion || '');
  }, [pedido, cliente]);

  if (!isOpen || !pedido) return null;

  const cot = pedido.cotizaciones;
  const clienteName = cliente?.razon_social?.trim()
    || `${cliente?.nombres_contacto || ''} ${cliente?.apellidos_contacto || ''}`.trim()
    || 'Cliente desconocido';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

  const handleVerSustento = async () => {
    setIsLoadingSustento(true);
    try {
      const url = await pedidosService.getSustentoSignedUrl(pedido.sustento_url);
      window.open(url, '_blank');
    } catch {
      toast.error('No se pudo abrir el sustento');
    } finally {
      setIsLoadingSustento(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await updateForEmision.mutateAsync({
        id: pedido.id,
        data: {
          tipo_comprobante: tipoComprobante,
          direccion_facturacion: direccionFacturacion.trim() || undefined,
        },
      });
      await triggerFacturacionWebhook(pedido.id);
      toast.success('Comprobante enviado a procesar');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al emitir el comprobante');
    }
  };

  const isSubmitting = updateForEmision.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#334155] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-2.5">
            <iconify-icon icon="solar:bill-list-linear" class="text-[#10B981] text-xl"></iconify-icon>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Emitir Comprobante Electrónico</p>
              <p className="text-xs text-[#94A3B8]">COT-{cot?.numero_correlativo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors"
          >
            <iconify-icon icon="solar:close-linear" class="text-lg"></iconify-icon>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* Resumen */}
          <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Cliente</p>
                <p className="text-sm font-medium text-[#E2E8F0] truncate">{clienteName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#94A3B8]">Total</p>
                <p className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(cot?.total_final ?? 0)}</p>
              </div>
            </div>
            {cliente?.numero_documento && (
              <p className="text-xs text-[#94A3B8]">
                {cliente.tipo_documento?.toUpperCase()}: <span className="text-[#E2E8F0]">{cliente.numero_documento}</span>
              </p>
            )}
            {pedido.nro_oc_cliente && (
              <p className="text-xs text-[#94A3B8]">
                OC del cliente: <span className="text-[#E2E8F0]">{pedido.nro_oc_cliente}</span>
              </p>
            )}
          </div>

          {/* Ver Sustento */}
          <div>
            <p className="text-xs font-medium text-[#E2E8F0] mb-1.5">Sustento de Aprobación</p>
            <button
              onClick={handleVerSustento}
              disabled={isLoadingSustento}
              className="flex items-center gap-2 text-sm text-[#3B82F6] hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {isLoadingSustento ? (
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
              ) : (
                <iconify-icon icon="solar:eye-linear" class="text-base"></iconify-icon>
              )}
              {pedido.sustento_nombre || 'Ver sustento'}
            </button>
          </div>

          {/* Tipo comprobante */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Tipo de Comprobante <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['factura', 'boleta'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoComprobante(tipo)}
                  className={`py-2.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                    tipoComprobante === tipo
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                      : 'border-[#334155] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-[#E2E8F0]'
                  }`}
                >
                  {tipo === 'factura' ? 'Factura (RUC)' : 'Boleta (DNI)'}
                </button>
              ))}
            </div>
            {tipoComprobante === 'boleta' && (
              <p className="mt-1.5 text-xs text-[#94A3B8] flex items-center gap-1">
                <iconify-icon icon="solar:info-circle-linear" class="text-sm text-yellow-400"></iconify-icon>
                Las boletas se confirman con SUNAT en el resumen diario nocturno.
              </p>
            )}
          </div>

          {/* Dirección de facturación */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Dirección de Facturación <span className="text-[#94A3B8] font-normal">(si difiere del cliente)</span>
            </label>
            <input
              type="text"
              value={direccionFacturacion}
              onChange={(e) => setDireccionFacturacion(e.target.value)}
              placeholder="Av. Ejemplo 123, Lima"
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#334155] shrink-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 border border-[#334155] text-[#94A3B8] text-sm font-medium py-2.5 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-[#10B981] text-white text-sm font-medium py-2.5 rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Enviando...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:bill-list-linear" class="text-base"></iconify-icon>
                Emitir Comprobante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
