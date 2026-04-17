'use client'

import type { CatBienServicioDetraccion } from '@/services/catalogos.service'

interface DetraccionPanelProps {
  bienesDetraccion: CatBienServicioDetraccion[]
  codBien: string
  onCodBienChange: (v: string) => void
  porcentaje: number
  onPorcentajeChange: (v: number) => void
  monto: number
  onMontoChange: (v: number) => void
  cuentaBn: string
  onCuentaBnChange: (v: string) => void
  codMedioPago: string
  onCodMedioPagoChange: (v: string) => void
}

export default function DetraccionPanel({
  bienesDetraccion,
  codBien,
  onCodBienChange,
  porcentaje,
  onPorcentajeChange,
  monto,
  onMontoChange,
  cuentaBn,
  onCuentaBnChange,
  codMedioPago,
  onCodMedioPagoChange,
}: DetraccionPanelProps) {
  return (
    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <iconify-icon
          icon="solar:bill-check-linear"
          class="text-amber-400 text-base shrink-0"
        ></iconify-icon>
        <p className="text-xs font-semibold text-amber-400">
          Datos de Detracción
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
            Bien / Servicio <span className="text-red-400">*</span>
          </label>
          <select
            value={codBien}
            onChange={(e) => onCodBienChange(e.target.value)}
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          >
            <option value="">Seleccionar...</option>
            {bienesDetraccion.map((b) => (
              <option key={b.codigo} value={b.codigo}>
                {b.codigo} – {b.descripcion}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
            Porcentaje (%) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={porcentaje}
            onChange={(e) => onPorcentajeChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
            Monto Detracción
            <span className="ml-1 text-[#64748B] font-normal">(auto-calculado)</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => onMontoChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-amber-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
            Cuenta Banco de la Nación <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={cuentaBn}
            onChange={(e) => onCuentaBnChange(e.target.value)}
            placeholder="Ej. 00-123456-0-01"
            className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
          Medio de Pago
        </label>
        <select
          value={codMedioPago}
          onChange={(e) => onCodMedioPagoChange(e.target.value)}
          className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
        >
          <option value="001">001 – Depósito en cuenta</option>
          <option value="002">002 – Giro</option>
          <option value="003">003 – Transferencia de fondos</option>
        </select>
      </div>
    </div>
  )
}
