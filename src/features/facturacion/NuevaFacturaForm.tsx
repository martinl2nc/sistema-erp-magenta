'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

import { useNuevaFacturaState } from '@/features/facturacion/useNuevaFacturaState'
import {
  useEmitirComprobante,
  useEnviarASunat,
  useSerieByTipoDoc
} from '@/hooks/useFacturas'
import {
  useUnidadesMedida,
  useAfectacionesIgv,
  useTiposOperacion,
  useBienesDetraccion,
  useCargosDescuentos
} from '@/hooks/useCatalogos'
import { formatCurrency, getClientDisplayName } from '@/utils/formatters'
import { TAX_RATES } from '@/constants'
import { validateNuevaFactura } from '@/features/facturacion/nuevaFactura.utils'
import type { Client } from '@/services/clients.service'

interface Props {
  initialClients: Client[]
}

export default function NuevaFacturaForm({ initialClients }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // State hook
  const state = useNuevaFacturaState(initialClients)

  // Catálogos para selects en el formulario
  const { data: unidades = [], isLoading: loadingUnidades } =
    useUnidadesMedida()
  const { data: afectaciones = [] } = useAfectacionesIgv()
  const { data: tiposOperacion = [] } = useTiposOperacion()
  const { data: bienesDetraccion = [] } = useBienesDetraccion()
  const { data: cargosDescuentos = [] } = useCargosDescuentos()

  const descuentosSunat = useMemo(
    () => cargosDescuentos.filter((c) => c.tipo === 'descuento'),
    [cargosDescuentos]
  )

  // Serie preview
  const { data: serie, isLoading: loadingSerie } = useSerieByTipoDoc(
    state.tipoDocCodigo
  )
  const proximo = serie ? serie.correlativo_actual + 1 : null
  const previewSerie =
    serie && proximo
      ? `${serie.serie}-${proximo.toString().padStart(8, '0')}`
      : null

  // Mutations
  const emitirComprobante = useEmitirComprobante()
  const enviarASunat = useEnviarASunat()

  // Clientes filtrados para selector standalone
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return initialClients.slice(0, 20)
    const q = clientSearch.toLowerCase()
    return initialClients
      .filter(
        (c) =>
          getClientDisplayName(c).toLowerCase().includes(q) ||
          c.numero_documento?.includes(q)
      )
      .slice(0, 20)
  }, [initialClients, clientSearch])

  // ─── Submit ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    const error = validateNuevaFactura({
      clienteId: state.selectedClienteId,
      lineas: state.lineas,
      serie,
      tipoOperacion: state.tipoOperacion,
      detraccion:
        state.tipoOperacion === '1001'
          ? {
              cod_bien: state.detraccionCodBien,
              porcentaje: state.detraccionPorcentaje,
              cuenta_bn: state.detraccionCuentaBn
            }
          : undefined
    })
    if (error) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    setIsSubmitting(true)
    try {
      const fechaHoy = new Date().toISOString().split('T')[0]

      const comprobanteId = await emitirComprobante.mutateAsync({
        pedido_id: state.selectedPedidoId,
        tipo_doc_codigo: state.tipoDocCodigo,
        cliente_id: state.selectedClienteId!,
        fecha_emision: fechaHoy,
        subtotal: state.totales.subtotal,
        igv_monto: state.totales.igv,
        total: state.totales.total,
        lineas: state.lineas.map((l) => ({
          producto_id: l.producto_id,
          sku: l.sku,
          nombre_producto: l.nombre_producto,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          mto_valor_unitario: l.mto_valor_unitario,
          mto_base_igv: l.mto_base_igv,
          mto_igv: l.mto_igv,
          subtotal: l.subtotal,
          unidad_sunat: l.unidad_sunat,
          afectacion_igv: l.afectacion_igv,
          descuento_linea_monto: l.descuento_linea_monto
        })),
        direccion_facturacion: state.direccionFacturacion.trim() || undefined,
        descuento_global_monto: state.descuentoMonto,
        descuento_global_codigo: state.descuentoCodigo,
        tipo_operacion: state.tipoOperacion,
        detraccion:
          state.tipoOperacion === '1001'
            ? {
                cod_bien: state.detraccionCodBien,
                cod_medio_pago: state.detraccionCodMedioPago,
                porcentaje: state.detraccionPorcentaje,
                monto: state.detraccionMonto,
                cuenta_bn: state.detraccionCuentaBn
              }
            : undefined
      })

      try {
        const sunatResult = await enviarASunat.mutateAsync(comprobanteId)
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

      router.push('/facturacion')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al emitir el comprobante'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  const isPedidoMode = !!state.selectedPedidoId
  const pedidoCliente = state.selectedPedido?.clientes

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      {/* Header */}
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/facturacion"
            className="flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
          >
            <iconify-icon
              icon="solar:arrow-left-linear"
              class="text-base"
            ></iconify-icon>
            Facturación
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-sm font-medium text-[#E2E8F0]">
            Nueva Factura
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {validationError && (
            <p className="text-sm text-[#EF4444]">{validationError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <iconify-icon
                icon="solar:spinner-linear"
                class="animate-spin text-base"
              ></iconify-icon>
            ) : (
              <iconify-icon
                icon="solar:bill-list-linear"
                class="text-base"
              ></iconify-icon>
            )}
            Emitir Comprobante
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ── Selector de Pedido ──────────────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#E2E8F0]">
                Pedido vinculado
                <span className="ml-1.5 text-xs text-[#94A3B8] font-normal">
                  (opcional)
                </span>
              </p>
              {state.selectedPedidoId && (
                <button
                  onClick={() => state.handlePedidoSelect(null)}
                  className="text-xs text-[#94A3B8] hover:text-[#E2E8F0] flex items-center gap-1 transition-colors"
                >
                  <iconify-icon
                    icon="solar:close-linear"
                    class="text-sm"
                  ></iconify-icon>
                  Limpiar
                </button>
              )}
            </div>
            <select
              value={state.selectedPedidoId ?? ''}
              onChange={(e) => state.handlePedidoSelect(e.target.value || null)}
              className="w-full bg-[#0F1115] border border-[#334155] rounded-lg py-2.5 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
            >
              <option value="">— Sin pedido vinculado —</option>
              {state.pendingPedidos.map((p) => (
                <option key={p.id} value={p.id}>
                  PED-{p.numero_pedido}
                  {p.clientes ? ` · ${getClientDisplayName(p.clientes)}` : ''}
                  {p.nro_oc_cliente ? ` · OC: ${p.nro_oc_cliente}` : ''}
                </option>
              ))}
            </select>
            {state.pendingPedidos.length === 0 && (
              <p className="text-xs text-[#64748B]">
                No hay pedidos pendientes de facturación.
              </p>
            )}
          </section>

          {/* ── Cliente ─────────────────────────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-[#E2E8F0]">Cliente</p>

            {isPedidoMode && pedidoCliente ? (
              /* Pedido seleccionado → cliente read-only */
              <div className="p-3 bg-[#0F1115] border border-[#334155] rounded-lg space-y-1">
                <p className="text-sm font-medium text-[#E2E8F0]">
                  {getClientDisplayName(pedidoCliente)}
                </p>
                {pedidoCliente.numero_documento && (
                  <p className="text-xs text-[#94A3B8]">
                    {pedidoCliente.tipo_documento?.toUpperCase()}:{' '}
                    {pedidoCliente.numero_documento}
                  </p>
                )}
              </div>
            ) : (
              /* Standalone → selector con búsqueda */
              <div className="space-y-2">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar por nombre o documento..."
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-lg py-2.5 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
                />
                <select
                  value={state.selectedClienteId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    const client =
                      initialClients.find((c) => c.id === id) ?? null
                    state.handleClienteSelect(id, client)
                  }}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-lg py-2.5 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
                >
                  <option value="">— Seleccioná un cliente —</option>
                  {filteredClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getClientDisplayName(c)}
                      {c.numero_documento ? ` · ${c.numero_documento}` : ''}
                    </option>
                  ))}
                </select>
                {state.selectedClient && (
                  <div className="p-2 bg-[#0F1115] border border-[#334155] rounded-lg">
                    <p className="text-xs text-[#94A3B8]">
                      {state.selectedClient.tipo_documento?.toUpperCase()}:{' '}
                      {state.selectedClient.numero_documento || '—'}
                      {state.selectedClient.email
                        ? ` · ${state.selectedClient.email}`
                        : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Tipo Comprobante + Serie ─────────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                  Tipo de Comprobante <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { codigo: '01', label: 'Factura (RUC)' },
                    { codigo: '03', label: 'Boleta (DNI)' }
                  ].map((t) => (
                    <button
                      key={t.codigo}
                      type="button"
                      onClick={() => state.setTipoDocCodigo(t.codigo)}
                      className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
                        state.tipoDocCodigo === t.codigo
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                          : 'border-[#334155] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-[#E2E8F0]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
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
                {state.tipoDocCodigo === '03' && (
                  <p className="mt-1 text-[10px] text-[#94A3B8]">
                    Las boletas se validan en el resumen diario nocturno de
                    SUNAT.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Tipo de Operación ────────────────────────────── */}
          {tiposOperacion.length > 0 && (
            <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5">
              <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                Tipo de Operación
                <span className="ml-1 text-[#94A3B8] font-normal">
                  (Catálogo 51 SUNAT)
                </span>
              </label>
              <select
                value={state.tipoOperacion}
                onChange={(e) => state.setTipoOperacion(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
              >
                {tiposOperacion.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.codigo} – {t.descripcion}
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* ── Detracción (solo cuando tipo = 1001) ─────────── */}
          {state.tipoOperacion === '1001' && (
            <section className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
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
                    value={state.detraccionCodBien}
                    onChange={(e) => state.setDetraccionCodBien(e.target.value)}
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
                    min="0"
                    max="100"
                    step="0.01"
                    value={state.detraccionPorcentaje}
                    onChange={(e) =>
                      state.setDetraccionPorcentaje(
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                    Monto Detracción
                    <span className="ml-1 text-[#64748B] font-normal">
                      (auto-calculado)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={state.detraccionMonto}
                    onChange={(e) =>
                      state.setDetraccionMonto(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-amber-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                    Cuenta Banco de la Nación{' '}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={state.detraccionCuentaBn}
                    onChange={(e) =>
                      state.setDetraccionCuentaBn(e.target.value)
                    }
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
                  value={state.detraccionCodMedioPago}
                  onChange={(e) =>
                    state.setDetraccionCodMedioPago(e.target.value)
                  }
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                >
                  <option value="001">001 – Depósito en cuenta</option>
                  <option value="002">002 – Giro</option>
                  <option value="003">003 – Transferencia de fondos</option>
                </select>
              </div>
            </section>
          )}

          {/* ── Dirección de Facturación ─────────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5">
            <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
              Dirección de Facturación
              <span className="ml-1 text-[#94A3B8] font-normal">
                (si difiere del cliente)
              </span>
            </label>
            <input
              type="text"
              value={state.direccionFacturacion}
              onChange={(e) => state.setDireccionFacturacion(e.target.value)}
              placeholder="Av. Ejemplo 123, Lima"
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
            />
          </section>

          {/* ── Líneas del Comprobante ───────────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#E2E8F0]">
                Líneas del Comprobante
              </p>
              <button
                type="button"
                onClick={state.addLinea}
                className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-emerald-400 border border-[#10B981]/30 hover:border-emerald-400/50 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <iconify-icon
                  icon="solar:add-circle-linear"
                  class="text-sm"
                ></iconify-icon>
                Agregar línea
              </button>
            </div>

            {state.loadingLineas && (
              <div className="flex items-center gap-2 py-4 text-xs text-[#94A3B8]">
                <iconify-icon
                  icon="solar:spinner-linear"
                  class="animate-spin text-base text-[#3B82F6]"
                ></iconify-icon>
                Cargando líneas del pedido...
              </div>
            )}

            {!state.loadingLineas && state.lineas.length === 0 && (
              <div className="p-6 border border-dashed border-[#334155] rounded-lg text-center">
                <p className="text-sm text-[#64748B]">
                  No hay líneas. Seleccioná un pedido o agregá líneas
                  manualmente.
                </p>
              </div>
            )}

            {state.lineas.length > 0 && (
              <div className="border border-[#334155] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-[#0F1115]">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase">
                        Producto / Descripción
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-16 text-center">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-24 text-right">
                        P. Unit.
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-28">
                        Unidad
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-32">
                        Afect. IGV
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-20 text-right">
                        Subtotal
                      </th>
                      <th className="px-3 py-2 text-[10px] font-medium text-[#94A3B8] uppercase w-20 text-right">
                        Desc.
                      </th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {state.lineas.map((l, idx) => (
                      <tr key={l._id} className="bg-[#181B21]">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={l.nombre_producto}
                            onChange={(e) =>
                              state.updateLinea(idx, {
                                nombre_producto: e.target.value
                              })
                            }
                            placeholder="Descripción del producto"
                            className="w-full bg-transparent text-xs text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] rounded px-1 py-0.5"
                          />
                          {l.sku && (
                            <p className="text-[10px] text-[#64748B] px-1">
                              {l.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={l.cantidad}
                            onChange={(e) =>
                              state.updateLinea(idx, {
                                cantidad: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-xs text-[#E2E8F0] text-center focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.precio_unitario}
                            onChange={(e) =>
                              state.updateLinea(idx, {
                                precio_unitario: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-xs text-[#E2E8F0] text-right focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {loadingUnidades ? (
                            <div className="h-6 bg-[#334155]/30 rounded animate-pulse" />
                          ) : (
                            <select
                              value={l.unidad_sunat}
                              onChange={(e) =>
                                state.updateLinea(idx, {
                                  unidad_sunat: e.target.value
                                })
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
                          <select
                            value={l.afectacion_igv}
                            onChange={(e) =>
                              state.updateLinea(idx, {
                                afectacion_igv: e.target.value
                              })
                            }
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          >
                            {afectaciones.map((a) => (
                              <option key={a.codigo} value={a.codigo}>
                                {a.codigo} – {a.descripcion}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#94A3B8] text-right">
                          {formatCurrency(l.subtotal)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.descuento_linea_monto}
                            onChange={(e) =>
                              state.updateLinea(idx, {
                                descuento_linea_monto:
                                  parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-[#0F1115] border border-[#334155] rounded px-1.5 py-1 text-xs text-[#E2E8F0] text-right focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => state.removeLinea(idx)}
                            className="p-1 text-[#64748B] hover:text-red-400 transition-colors"
                            title="Eliminar línea"
                          >
                            <iconify-icon
                              icon="solar:trash-bin-minimalistic-linear"
                              class="text-sm"
                            ></iconify-icon>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Descuento Global + Totales ───────────────────── */}
          <section className="bg-[#181B21] border border-[#334155] rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#E2E8F0] mb-1.5">
                  Descuento Global
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={state.descuentoMonto}
                    onChange={(e) =>
                      state.setDescuentoMonto(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="flex-1 bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
                  />
                  {descuentosSunat.length > 0 && (
                    <select
                      value={state.descuentoCodigo}
                      onChange={(e) => state.setDescuentoCodigo(e.target.value)}
                      className="bg-[#0F1115] border border-[#334155] rounded-md py-2 px-2 text-xs text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-colors"
                    >
                      {descuentosSunat.map((d) => (
                        <option key={d.codigo} value={d.codigo}>
                          {d.codigo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="border-t border-[#334155] pt-4 space-y-2">
              <div className="flex justify-between text-xs text-[#94A3B8]">
                <span>Subtotal (sin IGV)</span>
                <span>{formatCurrency(state.totales.subtotal)}</span>
              </div>
              {state.descuentoMonto > 0 && (
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>Descuento global</span>
                  <span className="text-red-400">
                    - {formatCurrency(state.descuentoMonto)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#94A3B8]">
                <span>IGV ({TAX_RATES.IGV * 100}%)</span>
                <span>{formatCurrency(state.totales.igv)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#E2E8F0] pt-1 border-t border-[#334155]">
                <span>Total</span>
                <span className="text-[#10B981]">
                  {formatCurrency(state.totales.total)}
                </span>
              </div>
            </div>
          </section>

          {/* ── Botón submit mobile + error de validación ──── */}
          <div className="sm:hidden pb-6 space-y-3">
            {validationError && (
              <p className="text-sm text-[#EF4444] text-center">
                {validationError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <iconify-icon
                  icon="solar:spinner-linear"
                  class="animate-spin text-base"
                ></iconify-icon>
              ) : (
                <iconify-icon
                  icon="solar:bill-list-linear"
                  class="text-base"
                ></iconify-icon>
              )}
              Emitir Comprobante
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
