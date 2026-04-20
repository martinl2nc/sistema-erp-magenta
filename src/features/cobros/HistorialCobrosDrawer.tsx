'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useHistorialCobros, useCuotasComprobante, useAnularCobro } from '@/hooks/useCobros';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate as formatDateUtil } from '@/utils/formatters';
import type { CuentaPorCobrar } from '@/services/cobros.service';

interface HistorialCobrosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comprobante: CuentaPorCobrar | null;
}

export default function HistorialCobrosDrawer({
  isOpen,
  onClose,
  comprobante,
}: HistorialCobrosDrawerProps) {
  const { role, user } = useAuth();
  const [anulando, setAnulando] = useState<string | null>(null); // cobro id being confirmed
  const [motivo, setMotivo] = useState('');

  const { mutateAsync: anularCobro, isPending: isAnulando } = useAnularCobro(
    comprobante?.comprobante_id ?? ''
  );

  const handleAnular = async (cobroId: string) => {
    if (!motivo.trim()) {
      toast.error('Ingresá un motivo para la anulación.');
      return;
    }
    try {
      await anularCobro({ cobro_id: cobroId, anulado_por: user!.id, motivo });
      toast.success('Cobro anulado correctamente.');
      setAnulando(null);
      setMotivo('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular cobro');
    }
  };

  const { data: cobros = [], isLoading, isError: isErrorCobros, error: cobrosError } = useHistorialCobros(
    isOpen ? comprobante?.comprobante_id : undefined
  );

  const esCreditoYAbierto = isOpen && (comprobante?.forma_pago === 'Credito' || comprobante?.forma_pago === 'Crédito');
  const { data: cuotas = [], isLoading: isLoadingCuotas, isError: isErrorCuotas } = useCuotasComprobante(
    esCreditoYAbierto ? comprobante?.comprobante_id : undefined,
    esCreditoYAbierto
  );

  if (!isOpen || !comprobante) return null;

  const formatDate = (d: string) => formatDateUtil(new Date(d));

  const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));
  const getCuotaEstado = (cuotaIndex: number): 'Pagado' | 'Vencida' | 'Pendiente' => {
    if (comprobante.saldo_pendiente === 0) return 'Pagado';
    const acumulado = cuotas.slice(0, cuotaIndex + 1).reduce((s, c) => s + c.monto, 0);
    if (comprobante.total_cobrado >= acumulado) return 'Pagado';
    return new Date(cuotas[cuotaIndex].fecha_pago) < startOfToday() ? 'Vencida' : 'Pendiente';
  };

  const progressPercent = comprobante.monto_cobrable > 0
    ? Math.min(100, (comprobante.total_cobrado / comprobante.monto_cobrable) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative bg-[#181B21] border-l border-[#334155] w-full max-w-md shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E8F0]">Historial de Cobros</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{comprobante.serie_numero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-2xl"></iconify-icon>
          </button>
        </div>

        {/* Summary */}
        <div className="bg-[#0F1115] border-b border-[#334155] px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#94A3B8]">Total Facturado</p>
              <p className="text-[#E2E8F0] font-medium">{formatCurrency(comprobante.total_facturado)}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94A3B8]">Monto Cobrable</p>
              <p className="text-[#E2E8F0] font-medium">{formatCurrency(comprobante.monto_cobrable)}</p>
            </div>
            <div>
              <p className="text-[#94A3B8]">Total Cobrado</p>
              <p className="text-[#10B981] font-bold">{formatCurrency(comprobante.total_cobrado)}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94A3B8]">Saldo Pendiente</p>
              <p className={`font-bold ${comprobante.saldo_pendiente > 0 ? 'text-yellow-400' : 'text-[#10B981]'}`}>
                {formatCurrency(comprobante.saldo_pendiente)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Progreso de cobro</span>
              <span className="text-xs text-[#E2E8F0] font-medium">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: progressPercent >= 100
                    ? '#10B981'
                    : progressPercent > 0
                    ? 'linear-gradient(90deg, #F59E0B, #F97316)'
                    : '#334155',
                }}
              ></div>
            </div>
          </div>

          {/* NC and detraccion info */}
          {(comprobante.total_notas_credito > 0 || (comprobante.detraccion_monto && comprobante.detraccion_monto > 0)) && (
            <div className="flex gap-3 pt-1">
              {comprobante.detraccion_monto && comprobante.detraccion_monto > 0 && (
                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full">
                  Detracción: {formatCurrency(comprobante.detraccion_monto)}
                </span>
              )}
              {comprobante.total_notas_credito > 0 && (
                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
                  Notas de Crédito: {formatCurrency(comprobante.total_notas_credito)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cuotas Programadas */}
        {esCreditoYAbierto && (
          <div className="border-b border-[#334155] px-5 py-4">
            <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
              Cronograma de cuotas
            </h3>

            {isLoadingCuotas && (
              <div className="flex items-center gap-2 text-[#94A3B8] text-xs">
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base text-[#3B82F6]"></iconify-icon>
                Cargando cuotas...
              </div>
            )}

            {!isLoadingCuotas && isErrorCuotas && (
              <p className="text-xs text-red-400">Error al cargar las cuotas.</p>
            )}

            {!isLoadingCuotas && !isErrorCuotas && cuotas.length === 0 && (
              <p className="text-xs text-[#94A3B8]">No hay cuotas registradas.</p>
            )}

            {!isLoadingCuotas && !isErrorCuotas && cuotas.length > 0 && (
              <div className="space-y-2">
                {cuotas.map((cuota, index) => {
                  const estado = getCuotaEstado(index);
                  return (
                    <div key={`${cuota.comprobante_id}-${cuota.numero_cuota}`} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#94A3B8]">
                        <span className="text-[#E2E8F0] font-medium">
                          Cuota {cuota.numero_cuota} de {cuotas.length}
                        </span>
                        <span>{formatDate(cuota.fecha_pago)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#E2E8F0] font-medium">{formatCurrency(cuota.monto)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          estado === 'Pagado'
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : estado === 'Vencida'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {estado}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
              <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
              Cargando historial...
            </div>
          )}

          {!isLoading && isErrorCobros && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
              <p className="text-sm text-[#EF4444]">Error al cargar cobros</p>
              <p className="text-xs text-[#94A3B8]">{(cobrosError as Error)?.message}</p>
            </div>
          )}

          {!isLoading && !isErrorCobros && cobros.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <iconify-icon icon="solar:wallet-2-linear" class="text-4xl text-[#334155]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">No se han registrado cobros aún.</p>
            </div>
          )}

          {!isLoading && !isErrorCobros && cobros.length > 0 && (
            <div className="p-5">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-3 bottom-3 w-px bg-[#334155]"></div>

                <div className="space-y-5">
                  {cobros.map((cobro, index) => (
                    <div key={cobro.id} className="relative pl-9">
                      {/* Timeline dot */}
                      <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 ${
                        cobro.anulado
                          ? 'bg-red-500/40 border-red-500/40'
                          : index === 0
                          ? 'bg-[#10B981] border-[#10B981]/40'
                          : 'bg-[#334155] border-[#334155]'
                      }`}></div>

                      <div className={`bg-[#0F1115] border rounded-lg p-3.5 space-y-2 ${
                        cobro.anulado ? 'border-red-500/20 opacity-60' : 'border-[#334155]'
                      }`}>
                        {/* Amount and date header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${cobro.anulado ? 'line-through text-[#94A3B8]' : 'text-[#10B981]'}`}>
                              +{formatCurrency(cobro.monto_cobrado)}
                            </span>
                            {cobro.anulado && (
                              <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                                ANULADO
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#94A3B8]">
                            {formatDate(cobro.fecha_pago)}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-[#E2E8F0]">
                            <iconify-icon icon="solar:card-linear" class="text-sm text-[#94A3B8] shrink-0"></iconify-icon>
                            {cobro.cat_metodos_pago?.descripcion || cobro.metodo_pago_codigo}
                          </div>

                          {cobro.cuentas_bancarias_empresa && (
                            <div className="flex items-center gap-2 text-[#94A3B8]">
                              <iconify-icon icon="solar:buildings-linear" class="text-sm shrink-0"></iconify-icon>
                              {cobro.cuentas_bancarias_empresa.banco} — {cobro.cuentas_bancarias_empresa.numero_cuenta}
                            </div>
                          )}

                          {cobro.referencia_operacion && (
                            <div className="flex items-center gap-2 text-[#94A3B8]">
                              <iconify-icon icon="solar:hashtag-linear" class="text-sm shrink-0"></iconify-icon>
                              Ref: {cobro.referencia_operacion}
                            </div>
                          )}

                          {cobro.comprobante_img_url && (
                            <a
                              href={cobro.comprobante_img_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-[#3B82F6] hover:text-blue-400 transition-colors"
                            >
                              <iconify-icon icon="solar:gallery-linear" class="text-sm shrink-0"></iconify-icon>
                              Ver voucher
                            </a>
                          )}

                          {cobro.anulado && cobro.motivo_anulacion && (
                            <p className="text-red-400/80 italic pt-1 border-t border-red-500/20">
                              Motivo: {cobro.motivo_anulacion}
                            </p>
                          )}

                          {!cobro.anulado && cobro.notas && (
                            <p className="text-[#94A3B8] italic pt-1 border-t border-[#334155]/50">
                              {cobro.notas}
                            </p>
                          )}
                        </div>

                        {/* Footer: who registered + anular button */}
                        <div className="flex items-center justify-between pt-1">
                          {cobro.perfiles_usuario && (
                            <p className="text-[10px] text-[#94A3B8]/60">
                              Registrado por {cobro.perfiles_usuario.nombre}
                            </p>
                          )}
                          {role === 'admin' && !cobro.anulado && (
                            <button
                              type="button"
                              onClick={() => { setAnulando(cobro.id); setMotivo(''); }}
                              className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                            >
                              Anular
                            </button>
                          )}
                        </div>

                        {/* Inline confirm panel */}
                        {anulando === cobro.id && (
                          <div className="border-t border-red-500/20 pt-3 space-y-2">
                            <p className="text-xs text-red-400 font-medium">¿Confirmar anulación?</p>
                            <input
                              type="text"
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                              placeholder="Motivo (obligatorio)"
                              className="w-full bg-[#181B21] border border-red-500/30 rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAnular(cobro.id)}
                                disabled={isAnulando}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium py-1.5 rounded-md transition-colors disabled:opacity-50"
                              >
                                {isAnulando ? 'Anulando...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnulando(null)}
                                className="flex-1 text-[#94A3B8] hover:text-[#E2E8F0] text-xs py-1.5 rounded-md transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
