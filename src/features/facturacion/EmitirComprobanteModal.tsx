'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { pedidosService } from '@/services/pedidos.service';
import { configuracionSeriesService } from '@/services/configuracionSeries.service';
import { useEmitirComprobante } from '@/hooks/useFacturas';
import { triggerFacturacionWebhook } from '@/services/webhook.service';
import { numeroALetras } from '@/utils/numeroALetras';
import type { Pedido, PedidoLinea } from '@/services/pedidos.service';
import type { ConfiguracionSerie } from '@/services/configuracionSeries.service';

// ─── Tipos ─────────────────────────────────────────────────────

interface LineaEditable extends PedidoLinea {
  mto_valor_unitario: number;
  mto_base_igv: number;
  mto_igv: number;
  subtotal: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pedido: Pedido | null;
}

// ─── Helpers ───────────────────────────────────────────────────

const UNIDADES_SUNAT = [
  { value: 'NIU', label: 'NIU – Unidad' },
  { value: 'ZZ',  label: 'ZZ – Servicio' },
  { value: 'KGM', label: 'KGM – Kilogramo' },
  { value: 'MTR', label: 'MTR – Metro' },
  { value: 'LTR', label: 'LTR – Litro' },
  { value: 'SET', label: 'SET – Juego' },
];

const AFECTACION_IGV = [
  { value: '10', label: '10 – Gravado' },
  { value: '20', label: '20 – Exonerado' },
  { value: '30', label: '30 – Inafecto' },
];

function calcularSunat(precioUnitario: number, cantidad: number, afectacionIgv: string) {
  const subtotal = parseFloat((cantidad * precioUnitario).toFixed(2));
  if (afectacionIgv === '10') {
    const mto_valor_unitario = precioUnitario / 1.18;
    const mto_base_igv = parseFloat((cantidad * mto_valor_unitario).toFixed(2));
    const mto_igv = parseFloat((mto_base_igv * 0.18).toFixed(2));
    return { subtotal, mto_valor_unitario, mto_base_igv, mto_igv };
  }
  return { subtotal, mto_valor_unitario: precioUnitario, mto_base_igv: 0, mto_igv: 0 };
}

function toLineaEditable(l: PedidoLinea): LineaEditable {
  return { ...l, ...calcularSunat(l.precio_unitario, l.cantidad, l.afectacion_igv) };
}

// ─── Componente ────────────────────────────────────────────────

