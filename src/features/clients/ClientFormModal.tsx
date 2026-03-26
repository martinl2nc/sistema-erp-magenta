'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCreateClient, useUpdateClient } from '@/hooks/useClients';
import type { Client, ClientFormData } from '@/services/clients.service';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null; // If null/undefined -> Create mode. If provided -> Edit mode.
  onSuccess?: (client: Client) => void;
}

const initialFormState: ClientFormData = {
  tipo_documento: 'RUC',
  numero_documento: '',
  razon_social: '',
  nombres_contacto: '',
  apellidos_contacto: '',
  email: '',
  telefono: '',
  direccion: '',
  comprobante_preferido: 'Factura',
};

export default function ClientFormModal({ isOpen, onClose, client, onSuccess }: ClientFormModalProps) {
  const [formData, setFormData] = useState<ClientFormData>(initialFormState);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();

  const isEditing = Boolean(client);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setFormData({
          tipo_documento: client.tipo_documento || 'RUC',
          numero_documento: client.numero_documento || '',
          razon_social: client.razon_social || '',
          nombres_contacto: client.nombres_contacto || '',
          apellidos_contacto: client.apellidos_contacto || '',
          email: client.email || '',
          telefono: client.telefono || '',
          direccion: client.direccion || '',
          comprobante_preferido: client.comprobante_preferido || 'Factura',
        });
      } else {
        setFormData(initialFormState);
      }
      setError(null);
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.numero_documento.trim()) {
      setError('El número de documento es obligatorio.');
      return;
    }
    if (!formData.nombres_contacto.trim() || !formData.apellidos_contacto.trim()) {
      setError('Los nombres y apellidos del contacto son obligatorios.');
      return;
    }
    if (!formData.email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    if (isEditing && client) {
      updateMutation.mutate(
        { id: client.id, data: formData },
        {
          onSuccess: (updatedClient) => {
            toast.success('Cliente actualizado correctamente.');
            if (onSuccess && updatedClient) onSuccess(updatedClient);
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: (newClient) => {
          toast.success('Cliente creado correctamente.');
          if (onSuccess && newClient) onSuccess(newClient);
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
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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

          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Tipo y Num Documento */}
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
                <input
                  type="text"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleChange}
                  placeholder="Ej: 20123456789"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              {/* Razón Social */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">
                  Razón Social / Empresa <span className="font-normal opacity-70">(Opcional para personas naturales)</span>
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Nombre de la empresa"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Contacto Nombres y Apellidos */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Nombres del Contacto *</label>
                <input
                  type="text"
                  name="nombres_contacto"
                  value={formData.nombres_contacto}
                  onChange={handleChange}
                  placeholder="Juan"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Apellidos del Contacto *</label>
                <input
                  type="text"
                  name="apellidos_contacto"
                  value={formData.apellidos_contacto}
                  onChange={handleChange}
                  placeholder="Pérez"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              {/* Email y Teléfono */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
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

              {/* Comprobante Preferido */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Comprobante Preferido</label>
                <select
                  name="comprobante_preferido"
                  value={formData.comprobante_preferido}
                  onChange={handleChange}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="Factura">Factura</option>
                  <option value="Boleta">Boleta</option>
                </select>
              </div>

              {/* Dirección */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-[#94A3B8]">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Av. Las Camelias 123, San Isidro, Lima"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer actions */}
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
            form="client-form"
            disabled={isPending}
            className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21] disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <>Guardando...</>
            ) : (
              <>Guardar Cliente</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
