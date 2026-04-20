'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCompanyConfigFormState } from './useCompanyConfigFormState';
import { useCuentasBancarias, useCreateCuentaBancaria, useUpdateCuentaBancaria, useDeleteCuentaBancaria } from '@/hooks/useCobros';
import type { CuentaBancaria } from '@/services/cobros.service';
import type { CompanyConfig } from '@/services/companyConfig.service';

interface Props {
  initialConfig: CompanyConfig | null;
}

export default function CompanyConfigForm({ initialConfig }: Props) {
  const {
    formData,
    isLoading,
    isError,
    error,
    errorMsg,
    saveMutation,
    uploadMutation,
    deleteMutation,
    fileInputRef,
    setErrorMsg,
    handleChange,
    handleLogoUpload,
    handleDeleteLogo,
    handleSubmit,
  } = useCompanyConfigFormState({ initialConfig });

  // Bank accounts CRUD
  const { data: cuentasBancarias = [], isLoading: loadingCuentas } = useCuentasBancarias();
  const createCuentaMutation = useCreateCuentaBancaria();
  const updateCuentaMutation = useUpdateCuentaBancaria();
  const deleteCuentaMutation = useDeleteCuentaBancaria();
  const [showAddCuenta, setShowAddCuenta] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCuenta, setEditCuenta] = useState<Partial<CuentaBancaria>>({});
  const [nuevaCuenta, setNuevaCuenta] = useState({
    banco: '',
    numero_cuenta: '',
    cci: '',
    moneda: 'PEN',
    es_detraccion: false,
  });

  const handleAddCuenta = async () => {
    if (!nuevaCuenta.banco.trim() || !nuevaCuenta.numero_cuenta.trim()) {
      toast.error('Banco y número de cuenta son obligatorios.');
      return;
    }
    try {
      await createCuentaMutation.mutateAsync({
        banco: nuevaCuenta.banco.trim(),
        numero_cuenta: nuevaCuenta.numero_cuenta.trim(),
        cci: nuevaCuenta.cci.trim() || null,
        moneda: nuevaCuenta.moneda,
        es_detraccion: nuevaCuenta.es_detraccion,
      });
      toast.success('Cuenta bancaria agregada.');
      setNuevaCuenta({ banco: '', numero_cuenta: '', cci: '', moneda: 'PEN', es_detraccion: false });
      setShowAddCuenta(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear cuenta.');
    }
  };

  const handleDeleteCuenta = async (id: string) => {
    try {
      await deleteCuentaMutation.mutateAsync(id);
      toast.success('Cuenta bancaria eliminada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar cuenta.');
    }
  };

  const handleEditClick = (cb: CuentaBancaria) => {
    if (cb._tiene_pagos) return;
    setEditingId(cb.id);
    setEditCuenta({
      banco: cb.banco,
      numero_cuenta: cb.numero_cuenta,
      cci: cb.cci || '',
      moneda: cb.moneda,
      es_detraccion: cb.es_detraccion,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCuenta({});
  };

  const handleUpdateCuenta = async () => {
    if (!editingId || !editCuenta.banco?.trim() || !editCuenta.numero_cuenta?.trim()) {
      toast.error('Banco y número de cuenta son obligatorios.');
      return;
    }
    try {
      await updateCuentaMutation.mutateAsync({
        id: editingId,
        cuenta: {
          banco: editCuenta.banco.trim(),
          numero_cuenta: editCuenta.numero_cuenta.trim(),
          cci: editCuenta.cci?.trim() || null,
          moneda: editCuenta.moneda,
          es_detraccion: editCuenta.es_detraccion,
        }
      });
      toast.success('Cuenta bancaria actualizada.');
      setEditingId(null);
      setEditCuenta({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar cuenta.');
    }
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

            {/* Row 3: Cuentas Bancarias (CRUD) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">Cuentas Bancarias</label>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Estas cuentas aparecerán en el PDF de cotizaciones y en el módulo de cobranzas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCuenta(!showAddCuenta)}
                  className="text-xs text-[#3B82F6] hover:text-blue-400 font-medium flex items-center gap-1 transition-colors"
                >
                  <iconify-icon icon={showAddCuenta ? 'solar:close-circle-linear' : 'solar:add-circle-linear'} class="text-sm"></iconify-icon>
                  {showAddCuenta ? 'Cancelar' : 'Agregar Cuenta'}
                </button>
              </div>

              {/* Inline Add Form */}
              {showAddCuenta && (
                <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={nuevaCuenta.banco}
                      onChange={(e) => setNuevaCuenta(prev => ({ ...prev, banco: e.target.value }))}
                      placeholder="Banco (ej: BCP)"
                      className="bg-[#181B21] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                    />
                    <input
                      type="text"
                      value={nuevaCuenta.numero_cuenta}
                      onChange={(e) => setNuevaCuenta(prev => ({ ...prev, numero_cuenta: e.target.value }))}
                      placeholder="Nro. Cuenta (ej: 191-1234567-0-01)"
                      className="bg-[#181B21] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={nuevaCuenta.cci}
                      onChange={(e) => setNuevaCuenta(prev => ({ ...prev, cci: e.target.value }))}
                      placeholder="CCI (opcional)"
                      className="bg-[#181B21] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                    />
                    <div className="relative">
                      <select
                        title="Moneda"
                        value={nuevaCuenta.moneda}
                        onChange={(e) => setNuevaCuenta(prev => ({ ...prev, moneda: e.target.value }))}
                        className="appearance-none w-full bg-[#181B21] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
                      >
                        <option value="PEN">PEN (Soles)</option>
                        <option value="USD">USD (Dólares)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
                        <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevaCuenta.es_detraccion}
                        onChange={(e) => setNuevaCuenta(prev => ({ ...prev, es_detraccion: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#334155] bg-[#181B21] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                      />
                      Cuenta de detracción
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCuenta}
                      disabled={createCuentaMutation.isPending}
                      className="bg-[#10B981] hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {createCuentaMutation.isPending ? 'Guardando...' : 'Guardar Cuenta'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Accounts Table */}
              {loadingCuentas ? (
                <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-[#334155]/30 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-[#334155]/20 rounded w-64"></div>
                </div>
              ) : cuentasBancarias.length === 0 ? (
                <div className="bg-[#0F1115] border border-dashed border-[#334155] rounded-lg p-6 text-center">
                  <iconify-icon icon="solar:card-2-linear" class="text-2xl text-[#334155] mb-1"></iconify-icon>
                  <p className="text-xs text-[#94A3B8]">No hay cuentas bancarias registradas.</p>
                </div>
              ) : (
                <div className="border border-[#334155] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0F1115] border-b border-[#334155]">
                        <th className="px-3 py-2 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase">Banco</th>
                        <th className="px-3 py-2 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase">Nro. Cuenta</th>
                        <th className="px-3 py-2 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase hidden sm:table-cell">CCI</th>
                        <th className="px-3 py-2 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase w-[60px]">Moneda</th>
                        <th className="px-3 py-2 text-[10px] font-medium tracking-wider text-[#94A3B8] uppercase w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]">
                       {cuentasBancarias.map((cb) => (
                         editingId === cb.id ? (
                           <tr key={cb.id} className="bg-[#181B21] border-[#334155]/60 border-y">
                             <td className="px-3 py-2">
                               <input type="text" value={editCuenta.banco || ''} onChange={(e) => setEditCuenta(p => ({...p, banco: e.target.value}))} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]" />
                             </td>
                             <td className="px-3 py-2">
                               <input type="text" value={editCuenta.numero_cuenta || ''} onChange={(e) => setEditCuenta(p => ({...p, numero_cuenta: e.target.value}))} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]" />
                             </td>
                             <td className="px-3 py-2 hidden sm:table-cell">
                               <input type="text" value={editCuenta.cci || ''} onChange={(e) => setEditCuenta(p => ({...p, cci: e.target.value}))} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]" />
                             </td>
                             <td className="px-3 py-2">
                               <div className="flex flex-col gap-1.5">
                                 <select value={editCuenta.moneda || 'PEN'} onChange={(e) => setEditCuenta(p => ({...p, moneda: e.target.value}))} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]">
                                   <option value="PEN">PEN</option>
                                   <option value="USD">USD</option>
                                 </select>
                                 <label className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                                   <input type="checkbox" checked={editCuenta.es_detraccion || false} onChange={(e) => setEditCuenta(p => ({...p, es_detraccion: e.target.checked}))} className="w-3 h-3 rounded border-[#334155] bg-[#0F1115] text-[#3B82F6]" />
                                   Detracción
                                 </label>
                               </div>
                             </td>
                             <td className="px-3 py-2 text-right whitespace-nowrap">
                               <button type="button" onClick={handleUpdateCuenta} disabled={updateCuentaMutation.isPending} className="text-emerald-400 hover:text-emerald-300 p-1 mr-1 disabled:opacity-50" title="Guardar cambios">
                                 <iconify-icon icon="solar:check-circle-linear" class="text-lg"></iconify-icon>
                               </button>
                               <button type="button" onClick={handleCancelEdit} className="text-[#94A3B8] hover:text-[#E2E8F0] p-1" title="Cancelar">
                                 <iconify-icon icon="solar:close-circle-linear" class="text-lg"></iconify-icon>
                               </button>
                             </td>
                           </tr>
                         ) : (
                         <tr key={cb.id} className={`hover:bg-[#334155]/10 ${cb._tiene_pagos ? 'opacity-80' : ''}`}>
                           <td className="px-3 py-2.5 text-sm text-[#E2E8F0]">
                             {cb.banco}
                             {cb.es_detraccion && (
                               <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">DETR</span>
                             )}
                           </td>
                           <td className="px-3 py-2.5 text-sm text-[#E2E8F0] font-mono">{cb.numero_cuenta}</td>
                           <td className="px-3 py-2.5 text-sm text-[#94A3B8] font-mono hidden sm:table-cell">{cb.cci || '—'}</td>
                           <td className="px-3 py-2.5 text-xs text-[#94A3B8]">{cb.moneda}</td>
                           <td className="px-3 py-2.5 text-right whitespace-nowrap">
                             <button
                               type="button"
                               onClick={() => handleEditClick(cb)}
                               disabled={cb._tiene_pagos || deleteCuentaMutation.isPending}
                               className={`p-1 mr-1 transition-colors ${cb._tiene_pagos ? 'text-[#334155] cursor-not-allowed' : 'text-[#94A3B8] hover:text-blue-400'}`}
                               title={cb._tiene_pagos ? 'No se puede editar: ya tiene cobros registrados.' : 'Editar cuenta'}
                             >
                               <iconify-icon icon="solar:pen-linear" class="text-sm"></iconify-icon>
                             </button>
                             <button
                               type="button"
                               onClick={() => handleDeleteCuenta(cb.id)}
                               disabled={deleteCuentaMutation.isPending}
                               className="text-[#94A3B8] hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                               title="Eliminar cuenta"
                             >
                               <iconify-icon icon="solar:trash-bin-trash-linear" class="text-sm"></iconify-icon>
                             </button>
                           </td>
                         </tr>
                         )
                       ))}
                    </tbody>
                  </table>
                </div>
              )}
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

  return renderContent();
}