export default function EmitirComprobanteModal({ isOpen, onClose, pedido }: Props) {
  const emitirComprobante = useEmitirComprobante();

  const [tipoComprobante, setTipoComprobante] = useState<'factura' | 'boleta'>('factura');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [lineas, setLineas] = useState<LineaEditable[]>([]);
  const [serie, setSerie] = useState<ConfiguracionSerie | null>(null);
  const [loadingLineas, setLoadingLineas] = useState(false);
  const [loadingSerie, setLoadingSerie] = useState(false);
  const [isLoadingSustento, setIsLoadingSustento] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cliente = pedido?.cotizaciones?.clientes;

  // Inicializar tipo y dirección según el cliente
  useEffect(() => {
    if (!pedido || !cliente) return;
    const preferido = cliente.comprobante_preferido?.toLowerCase();
    setTipoComprobante(preferido === 'boleta' ? 'boleta' : 'factura');
    setDireccionFacturacion(cliente.direccion || '');
  }, [pedido?.id, cliente]);

  // Cargar líneas del pedido
  useEffect(() => {
    if (!isOpen || !pedido) return;
    setLoadingLineas(true);
    pedidosService.getPedidoLineas(pedido.id).then((data) => {
      setLineas(data.map(toLineaEditable));
    }).catch(() => {
      toast.error('No se pudieron cargar las líneas del pedido');
    }).finally(() => setLoadingLineas(false));
  }, [isOpen, pedido?.id]);

  // Cargar serie activa cuando cambia tipo
  useEffect(() => {
    if (!isOpen) return;
    setLoadingSerie(true);
    setSerie(null);
    configuracionSeriesService.getSerieByTipo(tipoComprobante).then(setSerie).catch(() => setSerie(null)).finally(() => setLoadingSerie(false));
  }, [isOpen, tipoComprobante]);

  // Totales calculados
  const totales = useMemo(() => {
    let baseGravada = 0;
    let totalIgv = 0;
    let baseExonerada = 0;
    for (const l of lineas) {
      if (l.afectacion_igv === '10') {
        baseGravada += l.mto_base_igv;
        totalIgv += l.mto_igv;
      } else {
        baseExonerada += l.subtotal;
      }
    }
    const subtotal = parseFloat((baseGravada + baseExonerada).toFixed(2));
    const igv = parseFloat(totalIgv.toFixed(2));
    const total = parseFloat((subtotal + igv).toFixed(2));
    return { subtotal, igv, total };
  }, [lineas]);

  if (!isOpen || !pedido) return null;

  const cot = pedido.cotizaciones;
  const clienteName =
    cliente?.razon_social?.trim() ||
    `${cliente?.nombres_contacto || ''} ${cliente?.apellidos_contacto || ''}`.trim() ||
    'Cliente desconocido';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

  const proximo = serie ? serie.correlativo_actual + 1 : null;
  const previewSerie = serie && proximo
    ? `${serie.serie}-${proximo.toString().padStart(8, '0')}`
    : null;

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

  const updateUnidad = (idx: number, value: string) => {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, unidad_sunat: value } : l)));
  };

  const updateAfectacion = (idx: number, value: string) => {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? { ...l, afectacion_igv: value, ...calcularSunat(l.precio_unitario, l.cantidad, value) }
          : l
      )
    );
  };

  const handleSubmit = async () => {
    if (lineas.length === 0) {
      toast.error('No hay líneas de productos. Genera el pedido nuevamente para registrar las líneas.');
      return;
    }
    if (!serie) {
      toast.error('No hay serie activa configurada para este tipo de comprobante');
      return;
    }
    if (!cliente?.id) {
      toast.error('No se encontraron datos del cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];

      await emitirComprobante.mutateAsync({
        pedido_id: pedido.id,
        tipo_comprobante: tipoComprobante,
        cliente_id: cliente.id,
        fecha_emision: fechaHoy,
        subtotal: totales.subtotal,
        igv_monto: totales.igv,
        total: totales.total,
        lineas: lineas.map((l) => ({
          producto_id: l.producto_id,
          nombre_producto: l.nombre_producto,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          mto_valor_unitario: l.mto_valor_unitario,
          mto_base_igv: l.mto_base_igv,
          mto_igv: l.mto_igv,
          subtotal: l.subtotal,
          unidad_sunat: l.unidad_sunat,
          afectacion_igv: l.afectacion_igv,
        })),
        direccion_facturacion: direccionFacturacion.trim() || undefined,
      });

      // El webhook a n8n es no-fatal: la factura ya está creada en BD.
      // Si n8n no está disponible, el admin puede reintentar manualmente.
      try {
        await triggerFacturacionWebhook(pedido.id);
        toast.success('Comprobante emitido y enviado a procesar');
      } catch {
        toast.warning('Comprobante registrado. El envío automático a SUNAT falló — revisar configuración de n8n.');
      }

      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al emitir el comprobante');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[92vh]"
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">

          {/* Resumen cliente */}
          <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Cliente</p>
                <p className="text-sm font-medium text-[#E2E8F0] truncate">{clienteName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#94A3B8]">Total pedido</p>
                <p className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(cot?.total_final ?? 0)}</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {cliente?.numero_documento && (
                <p className="text-xs text-[#94A3B8]">
                  {cliente.tipo_documento?.toUpperCase()}: <span className="text-[#E2E8F0]">{cliente.numero_documento}</span>
                </p>
              )}
              {pedido.nro_oc_cliente && (
                <p className="text-xs text-[#94A3B8]">
                  OC: <span className="text-[#E2E8F0]">{pedido.nro_oc_cliente}</span>
                </p>
              )}
            </div>
          </div>

          {/* Sustento */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#E2E8F0]">Sustento de Aprobación</p>
            <button
              onClick={handleVerSustento}
              disabled={isLoadingSustento}
              className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {isLoadingSustento
                ? <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                : <iconify-icon icon="solar:eye-linear" class="text-base"></iconify-icon>
              }
              {pedido.sustento_nombre || 'Ver sustento'}
            </button>
          </div>

          {/* Tipo comprobante + preview serie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Número a Emitir (vista previa)
              </label>
              <div className="flex items-center h-10 px-3 rounded-md border border-[#334155] bg-[#0F1115]">
                {loadingSerie ? (
                  <iconify-icon icon="solar:spinner-linear" class="animate-spin text-sm text-[#94A3B8]"></iconify-icon>
                ) : previewSerie ? (
                  <span className="text-sm font-mono font-semibold text-[#10B981]">{previewSerie}</span>
                ) : (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <iconify-icon icon="solar:danger-triangle-linear" class="text-sm"></iconify-icon>
                    Sin serie configurada
                  </span>
                )}
              </div>
              {tipoComprobante === 'boleta' && (
                <p className="mt-1 text-[10px] text-[#94A3B8]">
                  Las boletas se validan en el resumen diario nocturno de SUNAT.
                </p>
              )}
            </div>
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

          {/* Tabla de líneas con códigos SUNAT */}
          <div>
            <p className="text-xs font-medium text-[#E2E8F0] mb-2">
              Líneas del Comprobante
              <span className="text-[#94A3B8] font-normal ml-1">(revisa unidad y afectación IGV)</span>
            </p>

            {loadingLineas && (
              <div className="flex items-center gap-2 py-4 text-xs text-[#94A3B8]">
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base text-[#3B82F6]"></iconify-icon>
                Cargando líneas...
              </div>
            )}

            {!loadingLineas && lineas.length === 0 && (
              <div className="p-4 border border-dashed border-yellow-500/40 bg-yellow-500/5 rounded-lg">
                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <iconify-icon icon="solar:danger-triangle-linear" class="text-sm shrink-0"></iconify-icon>
                  No se encontraron líneas para este pedido. Esto ocurre con pedidos creados antes de la actualización. El comprobante se emitirá sin detalle de líneas.
                </p>
              </div>
            )}

            {!loadingLineas && lineas.length > 0 && (
              <div className="border border-[#334155] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-[#0F1115]">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">Producto</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-16 text-center">Cant.</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-28 text-right">P. Unit (c/IGV)</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-32">Unidad</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-36">Afect. IGV</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-right">IGV</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {lineas.map((l, idx) => (
                      <tr key={l.id ?? idx} className="bg-[#181B21]">
                        <td className="px-3 py-2 text-xs text-[#E2E8F0]">{l.nombre_producto}</td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-center">{l.cantidad}</td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-right">{formatCurrency(l.precio_unitario)}</td>
                        <td className="px-3 py-2">
                          <select
                            value={l.unidad_sunat}
                            onChange={(e) => updateUnidad(idx, e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          >
                            {UNIDADES_SUNAT.map((u) => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={l.afectacion_igv}
                            onChange={(e) => updateAfectacion(idx, e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          >
                            {AFECTACION_IGV.map((a) => (
                              <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-right">{formatCurrency(l.mto_igv)}</td>
                        <td className="px-3 py-2 text-xs font-medium text-[#E2E8F0] text-right">{formatCurrency(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totales + leyenda */}
          {lineas.length > 0 && (
            <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">Base imponible</span>
                <span className="text-[#E2E8F0]">{formatCurrency(totales.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">IGV (18%)</span>
                <span className="text-[#E2E8F0]">{formatCurrency(totales.igv)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-[#334155] pt-2">
                <span className="text-[#E2E8F0]">Total</span>
                <span className="text-[#10B981]">{formatCurrency(totales.total)}</span>
              </div>
              <p className="text-[10px] text-[#94A3B8] pt-1 italic">
                {numeroALetras(totales.total)}
              </p>
            </div>
          )}
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
            disabled={isSubmitting || !serie}
            className="flex-1 bg-[#10B981] text-white text-sm font-medium py-2.5 rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Emitiendo...
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
