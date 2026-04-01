'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { pedidosService } from '@/services/pedidos.service';
import { quotesService } from '@/services/quotes.service';
import { useCreatePedido } from '@/hooks/usePedidos';
import { useQueryClient } from '@tanstack/react-query';
import { quotesKeys } from '@/hooks/useQuotes';
import type { Quote } from '@/services/quotes.service';

interface LineaLocal {
  producto_id: string | null;
  nombre_producto_historico: string;
  cantidad: number;
  precio_unitario: number;
  fraccionable: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
}

export default function GenerarPedidoModal({ isOpen, onClose, quote }: Props) {
  const queryClient = useQueryClient();
  const createPedido = useCreatePedido();

  const [nroOc, setNroOc] = useState('');
  const [fechaPedido, setFechaPedido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lineas, setLineas] = useState<LineaLocal[]>([]);
  const [loadingLineas, setLoadingLineas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar líneas de la cotización cuando abre el modal
  useEffect(() => {
    if (!isOpen || !quote) return;
    setLoadingLineas(true);
    quotesService.getQuoteById(quote.id).then((fullQuote) => {
      const cotLineas = fullQuote.cotizaciones_lineas || [];
      setLineas(
        cotLineas.map((l) => ({
          producto_id: l.producto_id ?? null,
          nombre_producto_historico: l.nombre_producto_historico,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          fraccionable: l.productos?.fraccionable ?? false,
        }))
      );
      // Precargar descuento de la cotización
      setDescuentoGlobal(fullQuote.descuento_global_monto ?? 0);
    }).catch(() => {
      toast.error('No se pudieron cargar las líneas de la cotización');
    }).finally(() => setLoadingLineas(false));
  }, [isOpen, quote?.id]);

  if (!isOpen || !quote) return null;

  const cliente = quote.clientes;
  const clienteName =
    cliente?.razon_social?.trim() ||
    `${cliente?.nombres_contacto || ''} ${cliente?.apellidos_contacto || ''}`.trim() ||
    'Cliente desconocido';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const updateCantidad = (idx: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, cantidad: num } : l))
    );
  };

  const calcSubtotal = (l: LineaLocal) =>
    parseFloat((l.cantidad * l.precio_unitario).toFixed(2));

  const sumaLineas = lineas.reduce((sum, l) => sum + calcSubtotal(l), 0);
  const subtotalPedido = parseFloat((sumaLineas - descuentoGlobal).toFixed(2));
  const aplicaIgv = quote?.aplica_igv ?? true;
  const igvMonto = aplicaIgv
    ? parseFloat((subtotalPedido * 0.18 / 1.18).toFixed(2))
    : 0;
  const totalFinal = subtotalPedido;

  const handleSubmit = async () => {
    if (!file) {
      toast.error('El sustento de aprobación es obligatorio');
      return;
    }
    if (lineas.length === 0) {
      toast.error('No hay líneas de productos en esta cotización');
      return;
    }
    setIsSubmitting(true);
    try {
      const { path, nombre } = await pedidosService.uploadSustento(file, quote.id);
      const nuevoPedido = await createPedido.mutateAsync({
        cotizacion_id: quote.id,
        cliente_id: quote.cliente_id,
        vendedor_id: quote.vendedor_id ?? null,
        nro_oc_cliente: nroOc.trim() || undefined,
        sustento_url: path,
        sustento_nombre: nombre,
        observaciones: observaciones.trim() || undefined,
        fecha_pedido: fechaPedido || undefined,
        // Financial fields
        aplica_igv: aplicaIgv,
        subtotal: subtotalPedido,
        descuento_global_monto: descuentoGlobal,
        igv_monto: igvMonto,
        total_final: totalFinal,
      });

      await pedidosService.createPedidoLineas(
        lineas.map((l) => ({
          pedido_id: nuevoPedido.id,
          producto_id: l.producto_id,
          nombre_producto_historico: l.nombre_producto_historico,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          subtotal_linea: calcSubtotal(l),
        }))
      );

      await quotesService.updateQuoteStatus(quote.id, 'Aprobada');
      queryClient.invalidateQueries({ queryKey: quotesKeys.list() });
      toast.success('Pedido generado correctamente');
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNroOc('');
    setFechaPedido('');
    setObservaciones('');
    setDescuentoGlobal(0);
    setFile(null);
    setLineas([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#334155] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-2.5">
            <iconify-icon icon="solar:box-linear" class="text-[#3B82F6] text-xl"></iconify-icon>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Generar Pedido</p>
              <p className="text-xs text-[#94A3B8]">COT-{quote.numero_correlativo}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors"
          >
            <iconify-icon icon="solar:close-linear" class="text-lg"></iconify-icon>
          </button>
        </div>

        {/* Resumen cotización */}
        <div className="mx-5 mt-4 p-3 bg-[#0F1115] border border-[#334155] rounded-lg shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#94A3B8]">Cliente</p>
              <p className="text-sm font-medium text-[#E2E8F0] truncate">{clienteName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[#94A3B8]">Total cotización</p>
              <p className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(quote.total_final)}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">

          {/* Tabla de productos editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#E2E8F0]">
                Productos del Pedido
                <span className="text-[#94A3B8] font-normal ml-1">(ajusta cantidades si el cliente confirmó menos)</span>
              </p>
              {lineas.length > 0 && (
                <p className="text-xs text-[#94A3B8]">
                  Suma líneas: <span className="text-[#E2E8F0] font-medium">{formatCurrency(sumaLineas)}</span>
                </p>
              )}
            </div>

            {loadingLineas && (
              <div className="flex items-center gap-2 py-4 text-[#94A3B8] text-xs">
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base text-[#3B82F6]"></iconify-icon>
                Cargando productos...
              </div>
            )}

            {!loadingLineas && lineas.length === 0 && (
              <div className="py-4 text-center text-xs text-[#94A3B8] border border-dashed border-[#334155] rounded-lg">
                No se encontraron productos en la cotización
              </div>
            )}

            {!loadingLineas && lineas.length > 0 && (
              <div className="border border-[#334155] rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#0F1115]">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">Producto</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-center">Cantidad</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-28 text-right">P. Unitario</th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-28 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {lineas.map((l, idx) => (
                      <tr key={idx} className="bg-[#181B21]">
                        <td className="px-3 py-2.5 text-xs text-[#E2E8F0]">{l.nombre_producto_historico}</td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={l.fraccionable ? '0.001' : '1'}
                            step={l.fraccionable ? '0.001' : '1'}
                            value={l.cantidad}
                            onChange={(e) => updateCantidad(idx, e.target.value)}
                            className="w-20 bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-[#E2E8F0] text-center focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#94A3B8] text-right">
                          {formatCurrency(l.precio_unitario)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-[#E2E8F0] text-right">
                          {formatCurrency(calcSubtotal(l))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Resumen financiero del pedido */}
            {!loadingLineas && lineas.length > 0 && (
              <div className="mt-3 p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Suma de líneas</span>
                  <span className="text-xs text-[#E2E8F0]">{formatCurrency(sumaLineas)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94A3B8]">Descuento global</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={descuentoGlobal}
                      onChange={(e) => setDescuentoGlobal(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 bg-[#181B21] border border-[#334155] rounded px-2 py-0.5 text-xs text-[#E2E8F0] text-right focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                    />
                  </div>
                  <span className="text-xs text-red-400">-{formatCurrency(descuentoGlobal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Subtotal</span>
                  <span className="text-xs text-[#E2E8F0]">{formatCurrency(subtotalPedido)}</span>
                </div>
                {aplicaIgv && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]">IGV (18%)</span>
                    <span className="text-xs text-[#E2E8F0]">{formatCurrency(igvMonto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#334155]">
                  <span className="text-xs font-semibold text-[#E2E8F0]">Total del pedido</span>
                  <span className="text-sm font-bold text-[#3B82F6]">{formatCurrency(totalFinal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Sustento — obligatorio */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Sustento de Aprobación <span className="text-red-400">*</span>
              <span className="text-[#94A3B8] font-normal ml-1">(PDF, JPG o PNG — máx. 10 MB)</span>
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#3B82F6] bg-[#3B82F6]/5'
                  : file
                  ? 'border-[#10B981] bg-[#10B981]/5'
                  : 'border-[#334155] hover:border-[#3B82F6]/50 hover:bg-[#0F1115]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <iconify-icon icon="solar:file-check-linear" class="text-[#10B981] text-2xl shrink-0"></iconify-icon>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-[#10B981] truncate">{file.name}</p>
                    <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-auto p-1 text-[#94A3B8] hover:text-red-400 transition-colors"
                  >
                    <iconify-icon icon="solar:close-circle-linear" class="text-lg"></iconify-icon>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <iconify-icon icon="solar:upload-linear" class="text-[#94A3B8] text-2xl"></iconify-icon>
                  <p className="text-sm text-[#94A3B8]">
                    Arrastra el archivo aquí o <span className="text-[#3B82F6]">selecciona</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Nro OC */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Nro. de OC del Cliente <span className="text-[#94A3B8] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={nroOc}
              onChange={(e) => setNroOc(e.target.value)}
              placeholder="Ej: OC-45091"
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
            />
          </div>

          {/* Fecha pedido + observaciones en grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Fecha del Pedido <span className="text-[#94A3B8] font-normal">(opcional)</span>
              </label>
              <input
                type="date"
                value={fechaPedido}
                onChange={(e) => setFechaPedido(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Observaciones <span className="text-[#94A3B8] font-normal">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Ej: Pago a 30 días, entrega en obra..."
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors resize-none"
              />
            </div>
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
            disabled={isSubmitting || !file || lineas.length === 0}
            className="flex-1 bg-[#3B82F6] text-white text-sm font-medium py-2.5 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Guardando...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:box-linear" class="text-base"></iconify-icon>
                Generar Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
