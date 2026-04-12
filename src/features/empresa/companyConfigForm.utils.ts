import type { CompanyConfigFormData } from '@/services/companyConfig.service';

/**
 * Valida los datos del formulario de configuración de empresa.
 * Retorna el mensaje de error o null si es válido.
 */
export function validateCompanyConfig(data: CompanyConfigFormData): string | null {
  if (!data.razon_social.trim()) {
    return 'La Razón Social es obligatoria.';
  }
  if (!data.ruc.trim()) {
    return 'El RUC es obligatorio.';
  }
  return null;
}
