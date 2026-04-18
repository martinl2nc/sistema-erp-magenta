import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface CuentaPorCobrar {
  comprobante_id: string;
  serie_numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  forma_pago: string;
  tipo_doc_codigo: string;
  estado_sunat: string;
  estado_pago: string;
  detraccion_monto: number | null;
  cliente_id: string;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  total_facturado: number;
  monto_cobrable: number;
  total_notas_credito: number;
  total_cobrado: number;
  saldo_pendiente: number;
}

export interface Cobro {
  id: string;
  comprobante_id: string;
  metodo_pago_codigo: string;
  cuenta_bancaria_id: string | null;
  monto_cobrado: number;
  moneda: 'PEN' | 'USD';
  fecha_pago: string;
  referencia_operacion: string | null;
  comprobante_img_url: string | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
  anulado: boolean;
  anulado_por: string | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  // Joined relations
  cat_metodos_pago?: {
    codigo: string;
    descripcion: string;
  };
  cuentas_bancarias_empresa?: {
    banco: string;
    numero_cuenta: string;
  } | null;
  perfiles_usuario?: {
    nombre: string;
  } | null;
}

export interface RegistrarCobroPayload {
  comprobante_id: string;
  metodo_pago_codigo: string;
  cuenta_bancaria_id: string | null;
  monto_cobrado: number;
  moneda: 'PEN' | 'USD';
  fecha_pago: string;
  referencia_operacion?: string;
  comprobante_img_url?: string;
  notas?: string;
  registrado_por?: string;
}

export interface MetodoPago {
  codigo: string;
  descripcion: string;
  requiere_referencia: boolean;
  activo: boolean;
}

export interface CuentaBancaria {
  id: string;
  banco: string;
  numero_cuenta: string;
  cci: string | null;
  moneda: string;
  es_detraccion: boolean;
  activo: boolean;
  created_at: string;
  _tiene_pagos?: boolean;
}

export interface CuotaComprobante {
  comprobante_id: string;
  numero_cuota: number;
  monto: number;
  fecha_pago: string;
}

export interface CuentasPorCobrarParams {
  page?: number;
  pageSize?: number;
  search?: string;
  formaPago?: string;
  showPagados?: boolean;
}

export interface PaginatedCuentasPorCobrar {
  data: CuentaPorCobrar[];
  count: number;
}

export interface CuentasPorCobrarKpis {
  totalPendiente: number;
  totalParcial: number;
  totalCobrado: number;
  countPendientes: number;
  countParciales: number;
}

// ─── Service Functions ───────────────────────────────────────

