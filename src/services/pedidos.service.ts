import { createClient } from '@/lib/supabase/client';

// ─── Pedido Lineas ────────────────────────────────────────────

export interface PedidoLinea {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  unidad_sunat: string;
  afectacion_igv: string;
}

export interface CreatePedidoLineaPayload {
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  unidad_sunat?: string;
  afectacion_igv?: string;
}

// ─── Pedido ───────────────────────────────────────────────────

export type PedidoEstado =
  | 'pendiente_facturacion'
  | 'procesando'
  | 'enviado_sunat'
  | 'facturado'
  | 'error_sunat'
  | 'anulado';

export interface Pedido {
  id: string;
  cotizacion_id: string;
  vendedor_id: string | null;
  nro_oc_cliente: string | null;
  sustento_url: string;
  sustento_nombre: string | null;
  observaciones: string | null;
  fecha_pedido: string | null;
  tipo_comprobante: 'factura' | 'boleta' | null;
  direccion_facturacion: string | null;
  estado: PedidoEstado;
  estado_sunat: string | null;
  ticket_resumen: string | null;
  error_detalle: string | null;
  fecha_creacion: string;
  ultima_actualizacion: string;
  // Relations
  cotizaciones?: {
    numero_correlativo: number;
    total_final: number;
    aplica_igv: boolean;
    subtotal: number;
    igv_monto: number;
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
  };
  perfiles_usuario?: { nombre: string };
}

export interface CreatePedidoPayload {
  cotizacion_id: string;
  vendedor_id: string | null;
  nro_oc_cliente?: string;
  sustento_url: string;
  sustento_nombre?: string;
  observaciones?: string;
  fecha_pedido?: string;
}

export const pedidosService = {
  async getPedidos(): Promise<Pedido[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        cotizaciones (
          numero_correlativo, total_final, aplica_igv, subtotal, igv_monto,
          clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, tipo_documento, email, direccion, comprobante_preferido, ubigueo )
        ),
        perfiles_usuario ( nombre )
      `)
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPedidoById(id: string): Promise<Pedido> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        cotizaciones (
          numero_correlativo, total_final, aplica_igv, subtotal, igv_monto,
          clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, tipo_documento, email, direccion, comprobante_preferido, ubigueo )
        ),
        perfiles_usuario ( nombre )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async uploadSustento(file: File, cotizacionId: string): Promise<{ path: string; nombre: string }> {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${cotizacionId}/${Date.now()}.${ext}`;
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
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('fecha_creacion', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createPedidoLineas(lineas: CreatePedidoLineaPayload[]): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos_lineas')
      .insert(lineas);
    if (error) throw error;
  },

  async updateEstado(id: string, estado: PedidoEstado, extra?: { error_detalle?: string }): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos')
      .update({ estado, ...extra })
      .eq('id', id);
    if (error) throw error;
  },

  async updateForEmision(id: string, data: {
    tipo_comprobante: 'factura' | 'boleta';
    direccion_facturacion?: string;
  }): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pedidos')
      .update({ ...data, estado: 'procesando' as PedidoEstado })
      .eq('id', id);
    if (error) throw error;
  },
};
