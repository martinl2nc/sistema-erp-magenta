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

interface CreatedCredentials {
  nombre: string;
  email: string;
  password: string;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  const all = upper + lower + digits + special;

  const rand = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  // Ensure at least one of each required type
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const extra = Array.from({ length: 6 }, () => rand(all));
  const shuffled = [...required, ...extra].sort(() => Math.random() - 0.5);
  return shuffled.join('');
}

const initialFormState: SellerFormData = {
  nombre: '',
  email: '',
  activo: true,
};

export default function SellerFormModal({ isOpen, onClose, seller }: SellerFormModalProps) {
  const [formData, setFormData] = useState<SellerFormData>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

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
      setCredentials(null);
      setCopied(false);
    }
  }, [isOpen, seller]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `Correo: ${credentials.email}\nContraseña: ${credentials.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
          onError: (err) => {
            setError(err.message);
          },
        }
      );
    } else {
      const password = generatePassword();
      createMutation.mutate(
        { nombre: formData.nombre, email: formData.email, password },
        {
          onSuccess: () => {
            setCredentials({ nombre: formData.nombre, email: formData.email, password });
          },
          onError: (err) => {
            setError(err.message);
          },
        }
      );
    }
  };

  // Credentials screen shown after successful creation
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#181B21] border border-[#334155] rounded-xl max-w-lg w-full shadow-2xl">
          <div className="px-6 py-4 border-b border-[#334155] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <iconify-icon icon="solar:check-circle-bold" class="text-2xl text-green-400"></iconify-icon>
              <h2 className="text-xl font-medium text-[#E2E8F0]">Vendedor Creado</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-[#94A3B8]">
              La cuenta de <span className="text-[#E2E8F0] font-medium">{credentials.nombre}</span> fue creada exitosamente.
              Comparte estas credenciales con el vendedor para que pueda iniciar sesión.
            </p>

            <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">Correo</p>
                <p className="text-sm font-mono text-[#E2E8F0]">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">Contraseña temporal</p>
                <p className="text-sm font-mono text-[#E2E8F0] tracking-wider">{credentials.password}</p>
              </div>
            </div>

            <p className="text-xs text-[#64748B]">
              El vendedor puede cambiar su contraseña usando el link &ldquo;¿Olvidaste tu contraseña?&rdquo; en la pantalla de login.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-[#334155] flex justify-end gap-3 bg-[#181B21] rounded-b-xl">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-4 py-2 border border-[#334155] rounded-lg text-sm font-medium text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors flex items-center gap-2"
            >
              <iconify-icon icon={copied ? 'solar:check-linear' : 'solar:copy-linear'} class="text-base"></iconify-icon>
              {copied ? 'Copiado' : 'Copiar credenciales'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          {!isEditing && (
            <div className="mb-5 bg-[#1E3A5F]/30 border border-[#3B82F6]/30 rounded-lg p-3 text-xs text-[#93C5FD]">
              Se generará una contraseña temporal que deberás compartir con el vendedor.
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

              {isEditing && (
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
              )}
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
