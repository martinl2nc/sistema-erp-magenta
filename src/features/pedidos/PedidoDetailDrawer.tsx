'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { pedidosService } from '@/services/pedidos.service';
import { useUpdatePedidoBasic, useUpdatePedidoEstado } from '@/hooks/usePedidos';
import type { Pedido, PedidoEstado } from '@/services/pedidos.service';
import { formatCurrency, formatDate as formatDateUtil, getClientDisplayName } from '@/utils/formatters';

interface Props {
  pedido: Pedido | null;
  onClose: () => void;
}

const ESTADO_LABELS: Record<PedidoEstado, string> = {
  pendiente_facturacion: 'Pendiente',
  procesando_facturacion: 'Procesando',
  facturado: 'Facturado',
  error_facturacion: 'Error',
  anulado: 'Anulado',
};

const ESTADO_STYLES: Record<PedidoEstado, string> = {
  pendiente_facturacion: 'bg-yellow-500/10 text-yellow-400',
  procesando_facturacion: 'bg-blue-500/10 text-blue-400',
  facturado: 'bg-[#10B981]/10 text-[#10B981]',
  error_facturacion: 'bg-red-500/10 text-red-400',
  anulado: 'bg-[#94A3B8]/10 text-[#94A3B8]',
};

export default function PedidoDetailDrawer({ pedido, onClose }: Props) {
  const { role } = useAuth();
  const updateMutation = useUpdatePedidoBasic();
  const updateEstadoMutation = useUpdatePedidoEstado();

  // Allow admin and vendor to edit/cancel if not billed
  const canEdit = (role === 'admin' || role === 'vendedor') && 
                  (pedido?.estado === 'pendiente_facturacion' || pedido?.estado === 'error_facturacion');
  
  const canAnular = canEdit;

  // Sync form fields when pedido changes
  const [localOc, setLocalOc] = useState('');
  const [localObs, setLocalObs] = useState('');
  const [localFecha, setLocalFecha] = useState('');
  const [localDireccion, setLocalDireccion] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Sync form fields when pedido changes
  useEffect(() => {
    if (pedido) {
      setLocalOc(pedido.nro_oc_cliente ?? '');
      setLocalObs(pedido.observaciones ?? '');
      setLocalFecha(pedido.fecha_pedido ? pedido.fecha_pedido.slice(0, 10) : '');
      setLocalDireccion(pedido.direccion_facturacion ?? '');
    }
  }, [pedido]);

  // Line items
  const { data: lineas = [], isLoading: loadingLineas } = useQuery({
    queryKey: ['pedidos', 'lineas', pedido?.id],
    queryFn: () => pedidosService.getPedidoLineas(pedido!.id),
    enabled: !!pedido?.id,
  });

  // Signed URL for sustento
  const { data: sustentoUrl } = useQuery({
    queryKey: ['pedidos', 'sustento', pedido?.sustento_url],
    queryFn: () => pedidosService.getSustentoSignedUrl(pedido!.sustento_url),
    enabled: !!pedido?.sustento_url,
    staleTime: 50 * 60 * 1000, // 50 min (URL válida 1h)
  });

  const isDirty =
    localOc !== (pedido?.nro_oc_cliente ?? '') ||
    localObs !== (pedido?.observaciones ?? '') ||
    localFecha !== (pedido?.fecha_pedido ? pedido.fecha_pedido.slice(0, 10) : '') ||
    localDireccion !== (pedido?.direccion_facturacion ?? '');

  const handleSave = () => {
    if (!pedido) return;
    updateMutation.mutate(
      {
        id: pedido.id,
        data: {
          nro_oc_cliente: localOc.trim() || null,
          observaciones: localObs.trim() || null,
          fecha_pedido: localFecha || null,
          direccion_facturacion: localDireccion.trim() || null,
        },
      },
      {
        onSuccess: () => toast.success('Pedido actualizado correctamente.'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCancel = () => {
    if (!pedido) return;
    setLocalOc(pedido.nro_oc_cliente ?? '');
    setLocalObs(pedido.observaciones ?? '');
    setLocalFecha(pedido.fecha_pedido ? pedido.fecha_pedido.slice(0, 10) : '');
    setLocalDireccion(pedido.direccion_facturacion ?? '');
  };

  const handleAnularClick = () => {
    setIsCanceling(true);
  };

  const confirmAnular = () => {
    if (!pedido || !motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo para anular el pedido.');
      return;
    }
    
    updateEstadoMutation.mutate(
      { id: pedido.id, estado: 'anulado', motivo_anulacion: motivoAnulacion.trim() },
      {
        onSuccess: () => {
          toast.success('Pedido anulado exitosamente.');
          setIsCanceling(false);
          setMotivoAnulacion('');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return formatDateUtil(new Date(d));
  };

  const getClienteName = (p: Pedido) => {
    const c = p.clientes;
    if (!c) return '—';
    return getClientDisplayName(c) || '—';
  };

  if (!pedido) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#0F1115]/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] bg-[#181B21] border-l border-[#334155] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-[#E2E8F0]">
              PED-{pedido.numero_pedido}
            </h2>
            {pedido.cotizaciones && (
              <span className="text-xs text-[#94A3B8] bg-[#0F1115] px-2 py-0.5 rounded">
                de COT-{pedido.cotizaciones.numero_correlativo}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLES[pedido.estado]}`}>
              {ESTADO_LABELS[pedido.estado]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors focus:outline-none text-[#94A3B8] rounded-md p-1.5 cursor-pointer"
          >
            <iconify-icon icon="solar:close-circle-linear" width="20" height="20" class="block" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Información general */}
          <section>
            <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
              Información del Pedido
            </h3>
            <div className="bg-[#0F1115] border border-[#334155] rounded-lg divide-y divide-[#334155]">

              <InfoRow label="Cliente" value={getClienteName(pedido)} />
              <InfoRow label="Vendedor" value={pedido.vendedor?.nombre ?? '—'} />
              <InfoRow label="Fecha creación" value={formatDate(pedido.fecha_creacion)} />

              {/* Fecha pedido */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-[#94A3B8] w-32 shrink-0">Fecha pedido</span>
                {canEdit ? (
                  <input
                    type="date"
                    value={localFecha}
                    onChange={(e) => setLocalFecha(e.target.value)}
                    className="flex-1 bg-[#181B21] border border-[#334155] rounded-md px-2 py-1 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  />
                ) : (
                  <span className="text-sm text-[#E2E8F0]">{formatDate(pedido.fecha_pedido)}</span>
                )}
              </div>

              {/* OC Cliente */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-[#94A3B8] w-32 shrink-0">OC Cliente</span>
                {canEdit ? (
                  <input
                    type="text"
                    value={localOc}
                    onChange={(e) => setLocalOc(e.target.value)}
                    placeholder="N° orden de compra..."
                    className="flex-1 bg-[#181B21] border border-[#334155] rounded-md px-2 py-1 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  />
                ) : (
                  <span className="text-sm text-[#E2E8F0]">{pedido.nro_oc_cliente || '—'}</span>
                )}
              </div>

              {/* Dirección de Facturación */}
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs text-[#94A3B8] w-32 shrink-0 pt-0.5">Dirección fiscal</span>
                {canEdit ? (
                  <textarea
                    value={localDireccion}
                    onChange={(e) => setLocalDireccion(e.target.value)}
                    rows={2}
                    placeholder="Dirección fiscal para la factura..."
                    className="flex-1 bg-[#181B21] border border-[#334155] rounded-md px-2 py-1 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] resize-none"
                  />
                ) : (
                  <span className="text-sm text-[#E2E8F0]">{pedido.direccion_facturacion || '—'}</span>
                )}
              </div>

              {/* Observaciones */}
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs text-[#94A3B8] w-32 shrink-0 pt-0.5">Observaciones</span>
                {canEdit ? (
                  <textarea
                    value={localObs}
                    onChange={(e) => setLocalObs(e.target.value)}
                    rows={3}
                    placeholder="Observaciones del pedido..."
                    className="flex-1 bg-[#181B21] border border-[#334155] rounded-md px-2 py-1 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] resize-none"
                  />
                ) : (
                  <span className="text-sm text-[#E2E8F0]">{pedido.observaciones || '—'}</span>
                )}
              </div>
              
              {/* Auditoría de Anulación */}
              {pedido.estado === 'anulado' && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-500/5">
                  <span className="text-xs text-red-400 w-32 shrink-0 pt-0.5 font-medium">Motivo de Anulación</span>
                  <div className="flex-1 space-y-1">
                    <span className="text-sm text-[#E2E8F0] block">
                      {pedido.motivo_anulacion || 'Motivo no registrado'}
                    </span>
                    {pedido.fecha_anulacion && (
                      <span className="text-xs text-[#94A3B8] block">
                        Cancelado el {formatDate(pedido.fecha_anulacion)} {pedido.anulador?.nombre ? `por ${pedido.anulador.nombre}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Líneas del pedido */}
          <section>
            <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
              Líneas del Pedido
            </h3>
            <div className="bg-[#0F1115] border border-[#334155] rounded-lg overflow-hidden">
              {loadingLineas ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[#94A3B8] text-sm">
                  <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]" />
                  Cargando líneas...
                </div>
              ) : lineas.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-6">Sin líneas registradas.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="px-4 py-2.5 text-xs font-medium text-[#94A3B8] uppercase">Producto</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-[#94A3B8] uppercase text-right w-16">Cant.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-[#94A3B8] uppercase text-right w-24">P. Unit.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-[#94A3B8] uppercase text-right w-20">Desc.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-[#94A3B8] uppercase text-right w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {lineas.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-sm text-[#E2E8F0]">{l.nombre_producto_historico}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8] text-right">{l.cantidad}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8] text-right">{formatCurrency(l.precio_unitario)}</td>
                        <td className="px-4 py-3 text-sm text-red-400 text-right">-{formatCurrency(l.descuento_linea_monto)}</td>
                        <td className="px-4 py-3 text-sm text-[#E2E8F0] font-medium text-right">{formatCurrency(l.subtotal_linea)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {(() => {
                    // Sum subtotal_linea directly as it already has the line discount applied
                    const baseTotal = lineas.reduce((acc, l) => acc + Number(l.subtotal_linea), 0);
                    const igvTotal = pedido.aplica_igv ? Number((baseTotal * 0.18).toFixed(2)) : 0;
                    const subtotalConIgv = baseTotal + igvTotal;
                    const totalFinal = subtotalConIgv - (pedido.descuento_global_monto || 0);

                    return (
                      <tfoot>
                        <tr className="border-t border-[#334155] bg-[#181B21]">
                          <td colSpan={4} className="px-4 py-2 text-xs text-[#94A3B8] text-right">Subtotal (Base con desc. líneas)</td>
                          <td className="px-4 py-2 text-sm text-[#E2E8F0] text-right">{formatCurrency(baseTotal)}</td>
                        </tr>
                        {pedido.aplica_igv && (
                          <tr className="bg-[#181B21]">
                            <td colSpan={4} className="px-4 py-2 text-xs text-[#94A3B8] text-right">IGV (18%)</td>
                            <td className="px-4 py-2 text-sm text-[#E2E8F0] text-right">{formatCurrency(igvTotal)}</td>
                          </tr>
                        )}
                        {pedido.descuento_global_monto > 0 && (
                          <tr className="bg-[#181B21]">
                            <td colSpan={4} className="px-4 py-2 text-xs text-[#94A3B8] text-right">Descuento global</td>
                            <td className="px-4 py-2 text-sm text-red-400 text-right">-{formatCurrency(pedido.descuento_global_monto)}</td>
                          </tr>
                        )}
                        <tr className="border-t border-[#334155] bg-[#181B21]">
                          <td colSpan={4} className="px-4 py-3 text-xs font-medium text-[#94A3B8] text-right uppercase">Total del Pedido</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#E2E8F0] text-right">
                            {formatCurrency(totalFinal)}
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              )}
            </div>
          </section>

          {/* Sustento */}
          {pedido.sustento_url && (
            <section>
              <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
                Sustento de Aprobación
              </h3>
              <div className="bg-[#0F1115] border border-[#334155] rounded-lg px-4 py-3 flex items-center gap-3">
                <iconify-icon icon="solar:file-text-linear" class="text-2xl text-[#3B82F6] shrink-0" />
                <span className="text-sm text-[#E2E8F0] flex-1 truncate">
                  {pedido.sustento_nombre ?? 'Sustento adjunto'}
                </span>
                {sustentoUrl ? (
                  <a
                    href={sustentoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3B82F6] hover:text-[#2563EB] transition-colors flex items-center gap-1 shrink-0"
                  >
                    <iconify-icon icon="solar:download-linear" width="14" height="14" />
                    Descargar
                  </a>
                ) : (
                  <span className="text-xs text-[#94A3B8]">Cargando...</span>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#334155]">
          {canEdit ? (
            isCanceling ? (
              <div className="flex flex-col gap-3 bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
                <label className="text-xs font-medium text-red-400">Motivo de la anulación (Requerido)</label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Especifique por qué se anula este pedido..."
                  rows={2}
                  className="w-full bg-[#181B21] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
                  autoFocus
                />
                <div className="flex gap-2.5 mt-1">
                  <button
                    onClick={confirmAnular}
                    disabled={updateEstadoMutation.isPending || !motivoAnulacion.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
                  >
                    {updateEstadoMutation.isPending ? 'Anulando...' : 'Confirmar Anulación'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCanceling(false);
                      setMotivoAnulacion('');
                    }}
                    disabled={updateEstadoMutation.isPending}
                    className="w-1/3 border border-[#334155] hover:bg-[#334155]/50 text-[#E2E8F0] text-sm font-medium rounded-lg py-2 transition-colors"
                  >
                    Volver
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || updateMutation.isPending || updateEstadoMutation.isPending}
                    className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 px-4 transition-colors flex items-center justify-center gap-2"
                  >
                    {updateMutation.isPending && (
                      <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base" />
                    )}
                    Guardar cambios
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={!isDirty || updateMutation.isPending || updateEstadoMutation.isPending}
                    className="w-1/3 border border-[#334155] hover:bg-[#334155]/50 disabled:opacity-50 text-[#E2E8F0] text-sm font-medium rounded-lg py-2.5 px-4 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                {canAnular && (
                  <button
                    onClick={handleAnularClick}
                    disabled={updateMutation.isPending || updateEstadoMutation.isPending}
                    className="w-full border border-red-500/50 hover:bg-red-500/10 text-red-500 text-sm font-medium rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <iconify-icon icon="solar:trash-bin-trash-linear" class="text-base" />
                    Anular Pedido
                  </button>
                )}
              </div>
            )

          ) : (
            <button
              onClick={onClose}
              className="w-full border border-[#334155] hover:bg-[#334155]/50 text-[#E2E8F0] text-sm font-medium rounded-lg py-2.5 px-4 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>

      </div>
    </>
  );
}

// ─── Helper ───────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-xs text-[#94A3B8] w-32 shrink-0">{label}</span>
      <span className="text-sm text-[#E2E8F0]">{value}</span>
    </div>
  );
}
