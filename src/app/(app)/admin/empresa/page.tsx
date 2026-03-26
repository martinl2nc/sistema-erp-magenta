'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCompanyConfig, useSaveCompanyConfig, useUploadCompanyLogo, useDeleteCompanyLogo } from '@/hooks/useCompanyConfig';
import AdminTabs from '@/components/admin/AdminTabs';
import type { CompanyConfigFormData } from '@/services/companyConfig.service';

const initialFormState: CompanyConfigFormData = {
  razon_social: '',
  ruc: '',
  direccion: '',
  cuentas_bancarias: '',
  terminos_condiciones: '',
  logo_url: null,
};

export default function CompanyConfigPage() {
  const { data: config, isLoading, isError, error } = useCompanyConfig();
  const saveMutation = useSaveCompanyConfig();
  const uploadMutation = useUploadCompanyLogo();
  const deleteMutation = useDeleteCompanyLogo();

  const [formData, setFormData] = useState<CompanyConfigFormData>(initialFormState);
  const [initialized, setInitialized] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when data loads
  useEffect(() => {
    if (!initialized && !isLoading && config) {
      setFormData({
        razon_social: config.razon_social || '',
        ruc: config.ruc || '',
        direccion: config.direccion || '',
        cuentas_bancarias: config.cuentas_bancarias || '',
        terminos_condiciones: config.terminos_condiciones || '',
        logo_url: config.logo_url || null,
      });
      setInitialized(true);
    }
    // If no config exists yet (null), keep defaults
    if (!initialized && !isLoading && config === null) {
      setInitialized(true);
    }
  }, [config, isLoading, initialized]);

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
      await saveMutation.mutateAsync({ id: config?.id ?? null, data: newFormData });
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
      await saveMutation.mutateAsync({ id: config?.id ?? null, data: newFormData });
      toast.success('Logo eliminado correctamente.');
    } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar el logo.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.razon_social.trim()) {
      setErrorMsg('La Razón Social es obligatoria.');
      return;
    }
    if (!formData.ruc.trim()) {
      setErrorMsg('El RUC es obligatorio.');
      return;
    }

    saveMutation.mutate(
      { id: config?.id ?? null, data: formData },
      {
        onSuccess: () => toast.success('Configuración guardada correctamente.'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ─── Content area based on state ───────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="max-w-[800px] w-full mx-auto">
          <div className="bg-[#181B21] border border-[#334155] rounded-xl shadow-sm p-6 sm:p-8 space-y-6 animate-pulse">
            <div className="h-6 bg-[#334155]/50 rounded w-2/3"></div>
            <div className="h-4 bg-[#334155]/30 rounded w-1/2"></div>
            <div className="h-px bg-[#334155]"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-10 bg-[#334155]/30 rounded"></div>
              <div className="h-10 bg-[#334155]/30 rounded"></div>
            </div>
            <div className="h-10 bg-[#334155]/30 rounded"></div>
            <div className="h-24 bg-[#334155]/30 rounded"></div>
            <div className="h-24 bg-[#334155]/30 rounded"></div>
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="max-w-[800px] w-full mx-auto">
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm font-medium">
            Error al cargar configuración: {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[800px] w-full mx-auto">
        <div className="bg-[#181B21] border border-[#334155] rounded-xl shadow-sm flex flex-col p-6 sm:p-8">

          {/* Logo Section */}
          <div className="mb-8 border-b border-[#334155] pb-6">
            <h2 className="text-lg font-semibold tracking-tight text-[#E2E8F0] mb-1.5">Logo de Empresa</h2>
            <p className="text-sm text-[#94A3B8] mb-4">Este logo aparecerá en el menú de la aplicación y en los PDFs generados.</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-32 h-32 shrink-0 bg-[#0F1115] border-2 border-dashed border-[#334155] rounded-xl flex items-center justify-center overflow-hidden relative group">
                 {formData.logo_url ? (
                    <img
                       src={formData.logo_url}
                       alt="Logo Empresa"
                       className="max-w-full max-h-full object-contain p-2"
                    />
                 ) : (
                    <div className="text-[#94A3B8] flex flex-col items-center">
                       <iconify-icon icon="solar:gallery-upload-linear" class="text-3xl mb-1"></iconify-icon>
                       <span className="text-xs font-medium">Sin logo</span>
                    </div>
                 )}
                 {uploadMutation.isPending && (
                    <div className="absolute inset-0 bg-[#0F1115]/80 flex flex-col items-center justify-center z-10">
                       <iconify-icon icon="line-md:loading-twotone-loop" class="text-3xl text-[#3B82F6]"></iconify-icon>
                    </div>
                 )}
              </div>

              <div className="flex flex-col gap-3">
                 <input
                   type="file"
                   ref={fileInputRef}
                   onChange={handleLogoUpload}
                   accept="image/png, image/jpeg, image/webp, image/svg+xml"
                   className="hidden"
                 />
                 <button
                   type="button"
                   disabled={uploadMutation.isPending || deleteMutation.isPending}
                   onClick={() => fileInputRef.current?.click()}
                   className="px-4 py-2 bg-[#334155]/50 hover:bg-[#334155] border border-[#334155] text-[#E2E8F0] text-sm font-medium rounded-lg transition-colors flex items-center gap-2 w-fit disabled:opacity-50"
                 >
                   <iconify-icon icon="solar:upload-linear" class="text-lg"></iconify-icon>
                   {formData.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                 </button>

                 {formData.logo_url && (
                    <button
                      type="button"
                      disabled={uploadMutation.isPending || deleteMutation.isPending}
                      onClick={handleDeleteLogo}
                      className="px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] hover:text-[#EF4444] text-sm font-medium rounded-lg transition-colors flex items-center gap-2 w-fit disabled:opacity-50"
                    >
                      <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon>
                      Eliminar Logo
                    </button>
                 )}
                 <p className="text-xs text-[#94A3B8] max-w-[250px]">
                   Formatos soportados: PNG, JPG, WEBP, SVG. Tamaño máximo: 2MB. Recomendado: fondo transparente.
                 </p>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8 border-b border-[#334155] pb-5">
            <h2 className="text-lg font-semibold tracking-tight text-[#E2E8F0]">Datos Legales para el PDF</h2>
            <p className="text-sm text-[#94A3B8] mt-1.5">Esta información se imprimirá en la cabecera y pie de página de las cotizaciones.</p>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-6 bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Razón Social + RUC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Razón Social</label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Ej. Tech Solutions S.A.C."
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">RUC</label>
                <input
                  type="text"
                  name="ruc"
                  value={formData.ruc}
                  onChange={handleChange}
                  placeholder="Ej. 20123456789"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
                />
              </div>
            </div>

            {/* Row 2: Dirección */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Dirección Principal</label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Ej. Av. Principal 123, Distrito, Ciudad"
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
              />
            </div>

            {/* Row 3: Cuentas Bancarias */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Cuentas Bancarias</label>
              <textarea
                rows={4}
                name="cuentas_bancarias"
                value={formData.cuentas_bancarias}
                onChange={handleChange}
                placeholder={"Ej. BCP Soles: 191-1234567-0-12\nBCP Dólares: 191-1234567-1-12"}
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow resize-y"
              ></textarea>
            </div>

            {/* Row 4: Términos y Condiciones */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Términos y Condiciones Estándar</label>
              <textarea
                rows={4}
                name="terminos_condiciones"
                value={formData.terminos_condiciones}
                onChange={handleChange}
                placeholder="Ej. La presente cotización tiene una validez de 15 días calendario..."
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow resize-y"
              ></textarea>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-6 border-t border-[#334155] mt-8">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex justify-center items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21] disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Page Header & Tabs */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Administración del Sistema</h1>

          {/* Tabs */}
          <AdminTabs />
        </div>

        {renderContent()}

        {/* Spacer */}
        <div className="h-8"></div>
      </main>
    </div>
  );
}
