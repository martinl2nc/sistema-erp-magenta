'use client'

import { formatCurrency } from '@/utils/formatters'
import type { CuotaCredito } from '@/features/facturacion/useNuevaFacturaState'

interface FormaPagoPanelProps {
  formaPago: 'Contado' | 'Credito'
  onFormaPagoChange: (v: 'Contado' | 'Credito') => void
  cuotas: CuotaCredito[]
  onCuotaChange: (id: string, patch: Partial<Omit<CuotaCredito, 'id'>>) => void
  numeroCuotas: number
  onNumeroCuotasChange: (v: number) => void
  intervaloDias: number
  onIntervaloDiasChange: (v: number) => void
  montoNeto: number
}

export default function FormaPagoPanel({
  formaPago,
  onFormaPagoChange,
  cuotas,
  onCuotaChange,
  numeroCuotas,
  onNumeroCuotasChange,
  intervaloDias,
  onIntervaloDiasChange,
  montoNeto,
}: FormaPagoPanelProps) {
  const suma = Number(cuotas.reduce((s, c) => s + c.monto, 0).toFixed(2))
  const diff = Number((suma - montoNeto).toFixed(2))
  const cuotasOk = diff === 0

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[#E2E8F0]">Forma de Pago</p>

      <div className="grid grid-cols-2 gap-2">
        {(['Contado', 'Credito'] as const).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => onFormaPagoChange(tipo)}
            className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
              formaPago === tipo
                ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                : 'border-[#334155] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-[#E2E8F0]'
            }`}
          >
            {tipo === 'Contado' ? 'Contado' : 'Crédito'}
          </button>
        ))}
      </div>

      {formaPago === 'Credito' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                N° de cuotas
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={numeroCuotas}
                onChange={(e) => onNumeroCuotasChange(parseInt(e.target.value) || 1)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Intervalo (días)
              </label>
              <input
                type="number"
                min={1}
                value={intervaloDias}
                onChange={(e) => onIntervaloDiasChange(parseInt(e.target.value) || 30)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
          </div>

          <div className="border border-[#334155] rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#0F1115]">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-10">#</th>
                  <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">Monto (PEN)</th>
                  <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {cuotas.map((cuota, i) => (
                  <tr key={cuota.id} className="bg-[#181B21]">
                    <td className="px-3 py-2 text-xs text-[#94A3B8]">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={cuota.monto}
                        onChange={(e) =>
                          onCuotaChange(cuota.id, { monto: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={cuota.fecha}
                        onChange={(e) =>
                          onCuotaChange(cuota.id, { fecha: e.target.value })
                        }
                        className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`flex justify-between text-xs px-1 ${cuotasOk ? 'text-[#10B981]' : 'text-red-400'}`}>
            <span>Suma de cuotas: {formatCurrency(suma)}</span>
            <span>
              {cuotasOk
                ? 'Suma correcta ✓'
                : `Diferencia: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
