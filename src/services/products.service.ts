import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface Product {
  id: string;
  woo_product_id: number | null;
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  precio_base: string; // numeric comes as string from Supabase
  activo: boolean;
  unidad_medida: string;
  afectacion_igv: string;
  fraccionable: boolean;
  fecha_creacion: string;
  categorias: { nombre: string } | null; // Relational join
}

export interface ProductFormData {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria_id: string | null;
  precio_base: number;
  unidad_medida: string;
  afectacion_igv: string;
  fraccionable: boolean;
}

// ─── Service Functions (Capa 1) ──────────────────────────────

export interface ProductsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedProducts {
  data: Product[];
  count: number;
}

export const getProducts = async (params?: ProductsListParams): Promise<PaginatedProducts> => {
  const supabase = createClient();
  const { page = 1, pageSize = 10, search } = params ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('productos')
    .select('*, categorias(nombre)', { count: 'exact' })
    .order('fecha_creacion', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`sku.ilike.${term},nombre.ilike.${term}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar productos: ' + error.message);
  return { data: (data ?? []) as Product[], count: count ?? 0 };
};

export const createProduct = async (product: ProductFormData): Promise<Product> => {
  const supabase = createClient();
  const payload = {
    ...product,
    categoria_id: product.categoria_id || null,
  };

  const { data, error } = await supabase
    .from('productos')
    .insert(payload)
    .select('*, categorias(nombre)')
    .single();

  if (error) throw new Error('Error al crear producto: ' + error.message);
  return data as Product;
};

export const updateProduct = async (id: string, product: Partial<ProductFormData>): Promise<Product> => {
  const supabase = createClient();
  const payload = {
    ...product,
    categoria_id: product.categoria_id || null,
  };

  const { data, error } = await supabase
    .from('productos')
    .update(payload)
    .eq('id', id)
    .select('*, categorias(nombre)')
    .single();

  if (error) throw new Error('Error al actualizar producto: ' + error.message);
  return data as Product;
};

export const toggleProductActive = async (id: string, activo: boolean): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('productos')
    .update({ activo })
    .eq('id', id);

  if (error) throw new Error('Error al cambiar estado: ' + error.message);
};

export const deleteProduct = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: este producto tiene cotizaciones asociadas.');
    }
    throw new Error('Error al eliminar producto: ' + error.message);
  }
};
