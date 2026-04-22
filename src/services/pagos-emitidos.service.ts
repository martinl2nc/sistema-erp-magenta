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

export const updateVoucherUrl = async (pagoId: string, url: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('pagos_emitidos')
    .update({ comprobante_img_url: url })
    .eq('id', pagoId);
  if (error) throw new Error('Error al actualizar URL del voucher: ' + error.message);
};

export const pagosEmitidosService = {
  getHistorialPagosEmitidos,
  registrarPagoEmitido,
  anularPagoEmitido,
  uploadVoucherPago,
  updateVoucherUrl,
};
