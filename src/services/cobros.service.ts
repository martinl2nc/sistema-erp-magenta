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
  fecha_pago: string;
  referencia_operacion: string | null;
  comprobante_img_url: string | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
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
    apellido: string;
  } | null;
}

export interface RegistrarCobroPayload {
  comprobante_id: string;
  metodo_pago_codigo: string;
  cuenta_bancaria_id: string | null;
  monto_cobrado: number;
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

// ─── Service Functions ───────────────────────────────────────

/**
 * Fetches all receivable accounts from the master view.
 * The view already handles NC and detraccion calculations.
 */
export const getCuentasPorCobrar = async (): Promise<CuentaPorCobrar[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vista_cuentas_por_cobrar')
    .select('*')
    .order('fecha_emision', { ascending: false });

  if (error) throw new Error('Error al cargar cuentas por cobrar: ' + error.message);
  return (data || []) as CuentaPorCobrar[];
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
      perfiles_usuario:registrado_por ( nombre, apellido )
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

// Grouped export for convenient imports
export const cobrosService = {
  getCuentasPorCobrar,
  getHistorialCobros,
  registrarCobro,
  getMetodosPago,
  getCuentasBancarias,
  createCuentaBancaria,
  updateCuentaBancaria,
  deleteCuentaBancaria,
};
