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

  async createSeller(seller: SellerFormData): Promise<Seller> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .insert([{ ...seller, rol: 'vendedor' }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSeller(id: string, seller: Partial<SellerFormData>): Promise<Seller> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .update(seller)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .update({ activo: !currentStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
