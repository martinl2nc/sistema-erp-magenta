import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface Category {
  id: string;
  nombre: string;
}

export interface CategoryFormData {
  nombre: string;
}

// ─── Service Functions (Capa 1) ──────────────────────────────

export const getCategories = async (): Promise<Category[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw new Error('Error al cargar categorías: ' + error.message);
  return data as Category[];
};

export const getCategoryProductCount = async (categoryId: string): Promise<number> => {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('categoria_id', categoryId);

  if (error) throw new Error('Error al contar productos: ' + error.message);
  return count || 0;
};

export const createCategory = async (category: CategoryFormData): Promise<Category> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categorias')
    .insert(category)
    .select()
    .single();

  if (error) throw new Error('Error al crear categoría: ' + error.message);
  return data as Category;
};

export const updateCategory = async (id: string, category: CategoryFormData): Promise<Category> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categorias')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Error al actualizar categoría: ' + error.message);
  return data as Category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id);

  if (error) {
    // Error 23503: foreign_key_violation (ON DELETE RESTRICT bloqueó la operación)
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: esta categoría tiene productos asociados. Por favor, reasigna los productos a otra categoría primero.');
    }
    throw new Error('Error al eliminar categoría: ' + error.message);
  }
};
