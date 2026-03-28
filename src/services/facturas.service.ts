import { createClient } from '@/lib/supabase/client';

export type FacturaEstado = 'emitida' | 'aceptada_sunat' | 'rechazada_sunat' | 'anulada';

export interface Factura {
  id: string;
  pedido_id: string;
  cliente_id: string;
  tipo_comprobante: 'factura' | 'boleta';
  serie: string;
  numero: number;
  serie_numero: string;
  fecha_emision: string;
  subtotal: number;
  igv_monto: number;
  total: number;
  enlace_pdf: string | null;
  enlace_xml: string | null;
  enlace_cdr: string | null;
  apisperu_response: Record<string, unknown> | null;
  estado: FacturaEstado;
  fecha_creacion: string;
  // Relations
  clientes?: {
    razon_social: string | null;
    nombres_contacto: string;
    apellidos_contacto: string;
    numero_documento: string | null;
  };
  pedidos?: {
    cotizaciones?: { numero_correlativo: number };
  };
}

export interface NotaCredito {
  id: string;
  factura_id: string;
  tipo_nota: '01' | '07';
  motivo: string;
  serie_numero: string | null;
  enlace_pdf: string | null;
  enlace_xml: string | null;
  apisperu_response: Record<string, unknown> | null;
  estado: 'pendiente' | 'emitida' | 'error';
  fecha_creacion: string;
}

export interface EmitirComprobantePayload {
  pedido_id: string;
  tipo_comprobante: 'factura' | 'boleta';
  cliente_id: string;
  fecha_emision: string; // 'YYYY-MM-DD'
  subtotal: number;
  igv_monto: number;
  total: number;
  lineas: {
    producto_id: string | null;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    mto_valor_unitario: number;
    mto_base_igv: number;
    mto_igv: number;
    subtotal: number;
    unidad_sunat: string;
    afectacion_igv: string;
  }[];
  direccion_facturacion?: string;
}

export const facturasService = {
  async getFacturas(): Promise<Factura[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes ( razon_social, nombres_contacto, apellidos_contacto, numero_documento ),
        pedidos ( cotizaciones ( numero_correlativo ) )
      `)
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getFacturaByPedido(pedidoId: string): Promise<Factura | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('pedido_id', pedidoId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async emitirComprobante(payload: EmitirComprobantePayload): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('emitir_comprobante', {
      p_pedido_id:             payload.pedido_id,
      p_tipo_comprobante:      payload.tipo_comprobante,
      p_cliente_id:            payload.cliente_id,
      p_fecha_emision:         payload.fecha_emision,
      p_subtotal:              payload.subtotal,
      p_igv_monto:             payload.igv_monto,
      p_total:                 payload.total,
      p_lineas:                payload.lineas,
      p_direccion_facturacion: payload.direccion_facturacion ?? null,
    });
    if (error) throw error;
    return data as string; // returns factura_id (UUID)
  },

  async createNotaCredito(payload: {
    factura_id: string;
    tipo_nota: '01' | '07';
    motivo: string;
  }): Promise<NotaCredito> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notas_credito')
      .insert([{ ...payload, estado: 'pendiente' }])
      .select()
      .single();
    if (error) throw error;
    await supabase
      .from('facturas')
      .update({ estado: 'anulada' as FacturaEstado })
      .eq('id', payload.factura_id);
    return data;
  },
};
