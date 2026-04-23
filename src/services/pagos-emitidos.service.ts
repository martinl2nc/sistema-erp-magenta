import { createClient } from '@/lib/supabase/client';
import type { MetodoPago, CuentaBancaria } from '@/types/common.types';

export type { MetodoPago, CuentaBancaria };

// ─── Types ───────────────────────────────────────────────────

export interface PagoEmitido {
  id: string;
  comprobante_compra_id: string;
  metodo_pago_codigo: string | null;
  cuenta_bancaria_id: string | null;
  monto_pagado: number;
  fecha_pago: string;
  referencia_operacion: string | null;
  comprobante_img_url: string | null;
  notas: string | null;
  registrado_por: string | null;
  moneda: 'PEN' | 'USD';
  anulado: boolean;
  anulado_por: string | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  created_at: string;
  cat_metodos_pago?: {
    codigo: string;
    descripcion: string;
  } | null;
  cuentas_bancarias_empresa?: {
    banco: string;
    numero_cuenta: string;
  } | null;
}

export interface RegistrarPagoEmitidoPayload {
  comprobante_compra_id: string;
  metodo_pago_codigo: string;
  cuenta_bancaria_id: string | null;
  monto_pagado: number;
  moneda: 'PEN' | 'USD';
  fecha_pago: string;
  referencia_operacion?: string;
  comprobante_img_url?: string;
  notas?: string;
  registrado_por?: string;
}

export interface AnularPagoEmitidoPayload {
  pago_id: string;
  anulado_por: string;
  motivo: string;
}

// ─── Service Functions ───────────────────────────────────────

export const getHistorialPagosEmitidos = async (id: string): Promise<PagoEmitido[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pagos_emitidos')
    .select(`
      *,
      cat_metodos_pago ( codigo, descripcion ),
      cuentas_bancarias_empresa ( banco, numero_cuenta )
    `)
    .eq('comprobante_compra_id', id)
    .order('fecha_pago', { ascending: false });

  if (error) throw new Error('Error al cargar historial de pagos emitidos: ' + error.message);
  return (data ?? []) as PagoEmitido[];
};

export const registrarPagoEmitido = async (
  payload: RegistrarPagoEmitidoPayload
): Promise<string> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pagos_emitidos')
    .insert({
      comprobante_compra_id: payload.comprobante_compra_id,
      metodo_pago_codigo:    payload.metodo_pago_codigo,
      cuenta_bancaria_id:    payload.cuenta_bancaria_id,
      monto_pagado:          payload.monto_pagado,
      moneda:                payload.moneda,
      fecha_pago:            payload.fecha_pago,
      referencia_operacion:  payload.referencia_operacion ?? null,
      comprobante_img_url:   payload.comprobante_img_url ?? null,
      notas:                 payload.notas ?? null,
      registrado_por:        payload.registrado_por ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error('Error al registrar pago emitido: ' + error.message);
  return (data as { id: string }).id;
};

export const anularPagoEmitido = async (
  payload: AnularPagoEmitidoPayload
): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('pagos_emitidos')
    .update({
      anulado:          true,
      anulado_por:      payload.anulado_por,
      fecha_anulacion:  new Date().toISOString(),
      motivo_anulacion: payload.motivo,
    })
    .eq('id', payload.pago_id);

  if (error) throw new Error('Error al anular pago emitido: ' + error.message);
};

