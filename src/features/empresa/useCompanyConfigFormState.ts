import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCompanyConfig, useSaveCompanyConfig, useUploadCompanyLogo, useDeleteCompanyLogo } from '@/hooks/useCompanyConfig';
import { validateCompanyConfig } from './companyConfigForm.utils';
import type { CompanyConfig, CompanyConfigFormData } from '@/services/companyConfig.service';

const initialFormState: CompanyConfigFormData = {
  razon_social: '',
  ruc: '',
  direccion: '',
  terminos_condiciones: '',
  logo_url: null,
  detraccion_cuenta_bn: '',
};

export interface UseCompanyConfigFormStateProps {
  initialConfig: CompanyConfig | null;
}

export interface UseCompanyConfigFormStateReturn {
  // State
  formData: CompanyConfigFormData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  errorMsg: string | null;
  initialized: boolean;
  
  // Mutations
  saveMutation: ReturnType<typeof useSaveCompanyConfig>;
  uploadMutation: ReturnType<typeof useUploadCompanyLogo>;
  deleteMutation: ReturnType<typeof useDeleteCompanyLogo>;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Setters
  setFormData: React.Dispatch<React.SetStateAction<CompanyConfigFormData>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Handlers
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteLogo: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
}

export const useCompanyConfigFormState = ({
  initialConfig,
}: UseCompanyConfigFormStateProps): UseCompanyConfigFormStateReturn => {
  const { data: config, isLoading, isError, error } = useCompanyConfig();
  const saveMutation = useSaveCompanyConfig();
  const uploadMutation = useUploadCompanyLogo();
  const deleteMutation = useDeleteCompanyLogo();

  // Use initialConfig from server, or fallback to data from query
  const configData = config ?? initialConfig;

  const [formData, setFormData] = useState<CompanyConfigFormData>(initialFormState);
  const [initialized, setInitialized] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when data loads
  useEffect(() => {
    if (!initialized && !isLoading && configData) {
      setFormData({
        razon_social: configData.razon_social || '',
        ruc: configData.ruc || '',
        direccion: configData.direccion || '',
        terminos_condiciones: configData.terminos_condiciones || '',
        logo_url: configData.logo_url || null,
        detraccion_cuenta_bn: configData.detraccion_cuenta_bn || '',
      });
      setInitialized(true);
    }
    // If no config exists yet (null), keep defaults
    if (!initialized && !isLoading && configData === null) {
      setInitialized(true);
    }
  }, [configData, isLoading, initialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrorMsg(null);

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo debe pesar máximo 2MB.');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Formato no soportado. Usa PNG, JPG, WEBP o SVG.');
      return;
    }

    try {
      // 1. Upload new logo
      const publicUrl = await uploadMutation.mutateAsync(file);

      // 2. If there was an old logo, delete it
      if (formData.logo_url) {
        await deleteMutation.mutateAsync(formData.logo_url);
      }

      // 3. Update UI state
      const newFormData = { ...formData, logo_url: publicUrl };
      setFormData(newFormData);

      // 4. Save automatically to DB
      await saveMutation.mutateAsync({ id: configData?.id ?? null, data: newFormData });
      toast.success('Logo subido y guardado correctamente.');

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el logo.');
    }
  };

  const handleDeleteLogo = async () => {
    if (!formData.logo_url) return;
    setErrorMsg(null);

    try {
      // 1. Delete from storage
      await deleteMutation.mutateAsync(formData.logo_url);

      // 2. Update UI state
      const newFormData = { ...formData, logo_url: null };
      setFormData(newFormData);

      // 3. Save to DB
      await saveMutation.mutateAsync({ id: configData?.id ?? null, data: newFormData });
      toast.success('Logo eliminado correctamente.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el logo.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateCompanyConfig(formData);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    saveMutation.mutate(
      { id: configData?.id ?? null, data: formData },
      {
        onSuccess: () => toast.success('Configuración guardada correctamente.'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return {
    // State
    formData,
    isLoading,
    isError,
    error: error as Error | null,
    errorMsg,
    initialized,
    
    // Mutations
    saveMutation,
    uploadMutation,
    deleteMutation,
    
    // Refs
    fileInputRef,
    
    // Setters
    setFormData,
    setErrorMsg,
    
    // Handlers
    handleChange,
    handleLogoUpload,
    handleDeleteLogo,
    handleSubmit,
  };
};
