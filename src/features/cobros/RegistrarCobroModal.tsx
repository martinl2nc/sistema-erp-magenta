'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useRegistrarCobro, useMetodosPago, useCuentasBancarias } from '@/hooks/useCobros';
import { useAuth } from '@/context/AuthContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { formatCurrency, getClientDisplayName } from '@/utils/formatters';
import { validateCobroForm, initialCobroFormData } from './cobros.utils';
import { cobrosService } from '@/services/cobros.service';
import type { CobroFormData } from './cobros.utils';
import type { CuentaPorCobrar } from '@/services/cobros.service';

interface RegistrarCobroModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobante: CuentaPorCobrar | null;
  onSuccess?: () => void;
}

export default function RegistrarCobroModal({
  isOpen,
  onClose,
  comprobante,
  onSuccess,
}: RegistrarCobroModalProps) {
  const { user } = useAuth();
  const { mutateAsync: registrarCobro, isPending } = useRegistrarCobro();
  const { data: metodosPago = [] } = useMetodosPago();
  const { data: cuentasBancarias = [] } = useCuentasBancarias();

  const [form, setForm] = useState<CobroFormData>({ ...initialCobroFormData });
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    file: voucherFile,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    isDragging,
    clearFile,
    openFileDialog,
  } = useFileUpload();

  // Reset form when modal opens or changes comprobante
  useEffect(() => {
    if (isOpen && comprobante) {
      setForm({
        ...initialCobroFormData,
        fecha_pago: new Date().toISOString().split('T')[0],
      });
      setError(null);
      clearFile();
    }
  }, [isOpen, comprobante]);

  // Check if selected method requires reference
  const selectedMetodo = useMemo(
    () => metodosPago.find((m) => m.codigo === form.metodo_pago_codigo),
    [metodosPago, form.metodo_pago_codigo]
  );


  const handleChange = (field: keyof CobroFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!comprobante) return;

    const validationError = validateCobroForm(
      form,
      comprobante.saldo_pendiente,
      selectedMetodo?.requiere_referencia ?? false
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      let voucherUrl: string | undefined;

      if (voucherFile) {
        setIsUploading(true);
        try {
          voucherUrl = await cobrosService.uploadVoucherCobro(voucherFile, comprobante.comprobante_id);
        } finally {
          setIsUploading(false);
        }
      }

      await registrarCobro({
        comprobante_id: comprobante.comprobante_id,
        metodo_pago_codigo: form.metodo_pago_codigo,
        cuenta_bancaria_id: form.cuenta_bancaria_id || null,
        monto_cobrado: Number(form.monto_cobrado),
        moneda: 'PEN',
        fecha_pago: form.fecha_pago,
        referencia_operacion: form.referencia_operacion || undefined,
        comprobante_img_url: voucherUrl,
        notas: form.notas || undefined,
        registrado_por: user?.id,
      });

      toast.success('Cobro registrado exitosamente');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar cobro';
      toast.error(message);
      setError(message);
    }
  };

  if (!isOpen || !comprobante) return null;

  const clienteName = getClientDisplayName({
    razon_social: comprobante.razon_social,
    nombres_contacto: comprobante.nombres_contacto,
    apellidos_contacto: comprobante.apellidos_contacto,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-[#181B21] border border-[#334155] rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#334155]">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E8F0]">Registrar Cobro</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{comprobante.serie_numero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-2xl"></iconify-icon>
          </button>
        </div>

        {/* Comprobante Summary */}
        <div className="bg-[#0F1115] border-b border-[#334155] px-5 py-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#94A3B8]">Cliente</p>
              <p className="text-[#E2E8F0] font-medium truncate">{clienteName}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94A3B8]">Total Facturado</p>
              <p className="text-[#E2E8F0] font-medium">{formatCurrency(comprobante.total_facturado)}</p>
            </div>
            <div>
              <p className="text-[#94A3B8]">Monto Cobrable</p>
              <p className="text-[#E2E8F0] font-medium">{formatCurrency(comprobante.monto_cobrable)}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94A3B8]">Saldo Pendiente</p>
              <p className="text-yellow-400 font-bold text-sm">{formatCurrency(comprobante.saldo_pendiente)}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Monto a cobrar <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8] text-sm">S/</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={comprobante.saldo_pendiente}
                value={form.monto_cobrado}
                onChange={(e) => handleChange('monto_cobrado', e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleChange('monto_cobrado', comprobante.saldo_pendiente)}
              className="text-xs text-[#3B82F6] hover:text-blue-400 mt-1 transition-colors"
            >
              Cobrar saldo completo ({formatCurrency(comprobante.saldo_pendiente)})
            </button>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Método de Pago <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={form.metodo_pago_codigo}
                onChange={(e) => handleChange('metodo_pago_codigo', e.target.value)}
                className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-3 pr-10 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] cursor-pointer"
              >
                <option value="">Seleccionar método...</option>
                {metodosPago.map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                <iconify-icon icon="solar:alt-arrow-down-linear" class="text-lg"></iconify-icon>
              </div>
            </div>
          </div>

          {/* Cuenta Bancaria */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Cuenta Destino <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={form.cuenta_bancaria_id}
                onChange={(e) => handleChange('cuenta_bancaria_id', e.target.value)}
                className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 pl-3 pr-10 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] cursor-pointer"
              >
                <option value="">Seleccionar cuenta...</option>
                {cuentasBancarias.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.banco} — {cb.numero_cuenta}{cb.es_detraccion ? ' (Detracción)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                <iconify-icon icon="solar:alt-arrow-down-linear" class="text-lg"></iconify-icon>
              </div>
            </div>
          </div>

          {/* Fecha de Pago */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Fecha de Pago <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.fecha_pago}
              onChange={(e) => handleChange('fecha_pago', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
            />
          </div>

          {/* Referencia (condicional) */}
          {selectedMetodo?.requiere_referencia && (
            <div>
              <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
                Nro. de Operación / Referencia <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.referencia_operacion}
                onChange={(e) => handleChange('referencia_operacion', e.target.value)}
                placeholder="Ej: 00012345678"
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
              />
            </div>
          )}

          {/* Voucher */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">
              Voucher / Comprobante (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {voucherFile ? (
              <div className="flex items-center justify-between bg-[#0F1115] border border-[#10B981]/30 rounded-md px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <iconify-icon
                    icon={voucherFile.type === 'application/pdf' ? 'solar:file-pdf-linear' : 'solar:gallery-linear'}
                    class="text-lg text-[#10B981] shrink-0"
                  ></iconify-icon>
                  <span className="text-xs text-[#E2E8F0] truncate">{voucherFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-[#94A3B8] hover:text-red-400 transition-colors shrink-0 ml-2"
                >
                  <iconify-icon icon="solar:close-circle-linear" class="text-base"></iconify-icon>
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
                <iconify-icon icon="solar:upload-linear" class="text-lg text-[#94A3B8] shrink-0"></iconify-icon>
                <span className="text-xs text-[#94A3B8]">
                  Arrastrá o <span className="text-[#3B82F6]">seleccioná</span> imagen o PDF
                </span>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-[#E2E8F0] mb-1.5">Notas (opcional)</label>
            <textarea
              value={form.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <iconify-icon icon="solar:danger-triangle-linear" class="text-base shrink-0"></iconify-icon>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#334155]">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || isUploading}
            className="bg-[#10B981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Subiendo voucher...
              </>
            ) : isPending ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>
                Registrando...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:check-circle-linear" class="text-base"></iconify-icon>
                Registrar Cobro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
