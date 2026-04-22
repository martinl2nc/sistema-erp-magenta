'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash2, Upload } from 'lucide-react'
import { useActiveProveedoresList } from '@/hooks/useProveedores'
import { useCategoriasGasto, useEditarCompraCompleto, useDetallesCompra, useEditarCompra } from '@/hooks/useCompras'
import type { EditarCompraCompletoPayload, ComprobanteCompra } from '@/services/compras.service'
import { TAX_RATES, DETRACCION_THRESHOLD_PEN } from '@/constants'
import { formatCurrency } from '@/utils/formatters'
import { calcLineaCompra, calcTotalesCompra, roundToDecimal } from '@/utils/calculations'

// ─── Types ───────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  comprobante: ComprobanteCompra | null
  onSuccess?: () => void
}

interface LineaCompraEditable {
  _id: string
  descripcion: string
  cod_producto_proveedor: string
  unidad_codigo: string
  cantidad: number
  mto_precio_unitario: number
  mto_valor_unitario: number
  mto_valor_venta: number
  igv: number
  descuento: number
  total_impuestos: number
}

// ─── Helpers ─────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function calcLinea(
  mto_precio_unitario: number,
  cantidad: number,
  descuento: number
): Pick<LineaCompraEditable, 'mto_valor_unitario' | 'mto_valor_venta' | 'igv' | 'total_impuestos'> {
  return calcLineaCompra(mto_precio_unitario, cantidad, descuento)
}

function emptyLinea(): LineaCompraEditable {
  return {
    _id:                    crypto.randomUUID(),
    descripcion:            '',
    cod_producto_proveedor: '',
    unidad_codigo:          'NIU',
    cantidad:               1,
    mto_precio_unitario:    0,
    mto_valor_unitario:     0,
    mto_valor_venta:        0,
    igv:                    0,
    descuento:              0,
    total_impuestos:        0,
  }
}

// ─── Componente ──────────────────────────────────────────────

