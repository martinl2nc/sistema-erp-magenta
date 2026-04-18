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
  tipo_nota_codigo: string | null;
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
  origen_emision?: 'sol' | null;
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

export interface DetraccionPayload {
  cod_bien: string;
  cod_medio_pago: string;
  porcentaje: number;
  monto: number;
  cuenta_bn: string;
}

export interface CuotaPayload {
  monto: number;
  fecha: string; // 'YYYY-MM-DD'
}

export interface EmitirComprobantePayload {
  pedido_id: string | null;
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
  forma_pago?: 'Contado' | 'Credito'; // default 'Contado'
  cuotas?: CuotaPayload[];
  lineas: {
    producto_id: string | null;
    sku: string | null;
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

export interface ComprobanteExternoPayload {
  cliente_id: string;
  tipo_doc_codigo: string; // '01' | '03'
  serie: string;
  correlativo: number;
  fecha_emision: string; // 'YYYY-MM-DD'
  subtotal: number;
  igv_monto: number;
  total: number;
  pedido_id?: string | null;
}

export interface ComprobanteDetalleDB {
  id: string;
  comprobante_id: string;
  producto_id: string | null;
  cod_producto: string | null;
  cod_prod_sunat: string | null;
  cod_prod_gs1: string | null;
  unidad_codigo: string;
  descripcion: string;
  cantidad: number;
  mto_valor_unitario: number;
  mto_valor_gratuito: number | null;
  mto_precio_unitario: number;
  mto_valor_venta: number;
  mto_base_igv: number;
  porcentaje_igv: number;
  igv: number;
  tip_afe_igv_codigo: string;
  descuento: number | null;
  tipo_sis_isc_codigo: string | null;
  mto_base_isc: number | null;
  porcentaje_isc: number | null;
  isc: number | null;
  factor_icbper: number | null;
  icbper: number | null;
  total_impuestos: number;
  subtotal: number | null;
}

export interface PedidoElegible {
  id: string;
  numero_pedido: number;
  cliente_id: string;
  estado: string;
}

// ─── SSR Helpers ─────────────────────────────────────────────

export const getComprobanteExternoByIdSSR = async (
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  id: string,
): Promise<Comprobante | null> => {
  const { data, error } = await supabase
    .from('comprobantes')
    .select('*, clientes ( razon_social, nombres_contacto, apellidos_contacto, numero_documento )')
    .eq('id', id)
    .eq('origen_emision', 'sol')
    .maybeSingle();
  if (error) throw new Error('Error al cargar el comprobante: ' + error.message);
  return data as Comprobante | null;
};

export const getPedidosElegiblesSSR = async (
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
): Promise<PedidoElegible[]> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, numero_pedido, cliente_id, estado')
    .in('estado', ['pendiente_facturacion', 'error_facturacion'])
    .order('numero_pedido', { ascending: false });
  if (error) throw new Error('Error al cargar pedidos elegibles: ' + error.message);
  return (data ?? []) as PedidoElegible[];
};

export interface FacturasListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  tipo_doc?: string;
}

export interface PaginatedFacturas {
  data: Comprobante[];
  count: number;
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

