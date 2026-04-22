import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface CategoriaGasto {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface ComprobanteCompraDetalle {
  id: string;
  comprobante_compra_id: string;
  producto_id: string | null;
  cod_producto_proveedor: string | null;
  unidad_codigo: string;
  descripcion: string;
  cantidad: number;
  mto_valor_unitario: number;
  mto_precio_unitario: number;
  mto_valor_venta: number;
  mto_base_igv: number;
  porcentaje_igv: number;
  igv: number;
  tip_afe_igv_codigo: string;
  descuento: number;
  total_impuestos: number;
}

export interface ComprobanteCompra {
  id: string;
  proveedor_id: string;
  categoria_gasto_id: string | null;
  tipo_doc_codigo: string;
  serie: string;
  correlativo: string;
  serie_numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  moneda: 'PEN' | 'USD';
  tipo_cambio: number;
  forma_pago: 'Contado' | 'Credito';
  mto_oper_gravadas: number;
  mto_oper_exoneradas: number;
  mto_oper_inafectas: number;
  mto_igv: number;
  mto_isc: number;
  icbper: number;
  total_impuestos: number;
  valor_venta: number;
  subtotal: number;
  mto_imp_venta: number;
  descuento_global_monto: number;
  detraccion_cod_bien: string | null;
  detraccion_porcentaje: number | null;
  detraccion_monto: number | null;
  archivo_xml_url: string | null;
  archivo_pdf_url: string | null;
  notas: string | null;
  estado_pago: 'pendiente' | 'parcial' | 'pagado';
  saldo_pendiente: number;
  created_at: string;
  proveedores?: {
    razon_social: string | null;
    nombres_contacto: string;
    apellidos_contacto: string;
    numero_documento: string;
  } | null;
  cat_categorias_gasto?: { id: string; nombre: string } | null;
}

export interface RegistrarCompraDetallePayload {
  cod_producto_proveedor?: string;
  unidad_codigo?: string;
  descripcion: string;
  cantidad: number;
  mto_valor_unitario: number;
  mto_precio_unitario: number;
  mto_valor_venta: number;
  mto_base_igv: number;
  porcentaje_igv?: number;
  igv: number;
  tip_afe_igv_codigo?: string;
  descuento?: number;
  total_impuestos: number;
}

export interface RegistrarCompraPayload {
  proveedor_id: string;
  categoria_gasto_id?: string | null;
  tipo_doc_codigo: string;
  serie: string;
  correlativo: string;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  moneda?: 'PEN' | 'USD';
  tipo_cambio?: number;
  forma_pago?: 'Contado' | 'Credito';
  mto_oper_gravadas: number;
  mto_oper_exoneradas?: number;
  mto_oper_inafectas?: number;
  mto_igv: number;
  mto_isc?: number;
  icbper?: number;
  total_impuestos: number;
  valor_venta: number;
  subtotal: number;
  mto_imp_venta: number;
  descuento_global_monto?: number;
  detraccion_cod_bien?: string | null;
  detraccion_porcentaje?: number | null;
  detraccion_monto?: number | null;
  notas?: string | null;
  detalles?: RegistrarCompraDetallePayload[];
}

export interface RegistrarCompraCompletoPayload extends RegistrarCompraPayload {
  archivoXml?: File | null;
  archivoPdf?: File | null;
}

export interface ComprasListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  estadoPago?: 'pendiente' | 'parcial' | 'pagado';
  proveedorId?: string;
  showPagados?: boolean;
}

export interface PaginatedCompras {
  data: ComprobanteCompra[];
  count: number;
}

// ─── Service Functions ───────────────────────────────────────

