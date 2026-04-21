'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCreateProveedor, useUpdateProveedor } from '@/hooks/useProveedores';
import type { Proveedor, ProveedorFormData } from '@/services/proveedores.service';

interface ProveedorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor?: Proveedor | null;
  onSuccess?: (proveedor: Proveedor) => void;
}

const initialFormState: ProveedorFormData = {
  tipo_documento:       'RUC',
  numero_documento:     '',
  razon_social:         '',
  nombres_contacto:     '',
  apellidos_contacto:   '',
  email:                '',
  telefono:             '',
  direccion:            '',
  banco_predeterminado: '',
  cuenta_bancaria:      '',
  cuenta_cci:           '',
  cuenta_detraccion_bn: '',
};

export default function ProveedorFormModal({ isOpen, onClose, proveedor, onSuccess }: ProveedorFormModalProps) {
  const [formData, setFormData] = useState<ProveedorFormData>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingDoc, setIsSearchingDoc] = useState(false);

  const createMutation = useCreateProveedor();
  const updateMutation = useUpdateProveedor();

  const isEditing = Boolean(proveedor);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (proveedor) {
        setFormData({
          tipo_documento:       proveedor.tipo_documento || 'RUC',
          numero_documento:     proveedor.numero_documento || '',
          razon_social:         proveedor.razon_social || '',
          nombres_contacto:     proveedor.nombres_contacto || '',
          apellidos_contacto:   proveedor.apellidos_contacto || '',
          email:                proveedor.email || '',
          telefono:             proveedor.telefono || '',
          direccion:            proveedor.direccion || '',
          banco_predeterminado: proveedor.banco_predeterminado || '',
          cuenta_bancaria:      proveedor.cuenta_bancaria || '',
          cuenta_cci:           proveedor.cuenta_cci || '',
          cuenta_detraccion_bn: proveedor.cuenta_detraccion_bn || '',
        });
      } else {
        setFormData(initialFormState);
      }
      setError(null);
    }
  }, [isOpen, proveedor]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchDoc = async () => {
    const tipo = formData.tipo_documento;
    const numero = formData.numero_documento.trim();

    if (!numero) {
      toast.error('Ingrese un número de documento primero.');
      return;
    }
    if (tipo !== 'DNI' && tipo !== 'RUC') {
      toast.error('La búsqueda automática solo está disponible para DNI y RUC.');
      return;
    }

    setIsSearchingDoc(true);
    try {
      const res = await fetch(`/api/sunat?tipo=${tipo}&numero=${numero}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || 'Error al consultar documento.');
        return;
      }

      toast.success('Datos encontrados y autocompletados.');

      if (tipo === 'DNI') {
        const { nombres, apellidoPaterno, apellidoMaterno } = json.data;
        setFormData(prev => ({
          ...prev,
          nombres_contacto:   nombres || '',
          apellidos_contacto: `${apellidoPaterno || ''} ${apellidoMaterno || ''}`.trim(),
        }));
      } else if (tipo === 'RUC') {
        const { razonSocial, direccion } = json.data;
        setFormData(prev => ({
          ...prev,
          razon_social:       razonSocial || '',
          direccion:          direccion || '',
          nombres_contacto:   '',
          apellidos_contacto: '',
        }));
      }
    } catch {
      toast.error('Error de conexión al consultar el documento.');
    } finally {
      setIsSearchingDoc(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.numero_documento.trim()) {
      setError('El número de documento es obligatorio.');
      return;
    }
    if (!formData.razon_social.trim() && (!formData.nombres_contacto.trim() || !formData.apellidos_contacto.trim())) {
      setError('Ingresá la Razón Social o los Nombres y Apellidos del contacto.');
      return;
    }

    if (isEditing && proveedor) {
      updateMutation.mutate(
        { id: proveedor.id, data: formData },
        {
          onSuccess: (updated) => {
            toast.success('Proveedor actualizado correctamente.');
            if (onSuccess && updated) onSuccess(updated);
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: (created) => {
          toast.success('Proveedor creado correctamente.');
          if (onSuccess && created) onSuccess(created);
          onClose();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181B21] border border-[#334155] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#334155] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-medium text-[#E2E8F0]">
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#E2E8F0] p-1.5 rounded-md hover:bg-[#334155]/40 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-2xl"></iconify-icon>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm font-medium">
              {error}
            </div>
          )}

          <form id="proveedor-form" onSubmit={handleSubmit} className="space-y-6">
            {/* ── Datos Principales ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Tipo de Documento</label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Número de Documento *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="numero_documento"
                    value={formData.numero_documento}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchDoc(); } }}
                    placeholder={formData.tipo_documento === 'DNI' ? 'Ej: 41221501' : 'Ej: 20123456789'}
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                    required
                  />
                  {(formData.tipo_documento === 'RUC' || formData.tipo_documento === 'DNI') && (
                    <button
                      type="button"
                      onClick={handleSearchDoc}
                      disabled={isSearchingDoc || !formData.numero_documento}
                      className="px-3 py-2.5 bg-[#334155]/50 border border-[#334155] hover:bg-[#334155] text-[#E2E8F0] rounded-lg transition-colors focus:outline-none flex items-center justify-center disabled:opacity-50"
                      title={`Buscar en ${formData.tipo_documento === 'RUC' ? 'SUNAT' : 'RENIEC'}`}
                    >
                      {isSearchingDoc
                        ? <iconify-icon icon="line-md:loading-twotone-loop" class="text-xl"></iconify-icon>
                        : <iconify-icon icon="solar:rounded-magnifer-linear" class="text-xl"></iconify-icon>
                      }
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">
                  Razón Social / Empresa <span className="font-normal opacity-70">(Opcional para personas naturales)</span>
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Nombre de la empresa proveedora"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Nombres del Contacto</label>
                <input
                  type="text"
                  name="nombres_contacto"
                  value={formData.nombres_contacto}
                  onChange={handleChange}
                  placeholder="Juan"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Apellidos del Contacto</label>
                <input
                  type="text"
                  name="apellidos_contacto"
                  value={formData.apellidos_contacto}
                  onChange={handleChange}
                  placeholder="Pérez"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">
                  Correo Electrónico <span className="font-normal opacity-70">(Opcional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contacto@proveedor.com"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+51 999 888 777"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Av. Industrial 456, Lima"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {/* ── Datos Bancarios ───────────────────────────────── */}
            <div className="border-t border-[#334155] pt-6 space-y-4">
              <h3 className="text-sm font-medium text-[#94A3B8]">Datos Bancarios</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#94A3B8]">Banco Predeterminado</label>
                  <input
                    type="text"
                    name="banco_predeterminado"
                    value={formData.banco_predeterminado}
                    onChange={handleChange}
                    placeholder="Ej: BCP, BBVA, Scotiabank"
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#94A3B8]">N° Cuenta Bancaria</label>
                  <input
                    type="text"
                    name="cuenta_bancaria"
                    value={formData.cuenta_bancaria}
                    onChange={handleChange}
                    placeholder="Número de cuenta corriente"
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#94A3B8]">Cuenta CCI</label>
                  <input
                    type="text"
                    name="cuenta_cci"
                    value={formData.cuenta_cci}
                    onChange={handleChange}
                    placeholder="Código de cuenta interbancaria"
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#94A3B8]">Cuenta Detracciones BN</label>
                  <input
                    type="text"
                    name="cuenta_detraccion_bn"
                    value={formData.cuenta_detraccion_bn}
                    onChange={handleChange}
                    placeholder="Número de cuenta BN para detracciones"
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#334155] flex justify-end gap-3 shrink-0 bg-[#181B21] rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 border border-[#334155] rounded-lg text-sm font-medium text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors focus:outline-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="proveedor-form"
            disabled={isPending}
            className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21] disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? 'Guardando...' : 'Guardar Proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}
