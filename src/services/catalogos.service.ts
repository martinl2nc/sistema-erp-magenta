import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface CatUnidadMedida {
  codigo: string;
  descripcion: string;
}

export interface CatAfectacionIgv {
  codigo: string;
  descripcion: string;
  tipo: string; // 'gravado' | 'exonerado' | 'inafecto' | 'exportacion'
}

export interface CatTipoDocumento {
  codigo: string;
  descripcion: string;
  categoria: string; // 'comprobante' | 'nota'
  activo: boolean;
}

export interface CatTipoNotaCredito {
  codigo: string;
  descripcion: string;
  activo: boolean;
}

// ─── Service ─────────────────────────────────────────────────

export const catalogosService = {
  async getUnidadesMedida(): Promise<CatUnidadMedida[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_unidades_medida')
      .select('codigo, descripcion')
      .order('codigo');
    if (error) throw error;
    return data || [];
  },

  async getAfectacionesIgv(): Promise<CatAfectacionIgv[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_afectacion_igv')
      .select('codigo, descripcion, tipo')
      .order('codigo');
    if (error) throw error;
    return data || [];
  },

  async getTiposDocumento(): Promise<CatTipoDocumento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_documento')
      .select('codigo, descripcion, categoria, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw error;
    return data || [];
  },

  async getTiposNotaCredito(): Promise<CatTipoNotaCredito[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_nota_credito')
      .select('codigo, descripcion, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw error;
    return data || [];
  },
};