export const getCompras = async (
  params?: ComprasListParams
): Promise<PaginatedCompras> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search, estadoPago, proveedorId, showPagados } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('comprobantes_compra')
    .select(
      `*, proveedores ( razon_social, nombres_contacto, apellidos_contacto, numero_documento ), cat_categorias_gasto ( id, nombre )`,
      { count: 'exact' }
    )
    .order('fecha_emision', { ascending: false })
    .range(from, to);

  if (!showPagados) query = query.gt('saldo_pendiente', 0);
  if (estadoPago) query = query.eq('estado_pago', estadoPago);
  if (proveedorId) query = query.eq('proveedor_id', proveedorId);
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`serie_numero.ilike.${term}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar comprobantes de compra: ' + error.message);
  return { data: (data ?? []) as ComprobanteCompra[], count: count ?? 0 };
};

export const getCompraById = async (id: string): Promise<ComprobanteCompra> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comprobantes_compra')
    .select(`*, proveedores ( * ), cat_categorias_gasto ( id, nombre )`)
    .eq('id', id)
    .single();

  if (error) throw new Error('Error al cargar comprobante de compra: ' + error.message);
  return data as ComprobanteCompra;
};

export const getDetallesCompra = async (
  comprobanteCompraId: string
): Promise<ComprobanteCompraDetalle[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comprobantes_compras_detalles')
    .select('*')
    .eq('comprobante_compra_id', comprobanteCompraId);

  if (error) throw new Error('Error al cargar detalles de compra: ' + error.message);
  return (data ?? []) as ComprobanteCompraDetalle[];
};

export const registrarCompra = async (payload: RegistrarCompraPayload): Promise<string> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('registrar_comprobante_compra', {
    p_proveedor_id:           payload.proveedor_id,
    p_categoria_gasto_id:     payload.categoria_gasto_id ?? null,
    p_tipo_doc_codigo:        payload.tipo_doc_codigo,
    p_serie:                  payload.serie,
    p_correlativo:            payload.correlativo,
    p_fecha_emision:          payload.fecha_emision,
    p_fecha_vencimiento:      payload.fecha_vencimiento ?? null,
    p_moneda:                 payload.moneda ?? 'PEN',
    p_tipo_cambio:            payload.tipo_cambio ?? 1,
    p_forma_pago:             payload.forma_pago ?? 'Contado',
    p_mto_oper_gravadas:      payload.mto_oper_gravadas,
    p_mto_oper_exoneradas:    payload.mto_oper_exoneradas ?? 0,
    p_mto_oper_inafectas:     payload.mto_oper_inafectas ?? 0,
    p_mto_igv:                payload.mto_igv,
    p_mto_isc:                payload.mto_isc ?? 0,
    p_icbper:                 payload.icbper ?? 0,
    p_total_impuestos:        payload.total_impuestos,
    p_valor_venta:            payload.valor_venta,
    p_subtotal:               payload.subtotal,
    p_mto_imp_venta:          payload.mto_imp_venta,
    p_descuento_global_monto: payload.descuento_global_monto ?? 0,
    p_detraccion_cod_bien:    payload.detraccion_cod_bien ?? null,
    p_detraccion_porcentaje:  payload.detraccion_porcentaje ?? null,
    p_detraccion_monto:       payload.detraccion_monto ?? null,
    p_archivo_xml_url:        null,
    p_archivo_pdf_url:        null,
    p_notas:                  payload.notas ?? null,
    p_detalles:               payload.detalles ?? [],
  });

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe un comprobante con ese número para este proveedor.');
    throw new Error('Error al registrar comprobante de compra: ' + error.message);
  }

  return data as string;
};

export const getCategorias = async (): Promise<CategoriaGasto[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cat_categorias_gasto')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  if (error) throw new Error('Error al cargar categorías de gasto: ' + error.message);
  return (data ?? []) as CategoriaGasto[];
};

export const uploadArchivoCompra = async (
  file: File,
  comprobanteId: string,
  tipo: 'xml' | 'pdf'
): Promise<string> => {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? tipo;
  const path = `${comprobanteId}/${tipo}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('compras_adjuntos')
    .upload(path, file, { upsert: false });

  if (error) throw new Error(`Error al subir el archivo ${tipo.toUpperCase()}: ` + error.message);

  const { data, error: signedError } = await supabase.storage
    .from('compras_adjuntos')
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signedError || !data?.signedUrl) {
    throw new Error('Error al generar URL firmada: ' + (signedError?.message ?? 'sin URL'));
  }

  return data.signedUrl;
};

export const updateArchivosCompra = async (
  id: string,
  urls: { archivo_xml_url?: string; archivo_pdf_url?: string }
): Promise<void> => {
  const supabase = createClient();
  const patch: Record<string, string> = {};
  if (urls.archivo_xml_url !== undefined) patch.archivo_xml_url = urls.archivo_xml_url;
  if (urls.archivo_pdf_url !== undefined) patch.archivo_pdf_url = urls.archivo_pdf_url;

  const { error } = await supabase
    .from('comprobantes_compra')
    .update(patch)
    .eq('id', id);

  if (error) throw new Error('Error al actualizar archivos del comprobante: ' + error.message);
};

export interface KpisCompras {
  totalCxP: number;
  countPendientes: number;
  countParciales: number;
  totalMes: number;
  igvCreditoFiscalMes: number;
}

export const getKpisCompras = async (): Promise<KpisCompras> => {
  const supabase = createClient();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [cxpRes, mesRes] = await Promise.all([
    supabase
      .from('comprobantes_compra')
      .select('saldo_pendiente, estado_pago')
      .gt('saldo_pendiente', 0),
    supabase
      .from('comprobantes_compra')
      .select('mto_imp_venta, mto_igv')
      .gte('fecha_emision', firstDayOfMonth),
  ]);

  if (cxpRes.error) throw new Error('Error al cargar KPIs de compras: ' + cxpRes.error.message);
  if (mesRes.error) throw new Error('Error al cargar KPIs del mes: ' + mesRes.error.message);

  const cxpData = cxpRes.data ?? [];
  const mesData = mesRes.data ?? [];

  return {
    totalCxP:             cxpData.reduce((s, r) => s + r.saldo_pendiente, 0),
    countPendientes:      cxpData.filter(r => r.estado_pago === 'pendiente').length,
    countParciales:       cxpData.filter(r => r.estado_pago === 'parcial').length,
    totalMes:             mesData.reduce((s, r) => s + r.mto_imp_venta, 0),
    igvCreditoFiscalMes:  mesData.reduce((s, r) => s + r.mto_igv, 0),
  };
};

export const comprasService = {
  getCompras,
  getCompraById,
  getDetallesCompra,
  registrarCompra,
  getCategorias,
  uploadArchivoCompra,
  updateArchivosCompra,
  getKpisCompras,
};
