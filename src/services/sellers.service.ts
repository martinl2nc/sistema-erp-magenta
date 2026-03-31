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

export const sellersService = {
  async getSellers(): Promise<Seller[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('rol', 'vendedor')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
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
