'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { usePedidoLineas, useSustentoSignedUrl } from '@/hooks/usePedidos'
import {
  useEmitirComprobante,
  useEnviarASunat,
  useSerieByTipoDoc
} from '@/hooks/useFacturas'
import {
  useUnidadesMedida,
  useAfectacionesIgv,
  useTiposDocumento,
  useCargosDescuentos,
  useTiposOperacion,
  useBienesDetraccion
} from '@/hooks/useCatalogos'
import { useCompanyConfig } from '@/hooks/useCompanyConfig'
import { numeroALetras } from '@/utils/numeroALetras'
import type { Pedido, PedidoLinea } from '@/services/pedidos.service'
import { formatCurrency, getClientDisplayName } from '@/utils/formatters'
import { calcularLineaSunat, calcularTotalesSunat } from '@/utils/calculations'
import { validateNuevaFactura, validateCuotas, distribuirCuotas } from '@/features/facturacion/nuevaFactura.utils'
import type { CuotaCredito } from '@/features/facturacion/useNuevaFacturaState'
import DetraccionPanel from '@/features/facturacion/DetraccionPanel'
import FormaPagoPanel from '@/features/facturacion/FormaPagoPanel'

// ─── Tipos ─────────────────────────────────────────────────────

interface LineaEditable extends PedidoLinea {
  unidad_sunat: string
  afectacion_igv: string
  mto_valor_unitario: number
  mto_base_igv: number
  mto_igv: number
  subtotal: number
  sku: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  pedido: Pedido | null
  onSuccess?: () => void
}

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_AFECTACION_GRAVADA = '10'
const DEFAULT_AFECTACION_EXONERADA = '20'

function toLineaEditable(
  l: PedidoLinea,
  defaultAfectacion: string
): LineaEditable {
  return {
    ...l,
    sku: l.sku ?? null,
    unidad_sunat: 'NIU',
    afectacion_igv: defaultAfectacion,
    ...calcularLineaSunat(
      l.precio_unitario,
      l.cantidad,
      defaultAfectacion,
      l.descuento_linea_monto ?? 0
    )
  }
}

// ─── Componente ────────────────────────────────────────────────