export const getCuentasPorCobrar = async (
  params?: CuentasPorCobrarParams
): Promise<PaginatedCuentasPorCobrar> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search, formaPago, showPagados } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('vista_cuentas_por_cobrar')
    .select('*', { count: 'exact' })
    .order('fecha_emision', { ascending: false })
    .range(from, to);

  if (!showPagados) query = query.gt('saldo_pendiente', 0);
  if (formaPago) query = query.eq('forma_pago', formaPago);
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `serie_numero.ilike.${term},razon_social.ilike.${term},nombres_contacto.ilike.${term},apellidos_contacto.ilike.${term}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar cuentas por cobrar: ' + error.message);
  return { data: (data ?? []) as CuentaPorCobrar[], count: count ?? 0 };
};

export const getCuentasPorCobrarKpis = async (): Promise<CuentasPorCobrarKpis> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_cuentas_por_cobrar')
    .select('estado_pago, saldo_pendiente, total_cobrado');

  if (error) throw new Error('Error al cargar KPIs de cobranzas: ' + error.message);

  const rows = (data ?? []) as Pick<CuentaPorCobrar, 'estado_pago' | 'saldo_pendiente' | 'total_cobrado'>[];
  return {
    totalPendiente: rows.filter((r) => r.estado_pago === 'Pendiente').reduce((s, r) => s + r.saldo_pendiente, 0),
    totalParcial: rows.filter((r) => r.estado_pago === 'Parcial').reduce((s, r) => s + r.saldo_pendiente, 0),
    totalCobrado: rows.reduce((s, r) => s + r.total_cobrado, 0),
    countPendientes: rows.filter((r) => r.estado_pago === 'Pendiente').length,
    countParciales: rows.filter((r) => r.estado_pago === 'Parcial').length,
  };
};

/**
 * Fetches payment history for a specific comprobante.
 * Includes joined data for method, bank, and user.
 */
export const getHistorialCobros = async (comprobanteId: string): Promise<Cobro[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cobros')
    .select(`
      *,
      cat_metodos_pago ( codigo, descripcion ),
      cuentas_bancarias_empresa ( banco, numero_cuenta ),
      perfiles_usuario:registrado_por ( nombre )
    `)
    .eq('comprobante_id', comprobanteId)
    .order('fecha_pago', { ascending: false });

  if (error) throw new Error('Error al cargar historial de cobros: ' + error.message);
  return (data || []) as Cobro[];
};

/**
 * Registers a payment using the atomic RPC.
 * The RPC validates available balance and prevents overpayment.
 * The trigger automatically updates comprobantes.estado_pago.
 */
export const registrarCobro = async (payload: RegistrarCobroPayload): Promise<string> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('registrar_cobro', {
    p_comprobante_id: payload.comprobante_id,
    p_metodo_pago_codigo: payload.metodo_pago_codigo,
    p_cuenta_bancaria_id: payload.cuenta_bancaria_id,
    p_monto_cobrado: payload.monto_cobrado,
    p_fecha_pago: payload.fecha_pago,
    p_referencia_operacion: payload.referencia_operacion || null,
    p_comprobante_img_url: payload.comprobante_img_url || null,
    p_notas: payload.notas || null,
    p_registrado_por: payload.registrado_por || null,
    p_moneda: payload.moneda,
  });

  if (error) {
    // Extract user-friendly message from RPC RAISE EXCEPTION
    const match = error.message.match(/El monto .* excede el saldo pendiente/);
    if (match) throw new Error(match[0]);
    throw new Error('Error al registrar cobro: ' + error.message);
  }

  return data as string;
};

/**
 * Fetches active payment methods.
 */
export const getMetodosPago = async (): Promise<MetodoPago[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cat_metodos_pago')
    .select('*')
    .eq('activo', true)
    .order('descripcion');

  if (error) throw new Error('Error al cargar métodos de pago: ' + error.message);
  return (data || []) as MetodoPago[];
};

/**
 * Fetches active bank accounts.
 */
export const getCuentasBancarias = async (): Promise<CuentaBancaria[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cuentas_bancarias_empresa')
    .select('*, cobros(id)')
    .eq('activo', true)
    .order('banco');

  if (error) throw new Error('Error al cargar cuentas bancarias: ' + error.message);
  
  // Transform the response to include _tiene_pagos flag and structure it correctly
  return (data || []).map((row: any) => ({
    id: row.id,
    banco: row.banco,
    numero_cuenta: row.numero_cuenta,
    cci: row.cci,
    moneda: row.moneda,
    es_detraccion: row.es_detraccion,
    activo: row.activo,
    created_at: row.created_at,
    _tiene_pagos: row.cobros && row.cobros.length > 0
  })) as CuentaBancaria[];
};

/**
 * Creates a new bank account.
 */
export const createCuentaBancaria = async (
  cuenta: Omit<CuentaBancaria, 'id' | 'created_at' | 'activo'>
): Promise<CuentaBancaria> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cuentas_bancarias_empresa')
    .insert(cuenta)
    .select()
    .single();

  if (error) throw new Error('Error al crear cuenta bancaria: ' + error.message);
  return data as CuentaBancaria;
};

/**
 * Updates a bank account. Only possible if the account has no associated payments.
 */
export const updateCuentaBancaria = async (
  id: string,
  cuenta: Partial<Omit<CuentaBancaria, 'id' | 'created_at' | 'activo' | '_tiene_pagos'>>
): Promise<CuentaBancaria> => {
  const supabase = createClient();
  
  // First, verify there are no payments
  const { count, error: countErr } = await supabase
    .from('cobros')
    .select('*', { count: 'exact', head: true })
    .eq('cuenta_bancaria_id', id);
    
  if (countErr) throw new Error('Error al verificar pagos asociados: ' + countErr.message);
  if ((count || 0) > 0) throw new Error('No se puede editar una cuenta que ya tiene pagos registrados.');

  const { data, error } = await supabase
    .from('cuentas_bancarias_empresa')
    .update(cuenta)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Error al actualizar cuenta bancaria: ' + error.message);
  return data as CuentaBancaria;
};

/**
 * Soft-deletes a bank account (sets activo = false).
 */
export const deleteCuentaBancaria = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('cuentas_bancarias_empresa')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw new Error('Error al eliminar cuenta bancaria: ' + error.message);
};

/**
 * Fetches the scheduled installments for a credit comprobante.
 */
export const getCuotasComprobante = async (comprobanteId: string): Promise<CuotaComprobante[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comprobantes_cuotas')
    .select('comprobante_id, numero_cuota, monto, fecha_pago')
    .eq('comprobante_id', comprobanteId)
    .order('numero_cuota', { ascending: true });
  if (error) throw new Error('Error al cargar cuotas del comprobante: ' + error.message);
  return (data ?? []) as CuotaComprobante[];
};

export interface CobroListado extends Cobro {
  comprobantes?: {
    serie_numero: string;
    clientes?: {
      razon_social: string | null;
      nombres_contacto: string;
      apellidos_contacto: string;
    } | null;
  } | null;
}

export interface AllCobrosParams {
  fechaDesde?: string;
  fechaHasta?: string;
  cuentaBancariaId?: string;
  metodoPagoCodigo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCobros {
  data: CobroListado[];
  count: number;
}

export interface AllCobrosTotales {
  count: number;
  monto: number;
}

export const getAllCobros = async (params?: AllCobrosParams): Promise<PaginatedCobros> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search, fechaDesde, fechaHasta, cuentaBancariaId, metodoPagoCodigo } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('cobros')
    .select(`
      *,
      comprobantes!cobros_comprobante_id_fkey (
        serie_numero,
        clientes ( razon_social, nombres_contacto, apellidos_contacto )
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
      `referencia_operacion.ilike.%${term}%,comprobantes.serie_numero.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar transacciones: ' + error.message);
  return { data: (data ?? []) as CobroListado[], count: count ?? 0 };
};

export const getAllCobrosTotales = async (
  params?: Omit<AllCobrosParams, 'page' | 'pageSize'>
): Promise<AllCobrosTotales> => {
  const supabase = createClient();
  const { fechaDesde, fechaHasta, cuentaBancariaId, metodoPagoCodigo, search } = params ?? {};

  let query = supabase
    .from('cobros')
    .select('monto_cobrado, anulado');

  if (fechaDesde) query = query.gte('fecha_pago', fechaDesde);
  if (fechaHasta) query = query.lte('fecha_pago', fechaHasta);
  if (cuentaBancariaId) query = query.eq('cuenta_bancaria_id', cuentaBancariaId);
  if (metodoPagoCodigo) query = query.eq('metodo_pago_codigo', metodoPagoCodigo);
  if (search?.trim()) {
    query = query.ilike('referencia_operacion', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error('Error al cargar totales: ' + error.message);

  const rows = (data ?? []) as { monto_cobrado: number; anulado: boolean }[];
  const vigentes = rows.filter((c) => !c.anulado);
  return {
    count: vigentes.length,
    monto: vigentes.reduce((s, c) => s + c.monto_cobrado, 0),
  };
};

export interface AnularCobroPayload {
  cobro_id: string;
  anulado_por: string;
  motivo: string;
}

export const uploadVoucherCobro = async (file: File, comprobanteId: string): Promise<string> => {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${comprobanteId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('vouchers_cobros')
    .upload(path, file, { upsert: false });

  if (error) throw new Error('Error al subir el voucher: ' + error.message);

  const { data } = supabase.storage.from('vouchers_cobros').getPublicUrl(path);
  return data.publicUrl;
};

export const anularCobro = async (payload: AnularCobroPayload): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.rpc('anular_cobro', {
    p_cobro_id:    payload.cobro_id,
    p_anulado_por: payload.anulado_por,
    p_motivo:      payload.motivo,
  });

  if (error) {
    const alreadyAnulado = error.message.includes('ya estaba anulado');
    if (alreadyAnulado) throw new Error('Este cobro ya fue anulado anteriormente.');
    throw new Error('Error al anular cobro: ' + error.message);
  }
};

// Grouped export for convenient imports
export const cobrosService = {
  getCuentasPorCobrar,
  getCuentasPorCobrarKpis,
  getHistorialCobros,
  registrarCobro,
  getMetodosPago,
  getCuentasBancarias,
  createCuentaBancaria,
  updateCuentaBancaria,
  deleteCuentaBancaria,
  getCuotasComprobante,
  anularCobro,
  getAllCobros,
  getAllCobrosTotales,
  uploadVoucherCobro,
};
