import { createClient } from '@/lib/supabase/client';

export interface Seller {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface SellerFormData {
  nombre: string;
  email: string;
  activo: boolean;
}

export interface CreateSellerData {
  nombre: string;
  email: string;
  password: string;
}

export interface SellersListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedSellers {
  data: Seller[];
  count: number;
}

export const sellersService = {
  async getSellers(params?: SellersListParams): Promise<PaginatedSellers> {
    const supabase = createClient();
    const { page = 1, pageSize = 10, search } = params ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('perfiles_usuario')
      .select('*', { count: 'exact' })
      .eq('rol', 'vendedor')
      .order('nombre', { ascending: true })
      .range(from, to);

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`nombre.ilike.${term},email.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as Seller[], count: count ?? 0 };
  },

  async getSellersActive(): Promise<Seller[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('id, nombre, email, activo')
      .eq('rol', 'vendedor')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Seller[];
  },

  async createSeller(seller: CreateSellerData): Promise<Seller> {
    const response = await fetch('/api/admin/create-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seller),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al crear el vendedor');
    }
    return data;
  },

  async updateSeller(id: string, seller: Partial<SellerFormData>): Promise<Seller> {
    const response = await fetch(`/api/admin/update-seller/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seller),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar el vendedor');
    }
    return data;
  },

  async deleteSeller(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('perfiles_usuario')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleSellerActive(id: string, currentStatus: boolean): Promise<Seller> {
    return sellersService.updateSeller(id, { activo: !currentStatus });
  },
};