  async getFacturas(params?: FacturasListParams): Promise<PaginatedFacturas> {
    const supabase = createClient();
    const { page = 1, pageSize = 10, search, tipo_doc } = params ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('comprobantes')
      .select(
        `*, clientes ( razon_social, nombres_contacto, apellidos_contacto, numero_documento ), pedidos ( cotizaciones ( numero_correlativo ) )`,
        { count: 'exact' }
      )
      .order('fecha_emision', { ascending: false })
      .range(from, to);

    if (tipo_doc) query = query.eq('tipo_doc_codigo', tipo_doc);

    if (search?.trim()) {
      const term = search.trim();

      const { data: matchingClients } = await supabase
        .from('clientes')
        .select('id')
        .or(
          `razon_social.ilike.%${term}%,nombres_contacto.ilike.%${term}%,numero_documento.ilike.%${term}%`
        );

      const clientIds = (matchingClients ?? []).map((c: any) => c.id);
      const orParts: string[] = [`serie_numero.ilike.%${term}%`];
      if (clientIds.length > 0) orParts.push(`cliente_id.in.(${clientIds.join(',')})`);

      query = query.or(orParts.join(','));
    }

    const { data, error, count } = await query;
    if (error) throw new Error('No se pudieron obtener los comprobantes');
    return { data: data || [], count: count ?? 0 };
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
      p_forma_pago:                payload.forma_pago ?? 'Contado',
      p_cuotas:                    payload.cuotas ?? null,
    });

    if (error) {
      // Traducir errores de FK a mensajes user-friendly
      if (error.message?.includes('comprobantes_detraccion_cod_bien_fkey')) {
        throw new Error('El código de bien/servicio para detracción no es válido. Seleccioná uno del catálogo.');
      }
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        throw new Error('Datos de detracción inválidos. Verificá que todos los campos estén correctos.');
      }
      throw new Error(error.message || 'No se pudo emitir el comprobante');
    }
    
    return data as string; // returns comprobante_id (UUID)
  },

  async getDetallesComprobante(comprobanteId: string): Promise<ComprobanteDetalleDB[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('comprobantes_detalles')
      .select('*')
      .eq('comprobante_id', comprobanteId);

    if (error) {
      throw new Error(`Error al obtener detalles: ${error.message}`);
    }
    return (data || []) as ComprobanteDetalleDB[];
  },

  async createNotaCredito(payload: {
    comprobante_id: string;
    motivo: string;
    tipo_nota_codigo?: string; // catálogo 09 SUNAT, ej: '01' = Anulación Total
    lineas?: ComprobanteDetalleDB[];
    totales?: {
      mto_oper_gravadas: number;
      mto_igv: number;
      mto_imp_venta: number;
      valor_venta: number;
      subtotal: number;
      total_impuestos: number;
    };
  }): Promise<Comprobante> {
    const supabase = createClient();

    // RPC atómica: crea la NC, copia/inyecta detalles, anula el original si corresponde
    const { data: rpcId, error: rpcError } = await supabase.rpc('crear_nota_credito', {
      p_comprobante_id:   payload.comprobante_id,
      p_motivo:          payload.motivo,
      p_tipo_nota_codigo: payload.tipo_nota_codigo ?? null,
      p_lineas:           payload.lineas ?? null,
      p_mto_oper_gravadas: payload.totales?.mto_oper_gravadas ?? null,
      p_mto_igv:           payload.totales?.mto_igv ?? null,
      p_mto_imp_venta:     payload.totales?.mto_imp_venta ?? null,
      p_valor_venta:       payload.totales?.valor_venta ?? null,
      p_subtotal:          payload.totales?.subtotal ?? null,
      p_total_impuestos:   payload.totales?.total_impuestos ?? null,
    });

    if (rpcError) {
      throw new Error(`No se pudo crear la nota de crédito: ${rpcError.message}`);
    }

    const { data, error } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('id', rpcId as string)
      .single();
    if (error) throw new Error('Nota de crédito creada pero no se pudo recuperar el registro');
    return data;
  },

  async registrarComprobanteExterno(
    payload: ComprobanteExternoPayload,
    files: { pdf: File; xml: File }
  ): Promise<string> {
    const formData = new FormData();
    formData.append('cliente_id', payload.cliente_id);
    formData.append('tipo_doc_codigo', payload.tipo_doc_codigo);
    formData.append('serie', payload.serie);
    formData.append('correlativo', String(payload.correlativo));
    formData.append('fecha_emision', payload.fecha_emision);
    formData.append('subtotal', String(payload.subtotal));
    formData.append('igv_monto', String(payload.igv_monto));
    formData.append('total', String(payload.total));
    if (payload.pedido_id) formData.append('pedido_id', payload.pedido_id);
    formData.append('pdf', files.pdf);
    formData.append('xml', files.xml);

    const response = await fetch('/api/facturacion/externa', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Error del servidor: ${response.status}`);
    }
    return data.comprobante_id as string;
  },

  async actualizarComprobanteExterno(
    id: string,
    payload: ComprobanteExternoPayload,
    files: { pdf?: File; xml?: File }
  ): Promise<void> {
    const formData = new FormData();
    formData.append('cliente_id', payload.cliente_id);
    formData.append('tipo_doc_codigo', payload.tipo_doc_codigo);
    formData.append('serie', payload.serie);
    formData.append('correlativo', String(payload.correlativo));
    formData.append('fecha_emision', payload.fecha_emision);
    formData.append('subtotal', String(payload.subtotal));
    formData.append('igv_monto', String(payload.igv_monto));
    formData.append('total', String(payload.total));
    if (payload.pedido_id != null) formData.append('pedido_id', payload.pedido_id);
    if (files.pdf) formData.append('pdf', files.pdf);
    if (files.xml) formData.append('xml', files.xml);

    const response = await fetch(`/api/facturacion/externa/${id}`, {
      method: 'PUT',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Error del servidor: ${response.status}`);
    }
  },

};