export default function EditarCompraModal({ isOpen, onClose, comprobante, onSuccess }: Props) {
  const isPaid = comprobante?.estado_pago !== 'pendiente';

  // ── Catálogos ────────────────────────────────────────────────
  const { data: proveedores = [] } = useActiveProveedoresList()
  const { data: categorias = []  } = useCategoriasGasto()
  const { mutateAsync: editarCompraCompleto, isPending: isEditandoCompleto } = useEditarCompraCompleto(comprobante?.id ?? '')
  const { mutateAsync: editarCompraSimple, isPending: isEditandoSimple } = useEditarCompra(comprobante?.id ?? '')
  const { data: detallesData, isFetching: isFetchingDetalles } = useDetallesCompra(comprobante?.id, isOpen)

  // ── State: cabecera ──────────────────────────────────────────
  const [proveedorId,       setProveedorId]       = useState('')
  const [categoriaGastoId,  setCategoriaGastoId]  = useState<string>('')
  const [tipoDocCodigo,     setTipoDocCodigo]     = useState('01')
  const [serie,             setSerie]             = useState('')
  const [correlativo,       setCorrelativo]       = useState('')
  const [fechaEmision,      setFechaEmision]      = useState(todayIso())
  const [fechaVencimiento,  setFechaVencimiento]  = useState('')
  const [moneda,            setMoneda]            = useState<'PEN' | 'USD'>('PEN')
  const [tipoCambio,        setTipoCambio]        = useState(1)
  const [formaPago,         setFormaPago]         = useState<'Contado' | 'Credito'>('Contado')

  // ── State: líneas ────────────────────────────────────────────
  const [lineas,           setLineas]           = useState<LineaCompraEditable[]>([])
  const [descuentoGlobal,  setDescuentoGlobal]  = useState(0)
  const [igvOverride,      setIgvOverride]      = useState<number | null>(null)

  // ── State: detracción ────────────────────────────────────────
  const [detraccionCodBien,     setDetraccionCodBien]     = useState('')
  const [detraccionPorcentaje,  setDetraccionPorcentaje]  = useState(0)
  const [detraccionMonto,       setDetraccionMonto]       = useState(0)

  // ── State: archivos ──────────────────────────────────────────
  const [archivoXml, setArchivoXml] = useState<File | null>(null)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const xmlInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // ── State: notas y submit ────────────────────────────────────
  const [notas,        setNotas]        = useState('')
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const isSubmitting = isEditandoCompleto || isEditandoSimple

  // ── Reset al cerrar / abrir ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !comprobante) return;
    setProveedorId(comprobante.proveedor_id);
    setCategoriaGastoId(comprobante.cat_categorias_gasto?.id ?? '');
    setTipoDocCodigo(comprobante.tipo_doc_codigo);
    setSerie(comprobante.serie);
    setCorrelativo(comprobante.correlativo);
    setFechaEmision(comprobante.fecha_emision);
    setFechaVencimiento(comprobante.fecha_vencimiento ?? '');
    setMoneda((comprobante.moneda as 'PEN' | 'USD') ?? 'PEN');
    setTipoCambio(comprobante.tipo_cambio);
    setFormaPago((comprobante.forma_pago as 'Contado' | 'Credito') ?? 'Contado');
    setDescuentoGlobal(comprobante.descuento_global_monto);
    setIgvOverride(null);
    setDetraccionCodBien(comprobante.detraccion_cod_bien ?? '');
    setDetraccionPorcentaje(comprobante.detraccion_porcentaje ?? 0);
    setDetraccionMonto(comprobante.detraccion_monto ?? 0);
    setNotas(comprobante.notas ?? '');
    setArchivoXml(null);
    setArchivoPdf(null);
    setSubmitError(null);

    // Mapear detalles cuando estén cargados
    if (detallesData && detallesData.length > 0) {
      setLineas(detallesData.map(d => ({
        _id: d.id,
        descripcion: d.descripcion,
        cod_producto_proveedor: d.cod_producto_proveedor ?? '',
        unidad_codigo: d.unidad_codigo ?? 'NIU',
        cantidad: d.cantidad,
        mto_precio_unitario: d.mto_precio_unitario,
        mto_valor_unitario: d.mto_valor_unitario,
        mto_valor_venta: d.mto_valor_venta,
        igv: d.igv,
        descuento: d.descuento,
        total_impuestos: d.total_impuestos,
      })));
    } else {
      setLineas([]);
    }
  }, [isOpen, comprobante, detallesData]);

  // ── Totales memoizados ───────────────────────────────────────
  const totales = useMemo(
    () => calcTotalesCompra(lineas, descuentoGlobal, igvOverride),
    [lineas, descuentoGlobal, igvOverride]
  )

  // ── Auto-calcular detracción cuando cambia total o porcentaje ─
  useEffect(() => {
    if (detraccionPorcentaje > 0) {
      setDetraccionMonto(roundToDecimal(totales.total * detraccionPorcentaje / 100))
    }
  }, [totales.total, detraccionPorcentaje])

  // ── Funciones de líneas ──────────────────────────────────────
  const addLinea = () => setLineas((prev) => [...prev, emptyLinea()])

  const removeLinea = (id: string) =>
    setLineas((prev) => prev.filter((l) => l._id !== id))

  const updateLinea = (id: string, field: keyof LineaCompraEditable, value: string | number) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l
        const updated = { ...l, [field]: value }
        if (field === 'mto_precio_unitario' || field === 'cantidad' || field === 'descuento') {
          const calcs = calcLinea(
            field === 'mto_precio_unitario' ? (value as number) : updated.mto_precio_unitario,
            field === 'cantidad'             ? (value as number) : updated.cantidad,
            field === 'descuento'            ? (value as number) : updated.descuento,
          )
          return { ...updated, ...calcs }
        }
        return updated
      })
    )
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validación
    const mostrarDetraccion = totales.total > DETRACCION_THRESHOLD_PEN && moneda === 'PEN'
    if (!proveedorId) {
      setSubmitError('Seleccioná un proveedor')
      return
    }
    if (lineas.length === 0 || lineas.every((l) => !l.descripcion.trim())) {
      setSubmitError('Agregá al menos una línea con descripción')
      return
    }
    if (!serie.trim()) {
      setSubmitError('Ingresá la serie del comprobante')
      return
    }
    if (!correlativo.trim()) {
      setSubmitError('Ingresá el correlativo del comprobante')
      return
    }
    if (!fechaEmision) {
      setSubmitError('Ingresá la fecha de emisión')
      return
    }
    if (mostrarDetraccion) {
      if (!detraccionCodBien.trim()) {
        setSubmitError('Ingresá el código de bien/servicio para la detracción')
        return
      }
      if (!detraccionPorcentaje) {
        setSubmitError('Ingresá el porcentaje de detracción')
        return
      }
    }

    setSubmitError(null)

    try {
      if (isPaid) {
        // Modo simple: Solo metadatos y archivos
        await editarCompraSimple({
          notas: notas.trim() || null,
          fecha_vencimiento: fechaVencimiento || null,
          categoria_gasto_id: categoriaGastoId || null,
          archivoPdf: archivoPdf ?? undefined,
          archivoXml: archivoXml ?? undefined,
        });
        toast.success('Metadatos del comprobante actualizados.');
        onSuccess?.();
        onClose();
        return;
      }

      // Modo completo
      const payload: EditarCompraCompletoPayload = {
        proveedor_id:           proveedorId,
        categoria_gasto_id:     categoriaGastoId || null,
        tipo_doc_codigo:        tipoDocCodigo,
        serie:                  serie.trim().toUpperCase(),
        correlativo:            correlativo.trim(),
        fecha_emision:          fechaEmision,
        fecha_vencimiento:      fechaVencimiento || null,
        moneda,
        tipo_cambio:            tipoCambio,
        forma_pago:             formaPago,
        mto_oper_gravadas:      totales.baseGravada,
        mto_oper_exoneradas:    0,
        mto_oper_inafectas:     0,
        mto_igv:                totales.mtoIgv,
        mto_isc:                0,
        icbper:                 0,
        total_impuestos:        totales.mtoIgv,
        valor_venta:            totales.baseGravada,
        subtotal:               totales.baseGravada,
        mto_imp_venta:          totales.total,
        descuento_global_monto: descuentoGlobal,
        detraccion_cod_bien:    mostrarDetraccion ? detraccionCodBien    : null,
        detraccion_porcentaje:  mostrarDetraccion ? detraccionPorcentaje : null,
        detraccion_monto:       mostrarDetraccion ? detraccionMonto      : null,
        notas:                  notas.trim() || null,
        detalles: lineas
          .filter((l) => l.descripcion.trim())
          .map(({ _id: _unused, ...l }) => ({
            cod_producto_proveedor: l.cod_producto_proveedor || undefined,
            unidad_codigo:          l.unidad_codigo || 'NIU',
            descripcion:            l.descripcion,
            cantidad:               l.cantidad,
            mto_valor_unitario:     l.mto_valor_unitario,
            mto_precio_unitario:    l.mto_precio_unitario,
            mto_valor_venta:        l.mto_valor_venta,
            mto_base_igv:           l.mto_valor_venta,
            porcentaje_igv:         TAX_RATES.IGV * 100,
            igv:                    l.igv,
            tip_afe_igv_codigo:     '10',
            descuento:              l.descuento,
            total_impuestos:        l.total_impuestos,
          })),
        archivoXml,
        archivoPdf,
      }

      const res = await editarCompraCompleto(payload)
      if (res.uploadFailed) {
        toast.warning('Comprobante actualizado, pero algunos archivos no se pudieron subir.')
      } else {
        toast.success('Comprobante actualizado correctamente.')
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el comprobante.')
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (!isOpen || !comprobante) return null

  const mostrarDetraccion = totales.total > DETRACCION_THRESHOLD_PEN && moneda === 'PEN'
  const disableFinancial = isPaid || isSubmitting

  const labelCls  = 'block text-xs font-medium text-[#E2E8F0] mb-1.5'
  const inputCls  = 'w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] transition-colors'
  const selectCls = inputCls

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] shrink-0">
          <p className="text-sm font-semibold text-[#E2E8F0]">Editar Comprobante de Compra {isPaid && <span className="ml-2 text-xs font-normal text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Solo metadatos (Pagado)</span>}</p>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 min-h-0">

          {/* S1: Proveedor y categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Proveedor <span className="text-red-400">*</span></label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                disabled={disableFinancial}
                className={`${selectCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razon_social ?? `${p.nombres_contacto} ${p.apellidos_contacto}`} ({p.numero_documento})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Categoría de gasto</label>
              <select
                value={categoriaGastoId}
                onChange={(e) => setCategoriaGastoId(e.target.value)}
                disabled={isSubmitting}
                className={selectCls}
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* S2: Datos del comprobante */}
          <div>
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Datos del comprobante</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tipo de documento <span className="text-red-400">*</span></label>
                <select
                  value={tipoDocCodigo}
                  onChange={(e) => setTipoDocCodigo(e.target.value)}
                  disabled={disableFinancial}
                  className={`${selectCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="01">Factura</option>
                  <option value="03">Boleta</option>
                  <option value="02">Recibo por Honorarios</option>
                  <option value="00">Otros</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Serie <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value.toUpperCase())}
                  disabled={disableFinancial}
                  className={`${inputCls} uppercase ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="F001"
                />
              </div>
              <div>
                <label className={labelCls}>Correlativo <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={correlativo}
                  onChange={(e) => setCorrelativo(e.target.value.replace(/\D/g, ''))}
                  disabled={disableFinancial}
                  className={`${inputCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="00000001"
                />
              </div>
              <div>
                <label className={labelCls}>Fecha de emisión <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  disabled={disableFinancial}
                  className={`${inputCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha de vencimiento</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  disabled={isSubmitting}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Moneda</label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value as 'PEN' | 'USD')}
                  disabled={disableFinancial}
                  className={`${selectCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="PEN">PEN – Soles</option>
                  <option value="USD">USD – Dólares</option>
                </select>
              </div>
              {moneda === 'USD' && (
                <div>
                  <label className={labelCls}>Tipo de cambio</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                    disabled={disableFinancial}
                    className={`${inputCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Forma de pago</label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as 'Contado' | 'Credito')}
                  disabled={disableFinancial}
                  className={`${selectCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="Contado">Contado</option>
                  <option value="Credito">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          {/* S3: Líneas de detalle */}
          <div>
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Líneas de detalle</p>
            {lineas.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">
                Agregá al menos una línea
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#64748B] border-b border-[#334155]">
                      <th className="text-left py-2 pr-2 font-medium min-w-[140px]">Descripción</th>
                      <th className="text-left py-2 pr-2 font-medium min-w-[90px]">Cód. Prov.</th>
                      <th className="text-left py-2 pr-2 font-medium min-w-[70px]">Unidad</th>
                      <th className="text-right py-2 pr-2 font-medium min-w-[60px]">Cant.</th>
                      <th className="text-right py-2 pr-2 font-medium min-w-[90px]">Precio c/IGV</th>
                      <th className="text-right py-2 pr-2 font-medium min-w-[70px]">IGV</th>
                      <th className="text-right py-2 pr-2 font-medium min-w-[80px]">Subtotal</th>
                      <th className="text-right py-2 pr-2 font-medium min-w-[70px]">Desc.</th>
                      <th className="py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/50">
                    {lineas.map((l) => (
                      <tr key={l._id}>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={l.descripcion}
                            onChange={(e) => updateLinea(l._id, 'descripcion', e.target.value)}
                            disabled={disableFinancial}
                            placeholder="Descripción"
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={l.cod_producto_proveedor}
                            onChange={(e) => updateLinea(l._id, 'cod_producto_proveedor', e.target.value)}
                            disabled={disableFinancial}
                            placeholder="Opcional"
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={l.unidad_codigo}
                            onChange={(e) => updateLinea(l._id, 'unidad_codigo', e.target.value)}
                            disabled={disableFinancial}
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={l.cantidad}
                            onChange={(e) => updateLinea(l._id, 'cantidad', parseFloat(e.target.value) || 0)}
                            disabled={disableFinancial}
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-right text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.mto_precio_unitario}
                            onChange={(e) => updateLinea(l._id, 'mto_precio_unitario', parseFloat(e.target.value) || 0)}
                            disabled={disableFinancial}
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-right text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            readOnly
                            type="number"
                            value={l.igv}
                            className="w-full bg-[#0F1115] border border-[#334155]/50 rounded px-2 py-1 text-right text-[#64748B] cursor-default"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            readOnly
                            type="number"
                            value={l.mto_valor_venta}
                            className="w-full bg-[#0F1115] border border-[#334155]/50 rounded px-2 py-1 text-right text-[#64748B] cursor-default"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.descuento}
                            onChange={(e) => updateLinea(l._id, 'descuento', parseFloat(e.target.value) || 0)}
                            disabled={disableFinancial}
                            className={`w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-right text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </td>
                        <td className="py-1.5">
                          {!disableFinancial && (
                            <button
                              onClick={() => removeLinea(l._id)}
                              className="p-1 rounded text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!disableFinancial && (
              <button
                type="button"
                onClick={addLinea}
                className="mt-3 flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] transition-colors"
              >
                <Plus size={13} />
                Agregar línea
              </button>
            )}
          </div>

          {/* S4: Descuento global */}
          <div className="max-w-xs">
            <label className={labelCls}>Descuento global (S/)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descuentoGlobal}
              onChange={(e) => setDescuentoGlobal(parseFloat(e.target.value) || 0)}
              disabled={disableFinancial}
              className={`${inputCls} ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* S5: Totales */}
          <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Totales</p>
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Base imponible</span>
              <span className="text-[#E2E8F0] font-medium">{formatCurrency(totales.baseGravada)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">IGV calculado (18%)</span>
              <span className="text-[#64748B]">{formatCurrency(totales.igvCalculado)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-[#94A3B8]">IGV aplicado</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={totales.igvCalculado.toFixed(2)}
                value={igvOverride !== null ? igvOverride : ''}
                onChange={(e) => {
                  const val = e.target.value
                  setIgvOverride(val === '' ? null : parseFloat(val) || 0)
                }}
                disabled={disableFinancial}
                className={`w-32 bg-[#0F1115] border border-[#334155] rounded-md py-1.5 px-2 text-sm text-right text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] transition-colors ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="flex justify-between text-base border-t border-[#334155] pt-2 mt-1">
              <span className="font-semibold text-[#E2E8F0]">Total</span>
              <span className="font-bold text-[#10B981]">{formatCurrency(totales.total)}</span>
            </div>
          </div>

          {/* S6: Detracción (solo si total > threshold y moneda PEN) */}
          {mostrarDetraccion && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-400">Detracción</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>
                    Cód. Bien/Servicio <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={detraccionCodBien}
                    onChange={(e) => setDetraccionCodBien(e.target.value)}
                    disabled={disableFinancial}
                    placeholder="Ej. 022"
                    className={`w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Porcentaje (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={detraccionPorcentaje}
                    onChange={(e) => setDetraccionPorcentaje(parseFloat(e.target.value) || 0)}
                    disabled={disableFinancial}
                    className={`w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Monto detracción (S/)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={detraccionMonto}
                    onChange={(e) => setDetraccionMonto(parseFloat(e.target.value) || 0)}
                    disabled={disableFinancial}
                    className={`w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-amber-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors ${disableFinancial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
              <p className="text-xs text-amber-500/80">
                Depositar {formatCurrency(detraccionMonto)} al Banco de la Nación antes de realizar el pago al proveedor.
              </p>
            </div>
          )}

          {/* S7: Archivos adjuntos */}
          <div>
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Archivos adjuntos</p>
            <div className="grid grid-cols-2 gap-4">
              {/* XML */}
              <div>
                <label className={labelCls}>Archivo XML</label>
                <input
                  ref={xmlInputRef}
                  type="file"
                  accept=".xml,application/xml,text/xml"
                  className="hidden"
                  disabled={isSubmitting}
                  onChange={(e) => setArchivoXml(e.target.files?.[0] ?? null)}
                />
                {archivoXml ? (
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3">
                    <span className="text-xs text-[#E2E8F0] truncate flex-1">{archivoXml.name}</span>
                    <button
                      type="button"
                      onClick={() => { setArchivoXml(null); if (xmlInputRef.current) xmlInputRef.current.value = '' }}
                      className="text-[#64748B] hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {comprobante?.archivo_xml_url ? (
                      <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3">
                        <span className="text-xs text-[#94A3B8] truncate flex-1">Archivo existente</span>
                        <a
                          href={comprobante.archivo_xml_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#3B82F6] hover:text-blue-400 shrink-0"
                        >
                          Ver
                        </a>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => xmlInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="w-full flex items-center gap-2 bg-[#0F1115] border border-dashed border-[#334155] rounded-md py-2 px-3 text-xs text-[#64748B] hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {comprobante?.archivo_xml_url ? 'Reemplazar XML' : 'Subir XML'}
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#64748B] mt-1">Opcional — podés subir después</p>
              </div>

              {/* PDF */}
              <div>
                <label className={labelCls}>Archivo PDF</label>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={isSubmitting}
                  onChange={(e) => setArchivoPdf(e.target.files?.[0] ?? null)}
                />
                {archivoPdf ? (
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3">
                    <span className="text-xs text-[#E2E8F0] truncate flex-1">{archivoPdf.name}</span>
                    <button
                      type="button"
                      onClick={() => { setArchivoPdf(null); if (pdfInputRef.current) pdfInputRef.current.value = '' }}
                      className="text-[#64748B] hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {comprobante?.archivo_pdf_url ? (
                      <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3">
                        <span className="text-xs text-[#94A3B8] truncate flex-1">Archivo existente</span>
                        <a
                          href={comprobante.archivo_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#3B82F6] hover:text-blue-400 shrink-0"
                        >
                          Ver
                        </a>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="w-full flex items-center gap-2 bg-[#0F1115] border border-dashed border-[#334155] rounded-md py-2 px-3 text-xs text-[#64748B] hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {comprobante?.archivo_pdf_url ? 'Reemplazar PDF' : 'Subir PDF'}
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#64748B] mt-1">Opcional — podés subir después</p>
              </div>
            </div>
          </div>

          {/* S8: Notas */}
          <div>
            <label className={labelCls}>Notas internas (opcional)</label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones internas sobre esta compra..."
              className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] transition-colors resize-none"
            />
          </div>

        </div>

        {/* Submit error */}
        {submitError !== null && (
          <p className="text-red-400 text-sm px-5 pb-3">{submitError}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#334155] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Registrar Compra
          </button>
        </div>
      </div>
    </div>
  )
}
