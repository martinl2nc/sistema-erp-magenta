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

export interface CatCargoDescuento {
  codigo: string;
  descripcion: string;
  tipo: 'cargo' | 'descuento';
  active: boolean;
}

export interface CatTipoOperacion {
  codigo: string;
  descripcion: string;
  activo: boolean;
}

export interface CatBienServicioDetraccion {
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
    if (error) throw new Error('Error al cargar unidades de medida: ' + error.message);
    return data || [];
  },

  async getAfectacionesIgv(): Promise<CatAfectacionIgv[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_afectacion_igv')
      .select('codigo, descripcion, tipo')
      .order('codigo');
    if (error) throw new Error('Error al cargar afectaciones IGV: ' + error.message);
    return data || [];
  },

  async getTiposDocumento(): Promise<CatTipoDocumento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_documento')
      .select('codigo, descripcion, categoria, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw new Error('Error al cargar tipos de documento: ' + error.message);
    return data || [];
  },

  async getTiposNotaCredito(): Promise<CatTipoNotaCredito[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_nota_credito')
      .select('codigo, descripcion, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw new Error('Error al cargar tipos de nota de crédito: ' + error.message);
    return data || [];
  },

  async getCargosDescuentos(): Promise<CatCargoDescuento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_cargos_descuentos')
      .select('codigo, descripcion, tipo, active')
      .eq('active', true)
      .order('codigo');
    if (error) throw new Error('Error al cargar cargos y descuentos: ' + error.message);
    return data || [];
  },

  async getTiposOperacion(): Promise<CatTipoOperacion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_tipo_operacion')
      .select('codigo, descripcion, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw new Error('Error al cargar tipos de operación: ' + error.message);
    return data || [];
  },

  async getBienesDetraccion(): Promise<CatBienServicioDetraccion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cat_bien_servicio_detraccion')
      .select('codigo, descripcion, activo')
      .eq('activo', true)
      .order('codigo');
    if (error) throw new Error('Error al cargar bienes de detracción: ' + error.message);
    return data || [];
  },
};