export default function EmitirComprobanteModal({
  isOpen,
  onClose,
  pedido,
  onSuccess
}: Props) {
  const emitirComprobante = useEmitirComprobante()
  const enviarASunatHook = useEnviarASunat()
  const sustentoMutation = useSustentoSignedUrl()

  // ── Catálogos dinámicos desde BD ─────────────────────────────
  const { data: unidades = [], isLoading: loadingUnidades } =
    useUnidadesMedida()
  const { data: afectaciones = [], isLoading: loadingAfectaciones } =
    useAfectacionesIgv()
  const { data: tiposDoc = [], isLoading: loadingTiposDoc } =
    useTiposDocumento()
  const { data: cargosDescuentos = [], isLoading: loadingCatalog53 } =
    useCargosDescuentos()
  const { data: tiposOperacion = [] } = useTiposOperacion()
  const { data: bienesDetraccion = [] } = useBienesDetraccion()
  const { data: companyConfig } = useCompanyConfig()

  // Solo comprobantes activos (01=Factura, 03=Boleta)
  const tiposComprobante = useMemo(
    () => tiposDoc.filter((t) => t.categoria === 'comprobante'),
    [tiposDoc]
  )
  const descuentosSunat = useMemo(
    () => cargosDescuentos.filter((c) => c.tipo === 'descuento'),
    [cargosDescuentos]
  )
  const loadingCatalogos =
    loadingUnidades ||
    loadingAfectaciones ||
    loadingTiposDoc ||
    loadingCatalog53

  const [tipoDocCodigo, setTipoDocCodigo] = useState('01') // default Factura
  const [direccionFacturacion, setDireccionFacturacion] = useState('')
  const [lineas, setLineas] = useState<LineaEditable[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Descuento global
  const [descuentoMonto, setDescuentoMonto] = useState(0)
  const [descuentoCodigo, setDescuentoCodigo] = useState('03')

  // Forma de pago / cuotas a crédito
  const [formaPago, setFormaPago] = useState<'Contado' | 'Credito'>('Contado')
  const [cuotas, setCuotas] = useState<CuotaCredito[]>([])
  const [numeroCuotas, setNumeroCuotas] = useState(1)
  const [intervaloDias, setIntervaloDias] = useState(30)

  // Tipo de operación y detracción (Cat. 51 / Cat. 54)
  const [tipoOperacion, setTipoOperacion] = useState('0101')
  const [detraccionCodBien, setDetraccionCodBien] = useState('')
  const [detraccionCodMedioPago, setDetraccionCodMedioPago] = useState('001')
  const [detraccionPorcentaje, setDetraccionPorcentaje] = useState(0)
  const [detraccionMonto, setDetraccionMonto] = useState(0)
  const [detraccionCuentaBn, setDetraccionCuentaBn] = useState('')

  // ── Queries TanStack ─────────────────���────────────────────────
  const { data: pedidoLineasData, isLoading: loadingLineas } = usePedidoLineas(
    pedido?.id,
    isOpen
  )
  const { data: serie, isLoading: loadingSerie } = useSerieByTipoDoc(
    tipoDocCodigo,
    isOpen
  )

  // Inicializar tipo y dirección según el cliente una vez que los catálogos están disponibles
  useEffect(() => {
    if (!pedido || !pedido.clientes || tiposComprobante.length === 0) return
    const cliente = pedido.clientes
    const preferido = cliente.comprobante_preferido?.toLowerCase()
    const match = tiposComprobante.find((t) =>
      t.descripcion.toLowerCase().includes(preferido ?? 'factura')
    )
    setTipoDocCodigo(match?.codigo ?? tiposComprobante[0]?.codigo ?? '01')
    setDireccionFacturacion(cliente.direccion || '')
  }, [isOpen, pedido?.id, pedido?.clientes, tiposComprobante.length])

  // Sincronizar líneas cuando llegan del servidor
  useEffect(() => {
    if (!pedidoLineasData) return
    const defaultAfectacion = pedido?.aplica_igv
      ? DEFAULT_AFECTACION_GRAVADA
      : DEFAULT_AFECTACION_EXONERADA
    setLineas(
      pedidoLineasData.map((l) => toLineaEditable(l, defaultAfectacion))
    )
  }, [pedidoLineasData, pedido?.aplica_igv])

  // Inicializar descuento desde el pedido
  useEffect(() => {
    if (pedido) {
      setDescuentoMonto(pedido.descuento_global_monto || 0)
    }
  }, [isOpen, pedido?.id])

  const totales = useMemo(
    () => calcularTotalesSunat(lineas, descuentoMonto),
    [lineas, descuentoMonto]
  )

  const montoNeto = useMemo(
    () => Number((totales.total - detraccionMonto).toFixed(2)),
    [totales.total, detraccionMonto]
  )

  // Pre-fill cuenta BN desde configuración de empresa cuando se activa detracción
  useEffect(() => {
    if (tipoOperacion === '1001' && companyConfig?.detraccion_cuenta_bn) {
      setDetraccionCuentaBn(
        (prev) => prev || companyConfig.detraccion_cuenta_bn || ''
      )
    }
  }, [tipoOperacion, companyConfig?.detraccion_cuenta_bn])

  // Auto-calcular monto de detracción cuando cambia el total o el porcentaje
  useEffect(() => {
    if (tipoOperacion === '1001' && detraccionPorcentaje > 0) {
      setDetraccionMonto(
        Number((totales.total * (detraccionPorcentaje / 100)).toFixed(2))
      )
    }
  }, [totales.total, detraccionPorcentaje, tipoOperacion])

  // Re-distribuir cuotas al cambiar parámetros
  useEffect(() => {
    if (formaPago !== 'Credito' || montoNeto <= 0) return
    const fechaHoy = new Date().toISOString().split('T')[0]
    setCuotas(distribuirCuotas(montoNeto, numeroCuotas, fechaHoy, intervaloDias))
  }, [formaPago, numeroCuotas, intervaloDias, montoNeto])

  // Reset al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setTipoOperacion('0101')
      setDetraccionCodBien('')
      setDetraccionCodMedioPago('001')
      setDetraccionPorcentaje(0)
      setDetraccionMonto(0)
      setDetraccionCuentaBn('')
      setFormaPago('Contado')
      setCuotas([])
      setNumeroCuotas(1)
      setIntervaloDias(30)
      setHasUnsavedChanges(false)
    }
  }, [isOpen])

  // Marcar cambios cuando se modifica cualquier campo
  useEffect(() => {
    if (isOpen && pedidoLineasData) {
      setHasUnsavedChanges(true)
    }
  }, [tipoDocCodigo, direccionFacturacion, descuentoMonto, descuentoCodigo, tipoOperacion, detraccionCodBien, detraccionPorcentaje, detraccionCuentaBn, lineas])

  const handleFormaPagoChange = (tipo: 'Contado' | 'Credito') => {
    setFormaPago(tipo)
    if (tipo === 'Contado') setCuotas([])
  }

  const updateCuota = (id: string, patch: Partial<Omit<CuotaCredito, 'id'>>) => {
    setCuotas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const handleNumeroCuotasChange = (n: number) => setNumeroCuotas(Math.max(1, n))
  const handleIntervaloDiasChange = (d: number) => setIntervaloDias(Math.max(1, d))

  if (!isOpen || !pedido) return null

  const cot = pedido.cotizaciones
  const cliente = pedido?.clientes
  const clienteName = cliente
    ? getClientDisplayName(cliente)
    : 'Cliente desconocido'

  const proximo = serie ? serie.correlativo_actual + 1 : null
  const previewSerie =
    serie && proximo
      ? `${serie.serie}-${proximo.toString().padStart(8, '0')}`
      : null

  const handleVerSustento = () => {
    sustentoMutation.mutate(pedido.sustento_url, {
      onSuccess: (url) => window.open(url, '_blank'),
      onError: () => toast.error('No se pudo abrir el sustento')
    })
  }

  const updateUnidad = (idx: number, value: string) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, unidad_sunat: value } : l))
    )
  }

  const updateAfectacion = (idx: number, value: string) => {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              afectacion_igv: value,
              ...calcularLineaSunat(
                l.precio_unitario,
                l.cantidad,
                value,
                l.descuento_linea_monto ?? 0
              )
            }
          : l
      )
    )
  }

  const updateDescuento = (idx: number, value: number) => {
    const monto = Math.max(0, value)
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              descuento_linea_monto: monto,
              ...calcularLineaSunat(
                l.precio_unitario,
                l.cantidad,
                l.afectacion_igv,
                monto
              )
            }
          : l
      )
    )
  }

  const handleSubmit = async () => {
    const fechaHoy = new Date().toISOString().split('T')[0]

    const validationError = validateNuevaFactura({
      clienteId: cliente?.id ?? null,
      lineas: lineas.map(l => ({
        _id: l.id,
        producto_id: l.producto_id,
        sku: l.sku,
        nombre_producto: l.nombre_producto_historico,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        unidad_sunat: l.unidad_sunat,
        afectacion_igv: l.afectacion_igv,
        descuento_linea_monto: l.descuento_linea_monto ?? 0,
        mto_valor_unitario: l.mto_valor_unitario,
        mto_base_igv: l.mto_base_igv,
        mto_igv: l.mto_igv,
        subtotal: l.subtotal,
      })),
      serie,
      tipoOperacion,
      detraccion: tipoOperacion === '1001' ? {
        cod_bien: detraccionCodBien,
        porcentaje: detraccionPorcentaje,
        cuenta_bn: detraccionCuentaBn,
      } : undefined,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (formaPago === 'Credito') {
      const cuotasError = validateCuotas(cuotas, montoNeto, fechaHoy)
      if (cuotasError) {
        toast.error(cuotasError)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const comprobanteId = await emitirComprobante.mutateAsync({
        pedido_id: pedido.id,
        tipo_doc_codigo: tipoDocCodigo,
        cliente_id: pedido.cliente_id,
        fecha_emision: fechaHoy,
        subtotal: totales.subtotal,
        igv_monto: totales.igv,
        total: totales.total,
        lineas: lineas.map((l) => ({
          producto_id: l.producto_id,
          sku: l.sku,
          nombre_producto: l.nombre_producto_historico,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          mto_valor_unitario: l.mto_valor_unitario,
          mto_base_igv: l.mto_base_igv,
          mto_igv: l.mto_igv,
          subtotal: l.subtotal,
          unidad_sunat: l.unidad_sunat,
          afectacion_igv: l.afectacion_igv,
          descuento_linea_monto: l.descuento_linea_monto ?? 0
        })),
        direccion_facturacion: direccionFacturacion.trim() || undefined,
        descuento_global_monto: totales.descuentoMonto,
        descuento_global_codigo: descuentoCodigo,
        tipo_operacion: tipoOperacion,
        detraccion:
          tipoOperacion === '1001'
            ? {
                cod_bien: detraccionCodBien,
                cod_medio_pago: detraccionCodMedioPago,
                porcentaje: detraccionPorcentaje,
                monto: detraccionMonto,
                cuenta_bn: detraccionCuentaBn
              }
            : undefined,
        forma_pago: formaPago,
        cuotas: formaPago === 'Credito' ? cuotas.map((c) => ({ monto: c.monto, fecha: c.fecha })) : undefined,
      })

      // Enviar a SUNAT via API Route interna (no-fatal: el comprobante ya está en BD)
      try {
        const sunatResult = await enviarASunatHook.mutateAsync(comprobanteId)
        if (sunatResult.success) {
          toast.success(
            `Comprobante ${sunatResult.serie_numero} aceptado por SUNAT ✓`
          )
        } else {
          toast.warning(
            `Comprobante registrado pero SUNAT respondió: ${sunatResult.error || 'Error desconocido'}`
          )
        }
      } catch {
        toast.warning(
          'Comprobante registrado. El envío a SUNAT falló — puede reintentar desde la bandeja.'
        )
      }

      setHasUnsavedChanges(false)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al emitir el comprobante'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      if (confirm('Tenés cambios sin guardar. ¿Estás seguro que querés cerrar?')) {
        setHasUnsavedChanges(false)
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
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
            <iconify-icon
              icon="solar:bill-list-linear"
              class="text-[#10B981] text-xl"
            ></iconify-icon>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">
                Emitir Comprobante Electrónico
              </p>
              <p className="text-xs text-[#94A3B8]">
                PED-{pedido.numero_pedido}
                {cot ? ` • COT-${cot.numero_correlativo}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors"
          >
            <iconify-icon
              icon="solar:close-linear"
              class="text-lg"
            ></iconify-icon>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
          {/* Header visual del pedido */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <iconify-icon icon="solar:document-linear" class="text-blue-400 text-base"></iconify-icon>
              <p className="text-xs text-blue-400 font-semibold">Emitiendo comprobante para:</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">PED-{pedido.numero_pedido} · {clienteName}</p>
                <div className="flex gap-3 mt-0.5">
                  {pedido.nro_oc_cliente && (
                    <p className="text-xs text-blue-300">OC: {pedido.nro_oc_cliente}</p>
                  )}
                  {cot && (
                    <p className="text-xs text-blue-300">COT-{cot.numero_correlativo}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-blue-400">Total pedido</p>
                <p className="text-sm font-bold text-white">{formatCurrency(pedido.total_final ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* Resumen cliente */}
          <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Cliente</p>
                <p className="text-sm font-medium text-[#E2E8F0] truncate">
                  {clienteName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#94A3B8]">Total pedido</p>
                <p className="text-sm font-semibold text-[#E2E8F0]">
                  {formatCurrency(pedido.total_final ?? 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {cliente?.numero_documento && (
                <p className="text-xs text-[#94A3B8]">
                  {cliente.tipo_documento?.toUpperCase()}:{' '}
                  <span className="text-[#E2E8F0]">
                    {cliente.numero_documento}
                  </span>
                </p>
              )}
              {pedido.nro_oc_cliente && (
                <p className="text-xs text-[#94A3B8]">
                  OC:{' '}
                  <span className="text-[#E2E8F0]">
                    {pedido.nro_oc_cliente}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Sustento */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#E2E8F0]">
              Sustento de Aprobación
            </p>
            <button
              onClick={handleVerSustento}
              disabled={sustentoMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {sustentoMutation.isPending ? (
                <iconify-icon
                  icon="solar:spinner-linear"
                  class="animate-spin text-base"
                ></iconify-icon>
              ) : (
                <iconify-icon
                  icon="solar:eye-linear"
                  class="text-base"
                ></iconify-icon>
              )}
              {pedido.sustento_nombre || 'Ver sustento'}
            </button>
          </div>

          {/* Tipo comprobante + preview serie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Tipo de Comprobante <span className="text-red-400">*</span>
              </label>
              {loadingCatalogos ? (
                <div className="h-10 bg-[#334155]/30 rounded-md animate-pulse" />
              ) : (
                <div
                  className={`grid gap-2`}
                  style={{
                    gridTemplateColumns: `repeat(${tiposComprobante.length}, 1fr)`
                  }}
                >
                  {tiposComprobante.map((tipo) => (
                    <button
                      key={tipo.codigo}
                      onClick={() => setTipoDocCodigo(tipo.codigo)}
                      className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
                        tipoDocCodigo === tipo.codigo
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                          : 'border-[#334155] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-[#E2E8F0]'
                      }`}
                    >
                      {tipo.descripcion} ({tipo.codigo === '01' ? 'RUC' : 'DNI'}
                      )
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Número a Emitir (vista previa)
              </label>
              <div className="flex items-center h-10 px-3 rounded-md border border-[#334155] bg-[#0F1115]">
                {loadingSerie ? (
                  <iconify-icon
                    icon="solar:spinner-linear"
                    class="animate-spin text-sm text-[#94A3B8]"
                  ></iconify-icon>
                ) : previewSerie ? (
                  <span className="text-sm font-mono font-semibold text-[#10B981]">
                    {previewSerie}
                  </span>
                ) : (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <iconify-icon
                      icon="solar:danger-triangle-linear"
                      class="text-sm"
                    ></iconify-icon>
                    Sin serie configurada
                  </span>
                )}
              </div>
              {tipoDocCodigo === '03' && (
                <p className="mt-1 text-[10px] text-[#94A3B8]">
                  Las boletas se validan en el resumen diario nocturno de SUNAT.
                </p>
              )}
            </div>
          </div>

          {/* Tipo de Operación (Cat. 51) */}
          {tiposOperacion.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Tipo de Operación{' '}
                <span className="text-[#94A3B8] font-normal">
                  (Catálogo 51 SUNAT)
                </span>
              </label>
              <select
                value={tipoOperacion}
                onChange={(e) => setTipoOperacion(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
              >
                {tiposOperacion.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.codigo} – {t.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sección Detracción — visible solo cuando tipo = 1001 */}
          {tipoOperacion === '1001' && (
            <DetraccionPanel
              bienesDetraccion={bienesDetraccion}
              codBien={detraccionCodBien}
              onCodBienChange={setDetraccionCodBien}
              porcentaje={detraccionPorcentaje}
              onPorcentajeChange={setDetraccionPorcentaje}
              monto={detraccionMonto}
              onMontoChange={setDetraccionMonto}
              cuentaBn={detraccionCuentaBn}
              onCuentaBnChange={setDetraccionCuentaBn}
              codMedioPago={detraccionCodMedioPago}
              onCodMedioPagoChange={setDetraccionCodMedioPago}
            />
          )}

          {/* Forma de Pago */}
          <FormaPagoPanel
            formaPago={formaPago}
            onFormaPagoChange={handleFormaPagoChange}
            cuotas={cuotas}
            onCuotaChange={updateCuota}
            numeroCuotas={numeroCuotas}
            onNumeroCuotasChange={handleNumeroCuotasChange}
            intervaloDias={intervaloDias}
            onIntervaloDiasChange={handleIntervaloDiasChange}
            montoNeto={montoNeto}
          />

          {/* Dirección de facturación */}
          <div>
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Dirección de Facturación{' '}
              <span className="text-[#94A3B8] font-normal">
                (si difiere del cliente)
              </span>
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
              <span className="text-[#94A3B8] font-normal ml-1">
                (revisa unidad y afectación IGV)
              </span>
            </p>

            {loadingLineas && (
              <div className="flex items-center gap-2 py-4 text-xs text-[#94A3B8]">
                <iconify-icon
                  icon="solar:spinner-linear"
                  class="animate-spin text-base text-[#3B82F6]"
                ></iconify-icon>
                Cargando líneas...
              </div>
            )}

            {!loadingLineas && lineas.length === 0 && (
              <div className="p-4 border border-dashed border-yellow-500/40 bg-yellow-500/5 rounded-lg">
                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <iconify-icon
                    icon="solar:danger-triangle-linear"
                    class="text-sm shrink-0"
                  ></iconify-icon>
                  No se encontraron líneas para este pedido. Esto ocurre con
                  pedidos creados antes de la actualización. El comprobante se
                  emitirá sin detalle de líneas.
                </p>
              </div>
            )}

            {!loadingLineas && lineas.length > 0 && (
              <div className="border border-[#334155] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-[#0F1115]">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">
                        Producto
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-16 text-center">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-28 text-right">
                        P. Unit (Base)
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-32">
                        Unidad
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-36">
                        Afect. IGV
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-right">
                        IGV
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-right">
                        Subtotal
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-[70px] text-right">
                        Desc.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {lineas.map((l, idx) => (
                      <tr key={l.id ?? idx} className="bg-[#181B21]">
                        <td className="px-3 py-2 text-xs text-[#E2E8F0]">
                          {l.nombre_producto_historico}
                        </td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-center">
                          {l.cantidad}
                        </td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-right">
                          {formatCurrency(l.precio_unitario)}
                        </td>
                        <td className="px-3 py-2">
                          {loadingUnidades ? (
                            <div className="h-6 bg-[#334155]/30 rounded animate-pulse" />
                          ) : (
                            <select
                              value={l.unidad_sunat}
                              onChange={(e) =>
                                updateUnidad(idx, e.target.value)
                              }
                              className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                            >
                              {unidades.map((u) => (
                                <option key={u.codigo} value={u.codigo}>
                                  {u.codigo} – {u.descripcion}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {loadingAfectaciones ? (
                            <div className="h-6 bg-[#334155]/30 rounded animate-pulse" />
                          ) : (
                            <select
                              value={l.afectacion_igv}
                              onChange={(e) =>
                                updateAfectacion(idx, e.target.value)
                              }
                              className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                            >
                              {afectaciones.map((a) => (
                                <option key={a.codigo} value={a.codigo}>
                                  {a.codigo} – {a.descripcion}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-right">
                          {formatCurrency(l.mto_igv)}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-[#E2E8F0] text-right">
                          {formatCurrency(l.subtotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.descuento_linea_monto ?? 0}
                            onChange={(e) =>
                              updateDescuento(
                                idx,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-[70px] bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-xs text-red-400 text-right focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Descuento Global Selector */}
          {lineas.length > 0 && pedido.descuento_global_monto > 0 && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-blue-400">
                  Tipo de Descuento (SUNAT Cat. 53)
                </label>
                <span className="text-xs font-semibold text-[#E2E8F0]">
                  {formatCurrency(descuentoMonto)}
                </span>
              </div>
              <select
                value={descuentoCodigo}
                onChange={(e) => setDescuentoCodigo(e.target.value)}
                className="w-full bg-[#0F1115] border border-blue-500/30 rounded px-2 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              >
                {descuentosSunat.map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.codigo} – {d.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Totales + leyenda */}
          {lineas.length > 0 && (
            <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">Suma de Ítems</span>
                <span className="text-[#E2E8F0]">
                  {formatCurrency(totales.subtotal)}
                </span>
              </div>
              {(() => {
                const totalDescLineas = lineas.reduce(
                  (sum, l) => sum + (l.descuento_linea_monto ?? 0),
                  0
                )
                if (totalDescLineas > 0) {
                  return (
                    <div className="flex justify-between text-xs text-red-400">
                      <span>Desc. por Línea</span>
                      <span>- {formatCurrency(totalDescLineas)}</span>
                    </div>
                  )
                }
                return null
              })()}
              {totales.descuentoMonto > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Descuento Aplicado</span>
                  <span>- {formatCurrency(totales.descuentoMonto)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-medium pt-1 border-t border-[#334155]/50">
                <span className="text-[#94A3B8]">
                  Subtotal (Base Imponible)
                </span>
                <span className="text-[#E2E8F0]">
                  {formatCurrency(totales.mto_oper_gravadas)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#94A3B8]">Nuevo IGV (18%)</span>
                <span className="text-[#E2E8F0]">
                  {formatCurrency(totales.igv)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-[#334155] pt-2">
                <span className="text-[#E2E8F0]">Total Final</span>
                <span className="text-[#10B981]">
                  {formatCurrency(totales.total)}
                </span>
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
            disabled={isSubmitting || !serie || (formaPago === 'Credito' && validateCuotas(cuotas, montoNeto, new Date().toISOString().split('T')[0]) !== null)}
            className="flex-1 bg-[#10B981] text-white text-sm font-medium py-2.5 rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <iconify-icon
                  icon="solar:spinner-linear"
                  class="animate-spin text-base"
                ></iconify-icon>
                Emitiendo...
              </>
            ) : (
              <>
                <iconify-icon
                  icon="solar:bill-list-linear"
                  class="text-base"
                ></iconify-icon>
                Emitir Comprobante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
