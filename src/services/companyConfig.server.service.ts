import { createClient } from '@/lib/supabase/server';
import type { CompanyConfig } from './companyConfig.service';

/**
 * Server-side version of getCompanyConfig.
 * Uses the server Supabase client for Server Components.
 */
export const getCompanyConfigServer = async (): Promise<CompanyConfig | null> => {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('empresa_configuracion')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found — valid for first-time setup
    if (error.code === 'PGRST116') return null;
    throw new Error('Error al cargar configuración: ' + error.message);
  }
  return data as CompanyConfig;
};
