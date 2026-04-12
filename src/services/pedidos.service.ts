import { createClient } from '@/lib/supabase/client';

// ─── Pedido Lineas ────────────────────────────────────────────

export interface PedidoLinea {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto_historico: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  descuento_linea_monto: number;
  sku: string | null; // SKU del producto para facturación
}

export interface CreatePedidoLineaPayload {
  pedido_id: string;
  producto_id: string | null;
  nombre_producto_historico: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  descuento_linea_monto?: number;
}

// ─── Pedido ───────────────────────────────────────────────────

export type PedidoEstado =
  | 'pendiente_facturacion'
  | 'procesando_facturacion'
  | 'facturado'
  | 'error_facturacion'
  | 'anulado';

export interface Pedido {
  id: string;
  cotizacion_id: string | null;
  cliente_id: string;
  vendedor_id: string | null;
  numero_pedido: number;
  nro_oc_cliente: string | null;
  sustento_url: string;
  sustento_nombre: string | null;
  observaciones: string | null;
  fecha_pedido: string | null;
  direccion_facturacion: string | null;
  // Financial fields (stored directly on pedidos)
  aplica_igv: boolean;
  subtotal: number;
  descuento_global_monto: number;
  igv_monto: number;
  total_final: number;
  estado: PedidoEstado;
  fecha_creacion: string;
  ultima_actualizacion: string;
  // Relations
  cotizaciones?: {
    numero_correlativo: number;
  } | null;
  clientes?: {
    id: string;
    razon_social: string | null;
    nombres_contacto: string;
    apellidos_contacto: string;
    numero_documento: string | null;
    tipo_documento: string;
    email: string;
    direccion: string | null;
    comprobante_preferido: string;
    ubigueo: string;
  };
  perfiles_usuario?: { nombre: string };
}

export interface CreatePedidoPayload {
  cotizacion_id?: string;
  cliente_id: string;
  vendedor_id: string | null;
  nro_oc_cliente?: string;
  sustento_url: string;
  sustento_nombre?: string;
  observaciones?: string;
  fecha_pedido?: string;
  direccion_facturacion?: string;
  // Financial fields
  aplica_igv: boolean;
  subtotal: number;
  descuento_global_monto: number;
  igv_monto: number;
  total_final: number;
}

export interface UpdatePedidoBasicPayload {
  nro_oc_cliente?: string | null;
  observaciones?: string | null;
  fecha_pedido?: string | null;
  direccion_facturacion?: string | null;
}

export interface PedidosListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
  vendedor_id?: string;
}

export interface PaginatedPedidos {
  data: Pedido[];
  count: number;
}

export const pedidosService = {
  async getPedidos(params?: PedidosListParams): Promise<PaginatedPedidos> {
    const supabase = createClient();
    const { page = 1, pageSize = 10, search, estado, vendedor_id } = params ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('pedidos')
      .select(
        `*, cotizaciones ( numero_correlativo ), clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, tipo_documento, email, direccion, comprobante_preferido, ubigueo ), perfiles_usuario ( nombre )`,
        { count: 'exact' }
      )
      .order('fecha_creacion', { ascending: false })
      .range(from, to);

    if (search?.trim()) {
      const term = search.trim();
      const pedidoNum = parseInt(term);
      const isNumeric = !isNaN(pedidoNum) && term === String(pedidoNum);

      const { data: matchingClients } = await supabase
        .from('clientes')
        .select('id')
        .or(
          `razon_social.ilike.%${term}%,nombres_contacto.ilike.%${term}%,numero_documento.ilike.%${term}%`
        );

      const clientIds = (matchingClients ?? []).map((c) => c.id);
      const orParts: string[] = [`nro_oc_cliente.ilike.%${term}%`];
      if (isNumeric) orParts.push(`numero_pedido.eq.${pedidoNum}`);
      if (clientIds.length > 0) orParts.push(`cliente_id.in.(${clientIds.join(',')})`);

      query = query.or(orParts.join(','));
    }

    if (estado) query = query.eq('estado', estado);
    if (vendedor_id) query = query.eq('vendedor_id', vendedor_id);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count ?? 0 };
  },

  async getPedidoById(id: string): Promise<Pedido> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        cotizaciones ( numero_correlativo ),
        clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, tipo_documento, email, direccion, comprobante_preferido, ubigueo ),
        perfiles_usuario ( nombre )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async uploadSustento(file: File, cotizacionId?: string | null): Promise<{ path: string; nombre: string }> {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'pdf';
    const folder = cotizacionId || 'directos';
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('sustentos_aprobacion')
      .upload(path, file);
    if (error) throw error;
    return { path, nombre: file.name };
  },

  async getSustentoSignedUrl(path: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('sustentos_aprobacion')
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async createPedido(payload: CreatePedidoPayload): Promise<Pedido> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPedidoLineas(pedidoId: string): Promise<PedidoLinea[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos_lineas')
      .select('*, productos(sku)')
      .eq('pedido_id', pedidoId);
    if (error) throw error;
    // Normalizar: extraer sku del join
    return (data || []).map((l: Record<string, unknown>) => ({
      ...l,
      sku: (l.productos as Record<string, unknown>)?.sku as string | null ?? null,
    }));
  },

  async createPedidoLineas(lineas: CreatePedidoLineaPayload[]): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos_lineas')
      .insert(lineas);
    if (error) throw error;
  },

  async updateEstado(id: string, estado: PedidoEstado): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', id);
    if (error) throw error;
  },

  async updateForEmision(id: string, data: {
    direccion_facturacion?: string;
  }): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos')
      .update({ ...data, estado: 'procesando_facturacion' as PedidoEstado })
      .eq('id', id);
    if (error) throw error;
  },

  async updatePedidoBasic(id: string, data: UpdatePedidoBasicPayload): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos')
      .update(data)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updatePedidoCompleto(id: string, payload: CreatePedidoPayload, lineas: CreatePedidoLineaPayload[]): Promise<void> {
    const supabase = createClient();
    
    // 1. Update cabecera
    const { error: cabeceraError } = await supabase
      .from('pedidos')
      .update(payload)
      .eq('id', id);
    if (cabeceraError) throw cabeceraError;

    // 2. Clear old lines
    const { error: deleteError } = await supabase
      .from('pedidos_lineas')
      .delete()
      .eq('pedido_id', id);
    if (deleteError) throw deleteError;

    // 3. Insert new lines
    const lineasToInsert = lineas.map(l => ({ ...l, pedido_id: id }));
    const { error: lineasError } = await supabase
      .from('pedidos_lineas')
      .insert(lineasToInsert);
    if (lineasError) throw lineasError;
  },
};
