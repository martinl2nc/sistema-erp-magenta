'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useRegistrarPagoCompleto } from '@/hooks/usePagosEmitidos';
import { useMetodosPago, useCuentasBancarias } from '@/hooks/useCobros';
import { useAuth } from '@/context/AuthContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobanteCompraId: string;
  saldoPendiente: number;
  monedaComprobante: 'PEN' | 'USD';
  serieNumero: string;
  onSuccess?: () => void;
}

export default function RegistrarPagoModal({
  isOpen,
  onClose,
  comprobanteCompraId,
  saldoPendiente,
  monedaComprobante,
  serieNumero,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const { mutateAsync: registrarPagoCompleto, isPending } = useRegistrarPagoCompleto(comprobanteCompraId);
  const { data: metodosPago = [] } = useMetodosPago();
  const { data: cuentasBancarias = [] } = useCuentasBancarias();

  const [metodoPagoCodigo, setMetodoPagoCodigo] = useState('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState<string | null>(null);
  const [montoPagado, setMontoPagado] = useState(saldoPendiente);
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>(monedaComprobante);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [referenciaOperacion, setReferenciaOperacion] = useState('');
  const [notas, setNotas] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    file: voucher,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    isDragging,
    clearFile,
    openFileDialog,
  } = useFileUpload();

  // Reset completo cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setMetodoPagoCodigo('');
      setCuentaBancariaId(null);
      setMontoPagado(saldoPendiente);
      setMoneda(monedaComprobante);
      setFechaPago(new Date().toISOString().split('T')[0]);
      setReferenciaOperacion('');
      setNotas('');
      setSubmitError(null);
      clearFile();
    }
  }, [isOpen, comprobanteCompraId, saldoPendiente, monedaComprobante]);

  const montoExcedeSaldo = montoPagado > saldoPendiente;

  const handleSubmit = async () => {
    if (!metodoPagoCodigo) {
      toast.error('Seleccioná un método de pago.');
      return;
    }
    if (!montoPagado || montoPagado <= 0) {
      toast.error('El monto debe ser mayor a cero.');
      return;
    }
    if (montoExcedeSaldo) {
      toast.error('El monto no puede superar el saldo pendiente.');
      return;
    }

    setSubmitError(null);

    try {
      await registrarPagoCompleto({
        comprobante_compra_id: comprobanteCompraId,
        metodo_pago_codigo: metodoPagoCodigo,
        cuenta_bancaria_id: cuentaBancariaId,
        monto_pagado: montoPagado,
        moneda,
        fecha_pago: fechaPago,
        referencia_operacion: referenciaOperacion || undefined,
        notas: notas || undefined,
        registrado_por: user?.id,
        voucher,
      });

      toast.success('Pago registrado correctamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar pago';
      toast.error(msg);
      setSubmitError(msg);
    }
  };

  if (!isOpen) return null;

  const isSubmitting = isPending;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[85vh]">
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#334155] rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <div>
            <h2 className="text-base font-semibold text-[#E2E8F0]">Registrar Pago</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{serieNumero}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Método de pago <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={metodoPagoCodigo}
                onChange={(e) => setMetodoPagoCodigo(e.target.value)}
                className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-3 pr-10 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] cursor-pointer"
              >
                <option value="">Seleccionar método...</option>
                {metodosPago.map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Cuenta bancaria */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Cuenta bancaria <span className="text-[#94A3B8] font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <select
                value={cuentaBancariaId ?? ''}
                onChange={(e) => setCuentaBancariaId(e.target.value || null)}
                className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-3 pr-10 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] cursor-pointer"
              >
                <option value="">Sin cuenta específica</option>
                {cuentasBancarias.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.banco} — {cb.numero_cuenta}
                    {cb.es_detraccion ? ' (Detracción)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Monto <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value ? Number(e.target.value) : 0)}
              className={`w-full bg-[#0F1115] border rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] ${
                montoExcedeSaldo
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-[#334155] focus:border-[#3B82F6]'
              }`}
            />
            <p className={`text-xs mt-1 ${montoExcedeSaldo ? 'text-red-400' : 'text-[#94A3B8]'}`}>
              Saldo pendiente: {formatCurrency(saldoPendiente)}
              {montoExcedeSaldo && ' — El monto no puede superar el saldo'}
            </p>
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">Moneda</label>
            <div className="relative">
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'PEN' | 'USD')}
                className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-3 pr-10 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] cursor-pointer"
              >
                <option value="PEN">PEN — Soles</option>
                <option value="USD">USD — Dólares</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fecha de pago */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Fecha de pago <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
            />
          </div>

          {/* Referencia de operación */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Referencia de operación <span className="text-[#94A3B8] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={referenciaOperacion}
              onChange={(e) => setReferenciaOperacion(e.target.value)}
              placeholder="Ej: 00012345678"
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
            />
          </div>

          {/* Voucher */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Voucher <span className="text-[#94A3B8] font-normal">(opcional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {voucher ? (
              <div className="flex items-center justify-between bg-[#0F1115] border border-[#10B981]/30 rounded-md px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-[#E2E8F0] truncate">{voucher.name}</span>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-[#94A3B8] hover:text-red-400 transition-colors shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={openFileDialog}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex items-center gap-3 border border-dashed rounded-md px-3 py-3 cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#3B82F6] bg-[#3B82F6]/5'
                    : 'border-[#334155] hover:border-[#3B82F6]/50 hover:bg-[#0F1115]'
                }`}
              >
                <span className="text-xs text-[#94A3B8]">
                  Arrastrá o <span className="text-[#3B82F6]">seleccioná</span> imagen o PDF
                </span>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Notas <span className="text-[#94A3B8] font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] resize-none"
            />
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="mx-5 mb-2 bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3 text-sm text-red-400">
            {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#334155]">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#10B981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Registrando...
              </>
            ) : (
              'Registrar Pago'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
