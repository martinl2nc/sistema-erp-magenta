'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useProveedoresList, useToggleProveedorActive, useDeleteProveedor } from '@/hooks/useProveedores';
import { useDebounce } from '@/hooks/useDebounce';
import ProveedorFormModal from '@/features/proveedores/ProveedorFormModal';
import AdminTabs from '@/components/admin/AdminTabs';
import Pagination from '@/components/ui/Pagination';
import type { Proveedor } from '@/services/proveedores.service';
import { PAGINATION, TIMEOUTS } from '@/constants';

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [showModal, setShowModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const { data: result, isLoading, isFetching, isError, error } = useProveedoresList({
    page,
    pageSize,
    search: debouncedSearch,
  });
  const proveedores = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const toggleMutation = useToggleProveedorActive();
  const deleteMutation = useDeleteProveedor();

  const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1); };

  const handleToggle = (proveedor: Proveedor) => {
    toggleMutation.mutate({ id: proveedor.id, activo: !proveedor.activo });
  };

  const handleDelete = (proveedor: Proveedor) => {
    const displayName = proveedor.razon_social || `${proveedor.nombres_contacto} ${proveedor.apellidos_contacto}`;
    const confirmed = window.confirm(`¿Eliminar al proveedor "${displayName}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    deleteMutation.mutate(proveedor.id, {
      onSuccess: () => toast.success('Proveedor eliminado correctamente.'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingProveedor(null);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full space-y-6">
      {/* Page Header & Tabs */}
      <div className="space-y-4">
        <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">
          Administración del Sistema
        </h1>
        <AdminTabs />
      </div>

      {/* Panel */}
      <div className="bg-[#181B21] border border-[#334155] rounded-xl shadow-sm flex flex-col w-full md:overflow-hidden md:flex-1">
        {/* Panel Header */}
        <div className="p-6 border-b border-[#334155]">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
              </div>
              <input
                type="text"
                placeholder="Buscar por RUC, Razón Social, Contacto o Email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
              />
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="shrink-0 flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21]"
            >
              <iconify-icon icon="solar:add-circle-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
              Nuevo Proveedor
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`md:flex-1 md:overflow-y-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
              Cargando proveedores...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center p-12 text-red-400 text-sm">
              {error instanceof Error ? error.message : 'Error al cargar proveedores'}
            </div>
          ) : proveedores.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
              {searchTerm ? 'No se encontraron proveedores con esa búsqueda.' : 'No hay proveedores registrados.'}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {proveedores.map((p) => (
                  <div key={p.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${p.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                        {p.razon_social || `${p.nombres_contacto} ${p.apellidos_contacto}`}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={p.activo} onChange={() => handleToggle(p)} />
                          <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                        </label>
                        <button
                          onClick={() => handleEdit(p)}
                          className="flex items-center gap-1 border border-[#334155] hover:bg-[#334155]/50 transition-colors text-[#E2E8F0] rounded-md px-2 py-1"
                        >
                          <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                          <span className="text-xs">Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="flex items-center justify-center border border-red-500/30 text-[#E2E8F0] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-md transition-colors"
                        >
                          <iconify-icon icon="solar:trash-bin-trash-linear" stroke-width="1.5" class="text-base"></iconify-icon>
                        </button>
                      </div>
                    </div>
                    {p.numero_documento && (
                      <p className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                        Doc: {p.numero_documento}
                      </p>
                    )}
                    {(p.nombres_contacto || p.apellidos_contacto) && (
                      <p className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                        {p.nombres_contacto} {p.apellidos_contacto}
                      </p>
                    )}
                    {p.email && (
                      <p className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{p.email}</p>
                    )}
                    {p.telefono && (
                      <p className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{p.telefono}</p>
                    )}
                    {p.banco_predeterminado && (
                      <p className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                        Banco: {p.banco_predeterminado}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">RUC / DNI</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Empresa / Razón Social</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Contacto Principal</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Email & Teléfono</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155]">Banco / Cuenta</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155] text-center">Estado</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60 bg-[#181B21]">
                    {proveedores.map((p) => (
                      <tr key={p.id} className="hover:bg-[#334155]/20 transition-colors group">
                        <td className={`px-6 py-4 whitespace-nowrap text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                          {p.numero_documento || '—'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${p.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          {p.razon_social || `${p.nombres_contacto} ${p.apellidos_contacto}`}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${p.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          {p.nombres_contacto} {p.apellidos_contacto}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm ${p.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                              {p.email || '—'}
                            </span>
                            {p.telefono && (
                              <span className={`text-xs ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{p.telefono}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm ${p.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                              {p.banco_predeterminado || '—'}
                            </span>
                            {p.cuenta_bancaria && (
                              <span className={`text-xs font-mono ${p.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                                {p.cuenta_bancaria}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={p.activo} onChange={() => handleToggle(p)} />
                            <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="flex items-center gap-1.5 border border-[#334155] hover:bg-[#334155]/50 transition-colors font-medium text-[#E2E8F0] rounded-md px-2.5 py-1.5"
                            >
                              <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                              <span className="text-xs">Editar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="flex items-center justify-center border border-red-500/30 text-[#E2E8F0] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-md transition-colors"
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
      </div>

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      <ProveedorFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        proveedor={editingProveedor}
      />
    </div>
  );
}
