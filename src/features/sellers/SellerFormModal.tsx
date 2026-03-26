'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCreateSeller, useUpdateSeller } from '@/hooks/useSellers';
import type { Seller, SellerFormData } from '@/services/sellers.service';

interface SellerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller?: Seller | null; // null for Create, Seller for Edit
}

const initialFormState: SellerFormData = {
  nombre: '',
  email: '',
  activo: true,
};

export default function SellerFormModal({ isOpen, onClose, seller }: SellerFormModalProps) {
  const [formData, setFormData] = useState<SellerFormData>(initialFormState);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSeller();
  const updateMutation = useUpdateSeller();

  const isEditing = Boolean(seller);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (seller) {
        setFormData({
          nombre: seller.nombre || '',
          email: seller.email || '',
          activo: seller.activo ?? true,
        });
      } else {
        setFormData(initialFormState);
      }
      setError(null);
    }
  }, [isOpen, seller]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre del vendedor es obligatorio.');
      return;
    }
    if (!formData.email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    if (isEditing && seller) {
      updateMutation.mutate(
        { id: seller.id, data: formData },
        {
          onSuccess: () => {
            toast.success('Vendedor actualizado correctamente.');
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success('Vendedor creado correctamente.');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181B21] border border-[#334155] rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#334155] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-medium text-[#E2E8F0]">
            {isEditing ? 'Editar Vendedor' : 'Nuevo Vendedor'}
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

          <form id="seller-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#94A3B8]">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#94A3B8]">Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendedor@empresa.com"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                </label>
                <span className="text-sm font-medium text-[#E2E8F0]">
                  Vendedor Activo
                </span>
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
            className="px-4 py-2 border border-[#334155] rounded-lg text-sm font-medium text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="seller-form"
            disabled={isPending}
            className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? 'Guardando...' : 'Guardar Vendedor'}
          </button>
        </div>
      </div>
    </div>
  );
}
