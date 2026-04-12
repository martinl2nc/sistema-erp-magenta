import { createClient } from '@/lib/supabase/client';

export interface ConfiguracionSerie {
  id: string;
  tipo_doc_codigo: string; // '01' factura, '03' boleta, '07' NC
  serie: string;
  correlativo_actual: number;
  activo: boolean;
}

export const configuracionSeriesService = {
  async getSerieByTipoDoc(tipoDocCodigo: string): Promise<ConfiguracionSerie | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('configuracion_series')
      .select('*')
      .eq('tipo_doc_codigo', tipoDocCodigo)
      .eq('activo', true)
      .order('serie', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
