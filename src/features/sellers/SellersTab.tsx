'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDeleteSeller, useToggleSellerActive } from '@/hooks/useSellers';
import SellerFormModal from './SellerFormModal';
import type { Seller } from '@/services/sellers.service';

interface SellersTabProps {
  sellers: Seller[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export default function SellersTab({ sellers, isLoading, isFetching, isError, error, searchTerm, onSearchChange }: SellersTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const deleteMutation = useDeleteSeller();
  const toggleActiveMutation = useToggleSellerActive();

  const handleDelete = (seller: Seller) => {
    const confirmed = window.confirm(`¿Eliminar al vendedor "${seller.nombre}"?`);
    if (!confirmed) return;
    deleteMutation.mutate(seller.id, {
      onSuccess: () => toast.success(`Vendedor "${seller.nombre}" eliminado.`),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingSeller(null);
    setShowModal(true);
  };

  const handleToggleActive = (seller: Seller) => {
    toggleActiveMutation.mutate({ id: seller.id, currentStatus: seller.activo });
  };

  return (
    <>
      <div className="p-6 pb-4 border-b border-[#334155]">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Search */}
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
            />
          </div>

          {/* New Action */}
          <button
            onClick={handleNew}
            className="shrink-0 flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21]"
          >
            <iconify-icon icon="solar:add-circle-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            Nuevo Vendedor
          </button>
        </div>
      </div>

      <div className={`md:flex-1 md:overflow-y-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
            Cargando vendedores...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center p-12 text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Error al cargar vendedores'}
          </div>
        ) : sellers.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
            {searchTerm ? 'No se encontraron vendedores con esa búsqueda.' : 'No hay vendedores registrados.'}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {sellers.map((seller) => (
                <div key={seller.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#E2E8F0]">{seller.nombre}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(seller)}
                        disabled={toggleActiveMutation.isPending}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none transition-colors disabled:opacity-50 ${
                          seller.activo ? 'bg-[#3B82F6]' : 'bg-[#334155]'
                        }`}
                        role="switch"
                        aria-checked={seller.activo}
                      >
                        <span className="sr-only">Cambiar estado</span>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                            seller.activo ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleEdit(seller)}
                        className="flex items-center gap-1 border border-[#334155] hover:bg-[#334155]/50 transition-colors text-[#E2E8F0] rounded-md px-2 py-1"
                      >
                        <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                        <span className="text-xs">Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(seller)}
                        className="flex items-center justify-center border border-red-500/30 text-[#E2E8F0] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-linear" stroke-width="1.5" class="text-base"></iconify-icon>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#94A3B8]">{seller.email}</p>
                  <span className={`text-xs font-medium ${seller.activo ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                    {seller.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Nombre Completo</th>
                    <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Correo Electrónico</th>
                    <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Estado</th>
                    <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 bg-[#181B21]">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-[#334155]/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E2E8F0]">
                        {seller.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                        {seller.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(seller)}
                          disabled={toggleActiveMutation.isPending}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21] transition-colors ${
                            seller.activo ? 'bg-[#3B82F6]' : 'bg-[#334155]'
                          }`}
                          role="switch"
                          aria-checked={seller.activo}
                        >
                          <span className="sr-only">Cambiar estado</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                              seller.activo ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`ml-3 text-xs font-medium ${seller.activo ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                          {seller.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(seller)}
                            className="flex items-center gap-1.5 border border-[#334155] hover:bg-[#334155]/50 transition-colors font-medium text-[#E2E8F0] rounded-md px-2.5 py-1.5"
                          >
                            <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                            <span className="text-xs">Editar</span>
                          </button>
                          <button
                            onClick={() => handleDelete(seller)}
                            className="flex items-center justify-center border border-red-500/30 text-[#E2E8F0] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <iconify-icon icon="solar:trash-bin-trash-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <SellerFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        seller={editingSeller}
      />
    </>
  );
}
