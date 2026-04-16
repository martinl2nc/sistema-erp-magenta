'use client';

import { useHistorialCobros } from '@/hooks/useCobros';
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
  const { data: cobros = [], isLoading } = useHistorialCobros(
    isOpen ? comprobante?.comprobante_id : undefined
  );

  if (!isOpen || !comprobante) return null;

  const formatDate = (d: string) => formatDateUtil(new Date(d));

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

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-[#94A3B8] text-sm">
              <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
              Cargando historial...
            </div>
          )}

          {!isLoading && cobros.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <iconify-icon icon="solar:wallet-2-linear" class="text-4xl text-[#334155]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">No se han registrado cobros aún.</p>
            </div>
          )}

          {!isLoading && cobros.length > 0 && (
            <div className="p-5">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-3 bottom-3 w-px bg-[#334155]"></div>

                <div className="space-y-5">
                  {cobros.map((cobro, index) => (
                    <div key={cobro.id} className="relative pl-9">
                      {/* Timeline dot */}
                      <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 ${
                        index === 0
                          ? 'bg-[#10B981] border-[#10B981]/40'
                          : 'bg-[#334155] border-[#334155]'
                      }`}></div>

                      <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-3.5 space-y-2">
                        {/* Amount and date header */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#10B981]">
                            +{formatCurrency(cobro.monto_cobrado)}
                          </span>
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

                          {cobro.notas && (
                            <p className="text-[#94A3B8] italic pt-1 border-t border-[#334155]/50">
                              {cobro.notas}
                            </p>
                          )}
                        </div>

                        {/* Footer: who registered */}
                        {cobro.perfiles_usuario && (
                          <p className="text-[10px] text-[#94A3B8]/60 pt-1">
                            Registrado por {cobro.perfiles_usuario.nombre} {cobro.perfiles_usuario.apellido}
                          </p>
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