export const uploadVoucherPago = async (file: File, pagoId: string): Promise<string> => {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `pagos-emitidos/${pagoId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('vouchers_cobros')
    .upload(path, file, { upsert: false });

  if (error) throw new Error('Error al subir el voucher de pago: ' + error.message);

  const { data } = supabase.storage.from('vouchers_cobros').getPublicUrl(path);
  return data.publicUrl;
};

export const registrarPagoCompleto = async (
  payload: RegistrarPagoEmitidoPayload,
  voucher?: File | null
): Promise<string> => {
  const pagoId = await registrarPagoEmitido(payload);
  if (voucher) {
    const url = await uploadVoucherPago(voucher, pagoId);
    await updateVoucherUrl(pagoId, url);
  }
  return pagoId;
};

export const updateVoucherUrl = async (pagoId: string, url: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('pagos_emitidos')
    .update({ comprobante_img_url: url })
    .eq('id', pagoId);
  if (error) throw new Error('Error al actualizar URL del voucher: ' + error.message);
};

// ─── Listado global de pagos emitidos ────────────────────────────────────────

export interface PagoEmitidoListado extends PagoEmitido {
  comprobantes_compra?: {
    serie_numero: string;
    proveedores?: {
      razon_social: string | null;
      nombres_contacto: string;
      apellidos_contacto: string;
    } | null;
  } | null;
  perfiles_usuario?: {
    nombre: string;
  } | null;
}

export interface AllPagosEmitidosParams {
  fechaDesde?: string;
  fechaHasta?: string;
  cuentaBancariaId?: string;
  metodoPagoCodigo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPagosEmitidos {
  data: PagoEmitidoListado[];
  count: number;
}

export interface AllPagosEmitidosTotales {
  count: number;
  monto: number;
}

export const getAllPagosEmitidos = async (
  params?: AllPagosEmitidosParams
): Promise<PaginatedPagosEmitidos> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, fechaDesde, fechaHasta, cuentaBancariaId, metodoPagoCodigo, search } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('pagos_emitidos')
    .select(`
      *,
      comprobantes_compra!pagos_emitidos_comprobante_compra_id_fkey (
        serie_numero,
        proveedores ( razon_social, nombres_contacto, apellidos_contacto )
      ),
      cat_metodos_pago ( codigo, descripcion ),
      cuentas_bancarias_empresa ( banco, numero_cuenta ),
      perfiles_usuario:registrado_por ( nombre )
    `, { count: 'exact' })
    .order('fecha_pago', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (fechaDesde) query = query.gte('fecha_pago', fechaDesde);
  if (fechaHasta) query = query.lte('fecha_pago', fechaHasta);
  if (cuentaBancariaId) query = query.eq('cuenta_bancaria_id', cuentaBancariaId);
  if (metodoPagoCodigo) query = query.eq('metodo_pago_codigo', metodoPagoCodigo);
  if (search?.trim()) {
    const term = search.trim();
    query = query.or(
      `referencia_operacion.ilike.%${term}%,comprobantes_compra.serie_numero.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar transacciones de pagos: ' + error.message);
  return { data: (data ?? []) as PagoEmitidoListado[], count: count ?? 0 };
};

export const getAllPagosEmitidosTotales = async (
  params?: Omit<AllPagosEmitidosParams, 'page' | 'pageSize'>
): Promise<AllPagosEmitidosTotales> => {
  const supabase = createClient();
  const { fechaDesde, fechaHasta, cuentaBancariaId, metodoPagoCodigo, search } = params ?? {};

  let query = supabase
    .from('pagos_emitidos')
    .select('monto_pagado, anulado');

  if (fechaDesde) query = query.gte('fecha_pago', fechaDesde);
  if (fechaHasta) query = query.lte('fecha_pago', fechaHasta);
  if (cuentaBancariaId) query = query.eq('cuenta_bancaria_id', cuentaBancariaId);
  if (metodoPagoCodigo) query = query.eq('metodo_pago_codigo', metodoPagoCodigo);
  if (search?.trim()) {
    query = query.ilike('referencia_operacion', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error('Error al cargar totales de pagos: ' + error.message);

  const rows = (data ?? []) as { monto_pagado: number; anulado: boolean }[];
  const vigentes = rows.filter((p) => !p.anulado);
  return {
    count: vigentes.length,
    monto: vigentes.reduce((s, p) => s + p.monto_pagado, 0),
  };
};

// ─── Aging (Antigüedad de Deuda) por Proveedor ───────────────────────────────

export interface AgingReportComprasRow {
  proveedor_id: string;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  deuda_total: number;
  por_vencer: number;
  vencido_1_30: number;
  vencido_31_60: number;
  vencido_61_90: number;
  vencido_mas_90: number;
  count_comprobantes: number;
}

export interface AgingDetalleComprasRow {
  comprobante_id: string;
  serie_numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  forma_pago: string;
  total_facturado: number;
  saldo_pendiente: number;
  dias_vencido: number;
  bucket: 'por_vencer' | 'vencido_1_30' | 'vencido_31_60' | 'vencido_61_90' | 'vencido_mas_90';
}

export const getAgingReportCompras = async (): Promise<AgingReportComprasRow[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_aging_report_compras');
  if (error) throw new Error('Error al cargar reporte de antigüedad de compras: ' + error.message);
  return (data ?? []) as AgingReportComprasRow[];
};

export const getAgingDetalleCompras = async (proveedorId: string): Promise<AgingDetalleComprasRow[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_aging_detalle_compras', { p_proveedor_id: proveedorId });
  if (error) throw new Error('Error al cargar detalle de antigüedad de compras: ' + error.message);
  return (data ?? []) as AgingDetalleComprasRow[];
};

export const pagosEmitidosService = {
  getHistorialPagosEmitidos,
  registrarPagoEmitido,
  registrarPagoCompleto,
  anularPagoEmitido,
  uploadVoucherPago,
  updateVoucherUrl,
  getAllPagosEmitidos,
  getAllPagosEmitidosTotales,
  getAgingReportCompras,
  getAgingDetalleCompras,
};
