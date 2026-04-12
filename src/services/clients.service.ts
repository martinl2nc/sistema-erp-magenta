import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface Client {
  id: string;
  tipo_documento: string;
  numero_documento: string | null;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  comprobante_preferido: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface ClientFormData {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  email: string;
  telefono: string;
  direccion: string;
  comprobante_preferido: string;
}

// ─── Service Functions (Capa 1) ──────────────────────────────

export interface ClientsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedClients {
  data: Client[];
  count: number;
}

export const getClients = async (params?: ClientsListParams): Promise<PaginatedClients> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .order('fecha_creacion', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `numero_documento.ilike.${term},razon_social.ilike.${term},nombres_contacto.ilike.${term},apellidos_contacto.ilike.${term},email.ilike.${term}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar clientes: ' + error.message);
  return { data: (data ?? []) as Client[], count: count ?? 0 };
};

export const getActiveClients = async (): Promise<Client[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error('Error al cargar clientes activos: ' + error.message);
  return data as Client[];
};

// Variante SSR: acepta cualquier cliente Supabase (browser o server)
export const getActiveClientsSSR = async (
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error('Error al cargar clientes activos: ' + error.message);
  return (data ?? []) as Client[];
};

export const createClientRecord = async (client: ClientFormData): Promise<Client> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clientes')
    .insert(client)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('clientes_email_unique')) {
      throw new Error('Ya existe un cliente registrado con este correo electrónico.');
    }
    if (error.code === '23505' && error.message.includes('numero_documento')) {
      throw new Error('Ya existe un cliente con este número de documento.');
    }
    throw new Error('Error al crear cliente: ' + error.message);
  }
  return data as Client;
};

export const updateClient = async (id: string, client: Partial<ClientFormData>): Promise<Client> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clientes')
    .update(client)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('clientes_email_unique')) {
      throw new Error('Ya existe otro cliente con este correo electrónico.');
    }
    if (error.code === '23505' && error.message.includes('numero_documento')) {
      throw new Error('Ya existe otro cliente con este número de documento.');
    }
    throw new Error('Error al actualizar cliente: ' + error.message);
  }
  return data as Client;
};

export const toggleClientActive = async (id: string, activo: boolean): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('clientes')
    .update({ activo })
    .eq('id', id);

  if (error) throw new Error('Error al cambiar estado: ' + error.message);
};

export const deleteClient = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: este cliente tiene cotizaciones asociadas. Puedes desactivarlo en su lugar.');
    }
    throw new Error('Error al eliminar cliente: ' + error.message);
  }
};
