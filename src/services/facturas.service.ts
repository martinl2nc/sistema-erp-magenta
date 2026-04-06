import { createClient } from '@/lib/supabase/client';

export type ComprobanteEstadoSunat = 'borrador' | 'emitida' | 'aceptada_sunat' | 'rechazada_sunat' | 'anulada';

export interface Comprobante {
  id: string;
  pedido_id: string;
  cliente_id: string;
  tipo_doc_codigo: string; // '01' factura, '03' boleta, '07' NC
  serie: string;
  correlativo: number;
  serie_numero: string;
  comprobante_referencia_id: string | null;
  motivo_nota: string | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  tipo_moneda: string;
  forma_pago: string;
  mto_oper_gravadas: number;
  mto_oper_exoneradas: number;
  mto_oper_inafectas: number;
  mto_igv: number;
  total_impuestos: number;
  valor_venta: number;
  subtotal: number;
  mto_imp_venta: number;
  enlace_pdf: string | null;
  enlace_xml: string | null;
  enlace_cdr: string | null;
  apisperu_response: Record<string, unknown> | null;
  estado_sunat: ComprobanteEstadoSunat;
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

// --- Backward-compat aliases used by pages ---
export type Factura = Comprobante;
export type FacturaEstado = ComprobanteEstadoSunat;

export interface DetraccionPayload {
  cod_bien: string;
  cod_medio_pago: string;
  porcentaje: number;
  monto: number;
  cuenta_bn: string;
}

export interface EmitirComprobantePayload {
  pedido_id: string;
  tipo_doc_codigo: string; // '01' | '03'
  cliente_id: string;
  fecha_emision: string; // 'YYYY-MM-DD'
  subtotal: number;
  igv_monto: number;
  total: number;
  descuento_global_monto?: number;
  descuento_global_codigo?: string;
  direccion_facturacion?: string;
  tipo_operacion?: string; // Cat. 51 — default '0101'
  detraccion?: DetraccionPayload;
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
    descuento_linea_monto?: number;
  }[];
}

export interface EnviarSunatResponse {
  success: boolean;
  serie_numero?: string;
  enlace_pdf?: string | null;
  enlace_xml?: string | null;
  hash?: string;
  sunatCode?: string;
  sunatDescription?: string;
  error?: string;
  sunatResponse?: Record<string, unknown>;
}

export const facturasService = {
  /**
   * Envía un comprobante ya creado a SUNAT via el API route server-side.
   * Esto descarga PDF/XML, actualiza Storage y cambia estados en BD.
   */
  async enviarASunat(comprobanteId: string): Promise<EnviarSunatResponse> {
    const response = await fetch('/api/facturacion/emitir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comprobante_id: comprobanteId }),
    });
    const data: EnviarSunatResponse = await response.json();
    if (!response.ok && !data.error) {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    return data;
  },

  async getFacturas(): Promise<Comprobante[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('comprobantes')
      .select(`
        *,
        clientes ( razon_social, nombres_contacto, apellidos_contacto, numero_documento ),
        pedidos ( cotizaciones ( numero_correlativo ) )
      `)
      .order('fecha_emision', { ascending: false });
    if (error) throw new Error('No se pudieron obtener los comprobantes');
    return data || [];
  },

  async getComprobanteByPedido(pedidoId: string): Promise<Comprobante | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('pedido_id', pedidoId)
      .maybeSingle();
    if (error) throw new Error('No se pudo obtener el comprobante del pedido');
    return data;
  },

  async emitirComprobante(payload: EmitirComprobantePayload): Promise<string> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('emitir_comprobante', {
      p_pedido_id:                 payload.pedido_id,
      p_tipo_doc_codigo:           payload.tipo_doc_codigo,
      p_cliente_id:                payload.cliente_id,
      p_fecha_emision:             payload.fecha_emision,
      p_subtotal:                  payload.subtotal,
      p_igv_monto:                 payload.igv_monto,
      p_total:                     payload.total,
      p_lineas:                    payload.lineas,
      p_direccion_facturacion:     payload.direccion_facturacion ?? null,
      p_descuento_global_monto:    payload.descuento_global_monto ?? 0,
      p_descuento_global_codigo:   payload.descuento_global_codigo ?? null,
      p_tipo_operacion:            payload.tipo_operacion ?? '0101',
      p_detraccion_cod_bien:       payload.detraccion?.cod_bien ?? null,
      p_detraccion_cod_medio_pago: payload.detraccion?.cod_medio_pago ?? null,
      p_detraccion_porcentaje:     payload.detraccion?.porcentaje ?? null,
      p_detraccion_monto:          payload.detraccion?.monto ?? null,
      p_detraccion_cuenta_bn:      payload.detraccion?.cuenta_bn ?? null,
    });
    if (error) throw new Error(error.message || 'No se pudo emitir el comprobante');
    return data as string; // returns comprobante_id (UUID)
  },

  async createNotaCredito(payload: {
    comprobante_id: string;
    motivo: string;
    tipo_nota_codigo?: string; // catálogo 09 SUNAT, ej: '01' = Anulación
  }): Promise<Comprobante> {
    const supabase = createClient();

    // Intentar RPC atómica (migración 008); fallback a operación legacy si aún no existe
    const { data: rpcId, error: rpcError } = await supabase.rpc('crear_nota_credito', {
      p_comprobante_id:   payload.comprobante_id,
      p_motivo:          payload.motivo,
      p_tipo_nota_codigo: payload.tipo_nota_codigo ?? null,
    });

    if (rpcError) {
      const isMissing = rpcError.code === 'PGRST202' || rpcError.message?.includes('crear_nota_credito');
      if (!isMissing) throw new Error('No se pudo crear la nota de crédito');
      return facturasService._createNotaCreditoLegacy(payload);
    }

    const { data, error } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('id', rpcId as string)
      .single();
    if (error) throw new Error('Nota de crédito creada pero no se pudo recuperar el registro');
    return data;
  },

  async _createNotaCreditoLegacy(payload: {
    comprobante_id: string;
    motivo: string;
    tipo_nota_codigo?: string;
  }): Promise<Comprobante> {
    const supabase = createClient();

    const { data: original, error: origErr } = await supabase
      .from('comprobantes')
      .select('pedido_id, cliente_id')
      .eq('id', payload.comprobante_id)
      .single();
    if (origErr || !original) throw origErr ?? new Error('Comprobante original no encontrado');

    const { data, error } = await supabase
      .from('comprobantes')
      .insert([{
        pedido_id:                original.pedido_id,
        cliente_id:               original.cliente_id,
        tipo_doc_codigo:          '07',
        serie:                    'NC01',
        correlativo:              0,
        serie_numero:             'NC-PENDIENTE',
        comprobante_referencia_id: payload.comprobante_id,
        motivo_nota:              payload.motivo,
        tipo_nota_codigo:         payload.tipo_nota_codigo ?? null,
        estado_sunat:             'borrador',
      }])
      .select()
      .single();
    if (error) throw new Error('No se pudo crear la nota de crédito');

    const { error: updateError } = await supabase
      .from('comprobantes')
      .update({ estado_sunat: 'anulada' as ComprobanteEstadoSunat })
      .eq('id', payload.comprobante_id);
    if (updateError) throw new Error('Nota de crédito creada pero no se pudo anular el comprobante original');

    return data;
  },
};
