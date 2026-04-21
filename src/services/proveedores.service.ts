import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface Proveedor {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  banco_predeterminado: string | null;
  cuenta_bancaria: string | null;
  cuenta_cci: string | null;
  cuenta_detraccion_bn: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface ProveedorFormData {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  email: string;
  telefono: string;
  direccion: string;
  banco_predeterminado: string;
  cuenta_bancaria: string;
  cuenta_cci: string;
  cuenta_detraccion_bn: string;
}

export interface ProveedoresListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedProveedores {
  data: Proveedor[];
  count: number;
}

// ─── Service Functions ───────────────────────────────────────

export const getProveedores = async (params?: ProveedoresListParams): Promise<PaginatedProveedores> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('proveedores')
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
  if (error) throw new Error('Error al cargar proveedores: ' + error.message);
  return { data: (data ?? []) as Proveedor[], count: count ?? 0 };
};

export const getActiveProveedores = async (): Promise<Proveedor[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error('Error al cargar proveedores activos: ' + error.message);
  return data as Proveedor[];
};

export const getActiveProveedoresSSR = async (
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
): Promise<Proveedor[]> => {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error('Error al cargar proveedores activos: ' + error.message);
  return (data ?? []) as Proveedor[];
};

export const createProveedor = async (proveedor: ProveedorFormData): Promise<Proveedor> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('proveedores')
    .insert(proveedor)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('numero_documento')) {
      throw new Error('Ya existe un proveedor con este número de documento.');
    }
    if (error.code === '23505') {
      throw new Error('Ya existe un proveedor con estos datos.');
    }
    throw new Error('Error al crear proveedor: ' + error.message);
  }
  return data as Proveedor;
};

export const updateProveedor = async (id: string, proveedor: Partial<ProveedorFormData>): Promise<Proveedor> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('proveedores')
    .update(proveedor)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('numero_documento')) {
      throw new Error('Ya existe otro proveedor con este número de documento.');
    }
    if (error.code === '23505') {
      throw new Error('Ya existe otro proveedor con estos datos.');
    }
    throw new Error('Error al actualizar proveedor: ' + error.message);
  }
  return data as Proveedor;
};

export const toggleProveedorActive = async (id: string, activo: boolean): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('proveedores')
    .update({ activo })
    .eq('id', id);

  if (error) throw new Error('Error al cambiar estado: ' + error.message);
};

export const deleteProveedor = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: este proveedor tiene comprobantes asociados. Puedes desactivarlo en su lugar.');
    }
    throw new Error('Error al eliminar proveedor: ' + error.message);
  }
};
