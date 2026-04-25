import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────

export type EstadoGuiaRemision =
  | 'borrador'
  | 'enviando'
  | 'aceptada_sunat'
  | 'rechazada_sunat';

export interface GuiaRemision {
  id: string;
  serie: string;
  correlativo: number;
  serie_numero: string;
  fecha_emision: string;
  fecha_inicio_traslado: string;
  observacion: string | null;
  pedido_id: string | null;
  comprobante_id: string | null;
  nro_doc_relacionado: string | null;
  tipo_doc_relacionado: string | null;
  cliente_id: string;
  destinatario_tipo_doc: string;
  destinatario_num_doc: string;
  destinatario_razon_social: string;
  dir_llegada_ubigueo: string;
  dir_llegada_departamento: string;
  dir_llegada_provincia: string;
  dir_llegada_distrito: string;
  dir_llegada_direccion: string;
  dir_partida_ubigueo: string;
  dir_partida_departamento: string;
  dir_partida_provincia: string;
  dir_partida_distrito: string;
  dir_partida_direccion: string;
  motivo_traslado_codigo: string;
  motivo_traslado_desc: string | null;
  modalidad_traslado: string;
  peso_bruto_total: number;
  unidad_peso: string;
  numero_bultos: number | null;
  transportista_tipo_doc: string | null;
  transportista_num_doc: string | null;
  transportista_razon_social: string | null;
  transportista_placa: string | null;
  conductor_tipo_doc: string | null;
  conductor_num_doc: string | null;
  conductor_nombres: string | null;
  vehiculo_propio_placa: string | null;
  vehiculo_propio_conductor_doc: string | null;
  vehiculo_propio_conductor_nombres: string | null;
  estado_sunat: EstadoGuiaRemision;
  enlace_pdf: string | null;
  enlace_xml: string | null;
  enlace_cdr: string | null;
  apisperu_response: Record<string, unknown> | null;
  creado_por: string | null;
  created_at: string;
  // Join
  clientes?: {
    razon_social: string | null;
    nombres_contacto: string;
    apellidos_contacto: string;
    numero_documento: string | null;
  } | null;
}

export interface GuiaRemisionLinea {
  pedido_linea_id: string | null;
  producto_id: string | null;
  descripcion: string;
  unidad_codigo: string;
  cantidad: number;
  codigo_producto: string | null;
}

export interface EmitirGuiaRemisionPayload {
  pedido_id: string | null;
  comprobante_id: string | null;
  nro_doc_relacionado: string | null;
  tipo_doc_relacionado: string | null;
  cliente_id: string;
  destinatario_tipo_doc: string;
  destinatario_num_doc: string;
  destinatario_razon_social: string;
  dir_llegada_ubigueo: string;
  dir_llegada_departamento: string;
  dir_llegada_provincia: string;
  dir_llegada_distrito: string;
  dir_llegada_direccion: string;
  dir_partida_ubigueo: string;
  dir_partida_departamento: string;
  dir_partida_provincia: string;
  dir_partida_distrito: string;
  dir_partida_direccion: string;
  motivo_traslado_codigo: string;
  motivo_traslado_desc: string | null;
  modalidad_traslado: string;
  fecha_emision: string;
  fecha_inicio_traslado: string;
  peso_bruto_total: number;
  unidad_peso: string;
  numero_bultos: number | null;
  observacion: string | null;
  transportista_tipo_doc: string | null;
  transportista_num_doc: string | null;
  transportista_razon_social: string | null;
  transportista_placa: string | null;
  conductor_tipo_doc: string | null;
  conductor_num_doc: string | null;
  conductor_nombres: string | null;
  vehiculo_propio_placa: string | null;
  vehiculo_propio_conductor_doc: string | null;
  vehiculo_propio_conductor_nombres: string | null;
  lineas: GuiaRemisionLinea[];
}

export interface EmitirGuiaRemisionResult {
  success: boolean;
  serie_numero?: string;
  enlace_pdf?: string | null;
  enlace_xml?: string | null;
  enlace_cdr?: string | null;
  error?: string;
}

export interface GuiasRemisionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
}

export interface PaginatedGuias {
  data: GuiaRemision[];
  count: number;
}

export interface MotivoTraslado {
  codigo: string;
  descripcion: string;
  requiere_descripcion_libre: boolean;
}

// ─── Service Functions ────────────────────────────────────────

export const getGuiasRemision = async (
  params?: GuiasRemisionListParams,
): Promise<PaginatedGuias> => {
  const supabase = createClient();
  const { page = 1, pageSize = 20, search, estado } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('guias_remision')
    .select('*, clientes(razon_social, nombres_contacto, apellidos_contacto, numero_documento)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (estado) query = query.eq('estado_sunat', estado);

  if (search) {
    query = query.or(
      `serie_numero.ilike.%${search}%,destinatario_razon_social.ilike.%${search}%,destinatario_num_doc.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('No se pudieron cargar las guías de remisión');
  return { data: data ?? [], count: count ?? 0 };
};

export const getMotivoTraslado = async (): Promise<MotivoTraslado[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cat_motivo_traslado')
    .select('codigo, descripcion, requiere_descripcion_libre')
    .eq('activo', true)
    .order('codigo');

  if (error) throw new Error('Error al cargar motivos de traslado');
  return data;
};

export const getInitialGuiasRemision = async (
  supabase: SupabaseClient,
  params?: GuiasRemisionListParams,
): Promise<PaginatedGuias> => {
  const { page = 1, pageSize = 20, search, estado } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('guias_remision')
    .select('*, clientes(razon_social, nombres_contacto, apellidos_contacto, numero_documento)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (estado) query = query.eq('estado_sunat', estado);
  if (search) {
    query = query.or(
      `serie_numero.ilike.%${search}%,destinatario_razon_social.ilike.%${search}%,destinatario_num_doc.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('No se pudieron cargar las guías de remisión');
  return { data: data ?? [], count: count ?? 0 };
};

export const emitirGuiaRemision = async (
  payload: EmitirGuiaRemisionPayload,
): Promise<EmitirGuiaRemisionResult> => {
  const response = await fetch('/api/guias-remision/emitir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Error al emitir la guía de remisión');
  }

  return data;
};
