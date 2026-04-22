'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Trash2 } from 'lucide-react';
import { useHistorialPagosEmitidos, useAnularPagoEmitido } from '@/hooks/usePagosEmitidos';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobanteCompraId: string | null;
  serieNumero: string;
  montoTotal: number;
  saldoPendiente: number;
}

export default function HistorialPagosDrawer({
  isOpen,
  onClose,
  comprobanteCompraId,
  serieNumero,
  montoTotal,
  saldoPendiente,
}: Props) {
  const { role, user } = useAuth();
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setAnulando(null);
      setMotivo('');
    }
  }, [isOpen]);

  const { mutateAsync: anularPagoEmitido, isPending: isAnulando } = useAnularPagoEmitido(
    comprobanteCompraId ?? ''
  );

  const { data: pagos = [], isLoading } = useHistorialPagosEmitidos(
    isOpen ? (comprobanteCompraId ?? undefined) : undefined
  );

  const handleAnular = async (pagoId: string) => {
    if (!motivo.trim()) {
      toast.error('Ingresá un motivo para la anulación.');
      return;
    }
    try {
      await anularPagoEmitido({ pago_id: pagoId, anulado_por: user!.id, motivo });
      toast.success('Pago anulado correctamente.');
      setAnulando(null);
      setMotivo('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular pago');
    }
  };

  if (!isOpen) return null;

  const totalPagado = montoTotal - saldoPendiente;

  // Ordenar: no anulados primero, luego anulados
  const pagosOrdenados = [...pagos].sort((a, b) => {
    if (a.anulado === b.anulado) {
      return new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime();
    }
    return a.anulado ? 1 : -1;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#181B21] border-l border-[#334155] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <div>
            <h2 className="text-base font-semibold text-[#E2E8F0]">Historial de Pagos</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{serieNumero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-[#0F1115] border-b border-[#334155] px-5 py-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">Total</p>
              <p className="text-sm font-bold text-[#E2E8F0]">{formatCurrency(montoTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">Pagado</p>
              <p className="text-sm font-bold text-[#10B981]">{formatCurrency(totalPagado)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">Pendiente</p>
              <p className={`text-sm font-bold ${saldoPendiente > 0 ? 'text-red-400' : 'text-[#10B981]'}`}>
                {formatCurrency(saldoPendiente)}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de pagos */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 animate-pulse">
                  <div className="h-3 bg-[#334155] rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-[#334155] rounded w-2/3 mb-1"></div>
                  <div className="h-3 bg-[#334155] rounded w-1/2"></div>
                </div>
              ))}
            </>
          )}

          {!isLoading && pagos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-[#94A3B8]">No hay pagos registrados.</p>
            </div>
          )}

          {!isLoading && pagosOrdenados.map((pago) => (
            <div
              key={pago.id}
              className={`bg-[#0F1115] border rounded-lg p-4 space-y-2 transition-opacity ${
                pago.anulado ? 'border-red-500/20 opacity-50' : 'border-[#334155]'
              }`}
            >
              {/* Cabecera: monto + fecha */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${pago.anulado ? 'line-through text-[#94A3B8]' : 'text-[#10B981]'}`}>
                    {formatCurrency(pago.monto_pagado)}
                  </span>
                  {pago.anulado && (
                    <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                      ANULADO
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#94A3B8]">
                  {formatDate(pago.fecha_pago)}
                </span>
              </div>

              {/* Detalles */}
              <div className="space-y-1 text-xs">
                {pago.cat_metodos_pago && (
                  <p className="text-[#E2E8F0]">
                    {pago.cat_metodos_pago.descripcion}
                  </p>
                )}

                {pago.cuentas_bancarias_empresa && (
                  <p className="text-[#94A3B8]">
                    {pago.cuentas_bancarias_empresa.banco} — {pago.cuentas_bancarias_empresa.numero_cuenta}
                  </p>
                )}

                {pago.referencia_operacion && (
                  <p className="text-[#94A3B8]">Ref: {pago.referencia_operacion}</p>
                )}

                {pago.comprobante_img_url && (
                  <a
                    href={pago.comprobante_img_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#3B82F6] hover:text-blue-400 transition-colors"
                  >
                    Ver voucher
                  </a>
                )}

                {pago.anulado && pago.motivo_anulacion && (
                  <p className="text-[#94A3B8] italic pt-1 border-t border-red-500/20">
                    Motivo: {pago.motivo_anulacion}
                  </p>
                )}
              </div>

              {/* Footer: botón anular */}
              {role === 'admin' && !pago.anulado && (
                <div className="pt-1">
                  {anulando === pago.id ? (
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
                          onClick={() => handleAnular(pago.id)}
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAnulando(pago.id); setMotivo(''); }}
                      className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                      Anular
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
