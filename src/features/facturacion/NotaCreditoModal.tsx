'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useCreateNotaCredito, useComprobanteDetalles } from '@/hooks/useFacturas';
import { useTiposNotaCredito } from '@/hooks/useCatalogos';
import { useQueryClient } from '@tanstack/react-query';
import { pedidosKeys } from '@/hooks/usePedidos';
import type { Comprobante, ComprobanteDetalleDB } from '@/services/facturas.service';
import { formatCurrency, getClientDisplayName } from '@/utils/formatters';
import { calcularLineaSunat, calcularTotalesSunat } from '@/utils/calculations';
import { TAX_RATES } from '@/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  factura: Comprobante | null;
}

export default function NotaCreditoModal({ isOpen, onClose, factura }: Props) {
  const queryClient = useQueryClient();
  const createNota = useCreateNotaCredito();
  const { data: tiposNota = [], isLoading: loadingTipos } = useTiposNotaCredito();

  // Custom hook to load items when a partial NC is selected
  // We enable it whenever the modal is open to have original details ready
  const { data: detallesOriginales = [] } = useComprobanteDetalles(isOpen ? factura?.id : undefined);

  const [tipoNota, setTipoNota] = useState<string>('');
  const [motivo, setMotivo] = useState('');

  // State for editable lines
  const [lineasNC, setLineasNC] = useState<ComprobanteDetalleDB[]>([]);
  const [montoDescuentoGlobal, setMontoDescuentoGlobal] = useState<number>(0);

  // 04: Descuento global
  const isNotaGlobal = tipoNota === '04';
  // 05: Descuento por ítem, 07: Devolución por ítem
  const isNotaParcial = ['05', '07'].includes(tipoNota);
  // 01, 02, 03, 06: Anulaciones directas que marcan el original como anulado
  const isNotaAnulacion = ['01', '02', '03', '06', '10', '13'].includes(tipoNota);

  useEffect(() => {
    if (tiposNota.length > 0 && !tipoNota) {
      setTipoNota(tiposNota[0].codigo);
    }
  }, [tiposNota, tipoNota]);

  // When switching to a partial type, initialize lines from original
  useEffect(() => {
    if (isNotaParcial && lineasNC.length === 0 && detallesOriginales.length > 0) {
      setLineasNC(detallesOriginales.map(d => ({ ...d })));
    } else if (!isNotaParcial && lineasNC.length > 0) {
      setLineasNC([]);
    }
  }, [isNotaParcial, detallesOriginales, lineasNC.length]);

  // Computed Totals for Partial NC — also produces updated line fields for the RPC payload
  const { customTotales, lineasNCCalculadas } = useMemo(() => {
    if (!isNotaParcial || lineasNC.length === 0) return { customTotales: null, lineasNCCalculadas: [] };

    const lineasCalculadas = lineasNC.map(linea => {
      const calcInfo = calcularLineaSunat(
        Number(linea.mto_valor_unitario),
        Number(linea.cantidad),
        linea.tip_afe_igv_codigo || '10',
        0
      );

      return {
        // Spread original fields, then override with recalculated values (no direct mutation)
        ...linea,
        mto_base_igv: calcInfo.mto_base_igv,
        igv: calcInfo.mto_igv,
        subtotal: calcInfo.subtotal,
        total_impuestos: calcInfo.mto_igv,
        mto_valor_venta: calcInfo.mto_base_igv,
        // Used by calcularTotalesSunat
        mto_igv: calcInfo.mto_igv,
        afectacion_igv: linea.tip_afe_igv_codigo || '10',
      };
    });

    const sumTotales = calcularTotalesSunat(lineasCalculadas, 0);

    return {
      customTotales: {
        mto_oper_gravadas: sumTotales.mto_oper_gravadas,
        mto_igv: sumTotales.igv,
        mto_imp_venta: sumTotales.total,
        valor_venta: sumTotales.subtotal - sumTotales.igv,
        subtotal: sumTotales.subtotal,
        total_impuestos: sumTotales.igv,
      },
      lineasNCCalculadas: lineasCalculadas,
    };
  }, [isNotaParcial, lineasNC]);

  const customTotalesGlobal = useMemo(() => {
    if (!isNotaGlobal || montoDescuentoGlobal <= 0) return null;

    // Treat it as a single line with total amount including IGV
    const base = montoDescuentoGlobal / (1 + TAX_RATES.IGV);
    const igv = montoDescuentoGlobal - base;
    
    return {
      mto_oper_gravadas: base,
      mto_igv: igv,
      mto_imp_venta: montoDescuentoGlobal,
      valor_venta: base,
      subtotal: montoDescuentoGlobal,
      total_impuestos: igv,
    };
  }, [isNotaGlobal, montoDescuentoGlobal]);

  if (!isOpen || !factura) return null;

  const clienteName = factura.clientes ? getClientDisplayName(factura.clientes) : 'Cliente desconocido';

  const removeLinea = (idx: number) => {
    setLineasNC(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLineaValue = (idx: number, newValor: number) => {
    setLineasNC(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], mto_valor_unitario: newValor };
      return copy;
    });
  };

  const updateLineaCantidad = (idx: number, newCantidad: number) => {
    setLineasNC(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], cantidad: newCantidad };
      return copy;
    });
  };

  const handleClose = () => {
    setTipoNota(tiposNota[0]?.codigo ?? '');
    setMotivo('');
    setLineasNC([]);
    setMontoDescuentoGlobal(0);
    onClose();
  };

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }

    if (isNotaParcial && lineasNC.length === 0) {
      toast.error('Debe retener al menos 1 ítem en la nota de crédito');
      return;
    }

    if (isNotaGlobal && montoDescuentoGlobal <= 0) {
      toast.error('El monto de descuento global debe ser mayor a 0');
      return;
    }

    let payloadLineas: any[] | undefined = isNotaParcial ? lineasNCCalculadas : undefined;
    let payloadTotales = isNotaParcial ? customTotales! : undefined;

    if (isNotaGlobal) {
      payloadTotales = customTotalesGlobal!;
      payloadLineas = [{
        descripcion: 'Descuento Global',
        cantidad: 1,
        mto_valor_unitario: payloadTotales.valor_venta,
        mto_precio_unitario: payloadTotales.subtotal,
        mto_base_igv: payloadTotales.mto_oper_gravadas,
        mto_valor_venta: payloadTotales.valor_venta,
        igv: payloadTotales.mto_igv,
        subtotal: payloadTotales.subtotal,
        total_impuestos: payloadTotales.total_impuestos,
        tip_afe_igv_codigo: '10',
        unidad_codigo: 'NIU'
      }] as ComprobanteDetalleDB[];
    }

    try {
      await createNota.mutateAsync({
        comprobante_id: factura.id,
        motivo: motivo.trim(),
        tipo_nota_codigo: tipoNota || undefined,
        lineas: payloadLineas,
        totales: payloadTotales,
      });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
      toast.success('Nota de crédito creada en borrador. Emitila a SUNAT desde el listado.');
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
        className="w-full sm:max-w-xl bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[90vh]"
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0 custom-scrollbar">
          {/* Resumen comprobante */}
          <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Comprobante</p>
                <p className="text-sm font-medium text-[#E2E8F0]">{factura.serie_numero}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs ${(isNotaParcial || isNotaGlobal) ? 'text-blue-400' : 'text-[#94A3B8]'}`}>
                  {(isNotaParcial || isNotaGlobal) ? 'Total Nota de Crédito' : 'Total Original'}
                </p>
                <p className={`text-sm font-semibold ${(isNotaParcial || isNotaGlobal) ? 'text-blue-400' : 'text-[#E2E8F0]'}`}>
                  {formatCurrency(isNotaParcial ? (customTotales?.mto_imp_venta || 0) : isNotaGlobal ? (customTotalesGlobal?.mto_imp_venta || 0) : factura.mto_imp_venta)}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8]">Cliente: <span className="text-[#E2E8F0]">{clienteName}</span></p>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-yellow-400 text-base shrink-0 mt-0.5"></iconify-icon>
            <p className="text-xs text-[#94A3B8]">
              La nota de crédito quedará en estado <span className="text-yellow-400">borrador</span>. Para emitirla a SUNAT, usá el botón de reenvío en el listado de comprobantes.
              {isNotaAnulacion && ' El comprobante original se marcará como anulado.'}
            </p>
          </div>

          {/* Tipo de nota */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-2">
                Tipo de Nota <span className="text-red-400">*</span>
              </label>
              {loadingTipos ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#334155]/30 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pr-1 h-36 overflow-y-auto custom-scrollbar">
                  {tiposNota.map((tipo) => (
                    <button
                      key={tipo.codigo}
                      onClick={() => setTipoNota(tipo.codigo)}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${tipoNota === tipo.codigo
                          ? 'border-red-400/50 bg-red-400/5'
                          : 'border-[#334155] hover:border-[#334155]/80 hover:bg-[#0F1115]'
                        }`}
                    >
                      <p className={`text-xs font-medium ${tipoNota === tipo.codigo ? 'text-red-400' : 'text-[#E2E8F0]'}`}>
                        {tipo.codigo} — {tipo.descripcion}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Motivo */}
            <div className="flex flex-col">
              <label className="block text-xs font-medium text-[#E2E8F0] mb-2">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo de la anulación o corrección..."
                className="flex-1 w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Campo para Descuento Global */}
          {isNotaGlobal && (
            <div className="pt-3 border-t border-[#334155]">
              <label className="block text-xs font-medium text-[#E2E8F0] mb-2">
                Monto de Descuento (Incluye IGV) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#94A3B8] text-sm">S/</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={factura.mto_imp_venta}
                  value={montoDescuentoGlobal || ''}
                  onChange={(e) => setMontoDescuentoGlobal(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-8 pr-3 text-sm text-[#E2E8F0] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Listado de ítems para Notas Parciales */}
          {isNotaParcial && (
            <div className="space-y-3 pt-3 border-t border-[#334155]">
              <div className="flex justify-between items-center bg-[#0F1115] p-2 rounded text-xs text-[#94A3B8]">
                <span>Ajustá los ítems a devolver/descontar. Eliminá los que no apliquen.</span>
              </div>

              {detallesOriginales.length === 0 ? (
                <div className="h-10 bg-[#334155]/30 rounded-md animate-pulse mt-2" />
              ) : lineasNC.length === 0 ? (
                <p className="text-xs text-red-400 text-center py-4 bg-red-400/5 rounded-md border border-red-400/10">No hay ítems en la nota. Agregue al menos uno.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {lineasNC.map((linea, idx) => (
                    <div key={idx} className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg flex flex-col gap-3 shadow-inner">
                      <div className="flex justify-between gap-3 items-start">
                        <p className="text-sm text-[#E2E8F0] font-medium leading-tight">{linea.descripcion}</p>
                        <button
                          onClick={() => removeLinea(idx)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors shrink-0 -mt-1 -mr-1"
                          title="Eliminar de la Nota"
                        >
                          <iconify-icon icon="solar:trash-bin-trash-linear" class="text-base"></iconify-icon>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <label className="text-[10px] text-[#94A3B8] absolute -top-4 left-0">Cant.</label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              max={detallesOriginales.find(d => d.id === linea.id)?.cantidad}
                              value={linea.cantidad}
                              onChange={e => updateLineaCantidad(idx, Number(e.target.value))}
                              className="w-16 bg-[#181B21] border border-[#334155] rounded-md py-1.5 px-2 text-xs text-[#E2E8F0] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-colors"
                            />
                          </div>
                          <span className="text-[#94A3B8] mt-2">×</span>
                          <div className="relative">
                            <label className="text-[10px] text-[#94A3B8] absolute -top-4 left-0">Precio Unit. (Vu)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.mto_valor_unitario}
                              onChange={e => updateLineaValue(idx, Number(e.target.value))}
                              className="w-24 bg-[#181B21] border border-[#334155] rounded-md py-1.5 px-2 text-xs text-[#E2E8F0] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-colors"
                            />
                          </div>
                        </div>
                        <div className="text-right mt-2">
                          <p className="text-[10px] text-[#94A3B8]">Subtotal ítem</p>
                          <p className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(Number(linea.mto_valor_unitario) * Number(linea.cantidad) * (1 + TAX_RATES.IGV))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
            disabled={isSubmitting || !motivo.trim() || (isNotaParcial && lineasNC.length === 0) || (isNotaGlobal && montoDescuentoGlobal <= 0)}
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
                Emitir Nota
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
