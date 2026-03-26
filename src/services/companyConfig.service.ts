import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────

export interface CompanyConfig {
  id: string;
  razon_social: string;
  ruc: string;
  direccion: string | null;
  cuentas_bancarias: string | null;
  terminos_condiciones: string | null;
  logo_url: string | null;
}

export interface CompanyConfigFormData {
  razon_social: string;
  ruc: string;
  direccion: string;
  cuentas_bancarias: string;
  terminos_condiciones: string;
  logo_url: string | null;
}

// ─── Service Functions (Capa 1) ──────────────────────────────

/**
 * Gets the single company configuration row.
 * This table follows a singleton pattern (always 1 row).
 */
export const getCompanyConfig = async (): Promise<CompanyConfig | null> => {
  const supabase = createClient();
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

/**
 * Updates the existing company configuration row.
 * If no row exists, inserts a new one (upsert).
 */
export const saveCompanyConfig = async (
  id: string | null,
  data: CompanyConfigFormData
): Promise<CompanyConfig> => {
  const supabase = createClient();
  if (id) {
    const { data: updated, error } = await supabase
      .from('empresa_configuracion')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Error al guardar configuración: ' + error.message);
    return updated as CompanyConfig;
  } else {
    const { data: created, error } = await supabase
      .from('empresa_configuracion')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error('Error al crear configuración: ' + error.message);
    return created as CompanyConfig;
  }
};

/**
 * Uploads a company logo to the 'company-assets' storage bucket.
 * Returns the public URL of the uploaded image.
 */
export const uploadCompanyLogo = async (file: File): Promise<string> => {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const filePath = `logos/company-logo-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error('Error al subir el logo: ' + uploadError.message);
  }

  const { data } = supabase.storage
    .from('company-assets')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Deletes a company logo from the 'company-assets' storage bucket.
 */
export const deleteCompanyLogo = async (publicUrl: string): Promise<void> => {
  const supabase = createClient();
  try {
    const urlParts = publicUrl.split('/company-assets/');
    if (urlParts.length !== 2) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('company-assets')
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar logo del storage:', error);
    }
  } catch (err) {
    console.error('Unexpected error deleting company logo:', err);
  }
};
