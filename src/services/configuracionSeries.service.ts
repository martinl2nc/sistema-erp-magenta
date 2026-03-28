import { createClient } from '@/lib/supabase/client';

export interface ConfiguracionSerie {
  id: string;
  tipo_comprobante: 'factura' | 'boleta';
  serie: string;
  correlativo_actual: number;
  activo: boolean;
}

export const configuracionSeriesService = {
  async getSerieByTipo(tipoComprobante: 'factura' | 'boleta'): Promise<ConfiguracionSerie | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('configuracion_series')
      .select('*')
      .eq('tipo_comprobante', tipoComprobante)
      .eq('activo', true)
      .order('serie', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
