'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useClientsList, useToggleClientActive, useDeleteClient } from '@/hooks/useClients';
import { useSellersList } from '@/hooks/useSellers';
import { useDebounce } from '@/hooks/useDebounce';
import ClientFormModal from '@/features/clients/ClientFormModal';
import SellersTab from '@/features/sellers/SellersTab';
import AdminTabs from '@/components/admin/AdminTabs';
import Pagination from '@/components/ui/Pagination';
import type { Client } from '@/services/clients.service';
import { PAGINATION, TIMEOUTS } from '@/constants';

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<'clientes' | 'vendedores'>('clientes');

  // ─── Clientes state ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const { data: result, isLoading, isFetching, isError, error } = useClientsList({
    page,
    pageSize,
    search: debouncedSearch,
  });
  const clients = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const toggleMutation = useToggleClientActive();
  const deleteClientMutation = useDeleteClient();

  const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1); };

  // ─── Vendedores state ────────────────────────────────────────
  const [sellerSearchTerm, setSellerSearchTerm] = useState('');
  const [sellerPage, setSellerPage] = useState(1);
  const [sellerPageSize, setSellerPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  const sellerDebouncedSearch = useDebounce(sellerSearchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const { data: sellersResult, isLoading: sellersLoading, isFetching: sellersFetching, isError: sellersIsError, error: sellersError } = useSellersList({
    page: sellerPage,
    pageSize: sellerPageSize,
    search: sellerDebouncedSearch,
  });
  const sellers = sellersResult?.data ?? [];
  const sellersTotalItems = sellersResult?.count ?? 0;
  const sellersTotalPages = Math.ceil(sellersTotalItems / sellerPageSize);

  const handleSellerSearchChange = (val: string) => { setSellerSearchTerm(val); setSellerPage(1); };
  const handleSellerPageSizeChange = (size: number) => { setSellerPageSize(size); setSellerPage(1); };

  // ─── Clientes handlers ───────────────────────────────────────
  const handleToggle = (client: Client) => {
    toggleMutation.mutate({ id: client.id, activo: !client.activo });
  };

  const handleDelete = (client: Client) => {
    const displayName = client.razon_social || `${client.nombres_contacto} ${client.apellidos_contacto}`;
    const confirmed = window.confirm(`¿Eliminar al cliente "${displayName}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    deleteClientMutation.mutate(client.id, {
      onSuccess: () => toast.success('Cliente eliminado correctamente.'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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
          <div className="inline-flex bg-[#0F1115] p-1 rounded-lg border border-[#334155]">
            <button
              onClick={() => setActiveTab('clientes')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'clientes'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              Directorio de Clientes
            </button>
            <button
              onClick={() => setActiveTab('vendedores')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'vendedores'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              Equipo de Ventas
            </button>
          </div>
        </div>

        {activeTab === 'clientes' ? (
          <>
            <div className="p-6 pb-4 border-b border-[#334155]">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full max-w-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <iconify-icon icon="solar:magnifer-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por RUC, Razón Social o Email..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleNewClient}
                  className="shrink-0 flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21]"
                >
                  <iconify-icon icon="solar:add-circle-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                  Nuevo Cliente
                </button>
              </div>
            </div>

            <div className={`md:flex-1 md:overflow-y-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
                  Cargando clientes...
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center p-12 text-red-400 text-sm">
                  {error instanceof Error ? error.message : 'Error al cargar clientes'}
                </div>
              ) : clients.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-[#94A3B8] text-sm">
                  {searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes registrados.'}
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3 p-4">
                    {clients.map((client) => (
                      <div key={client.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${client.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                            {client.razon_social || `${client.nombres_contacto} ${client.apellidos_contacto}`}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={client.activo}
                                onChange={() => handleToggle(client)}
                              />
                              <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                            </label>
                            <button
                              onClick={() => handleEdit(client)}
                              className="flex items-center gap-1 border border-[#334155] hover:bg-[#334155]/50 transition-colors text-[#E2E8F0] rounded-md px-2 py-1"
                              title="Editar"
                            >
                              <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                              <span className="text-xs">Editar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(client)}
                              className="flex items-center justify-center border border-red-500/30 text-[#E2E8F0] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1.5 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <iconify-icon icon="solar:trash-bin-trash-linear" stroke-width="1.5" class="text-base"></iconify-icon>
                            </button>
                          </div>
                        </div>
                        {client.numero_documento && (
                          <p className={`text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                            Doc: {client.numero_documento}
                          </p>
                        )}
                        <p className={`text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                          {client.nombres_contacto} {client.apellidos_contacto}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{client.email}</span>
                          {client.telefono && (
                            <span className={`text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{client.telefono}</span>
                          )}
                        </div>
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
                          <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155] text-center">Estado</th>
                          <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider bg-[#181B21]/50 border-b border-[#334155] text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]/60 bg-[#181B21]">
                        {clients.map((client) => (
                          <tr key={client.id} className="hover:bg-[#334155]/20 transition-colors group">
                            <td className={`px-6 py-4 whitespace-nowrap text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                              {client.numero_documento || '—'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${client.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                              {client.razon_social || `${client.nombres_contacto} ${client.apellidos_contacto}`}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${client.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                              {client.nombres_contacto} {client.apellidos_contacto}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-sm ${client.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>{client.email}</span>
                                {client.telefono && (
                                  <span className={`text-xs ${client.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>{client.telefono}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={client.activo}
                                  onChange={() => handleToggle(client)}
                                />
                                <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                              </label>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(client)}
                                  className="flex items-center gap-1.5 border border-[#334155] hover:bg-[#334155]/50 transition-colors font-medium text-[#E2E8F0] rounded-md px-2.5 py-1.5"
                                  title="Editar"
                                >
                                  <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                                  <span className="text-xs">Editar</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(client)}
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
          </>
        ) : (
          <SellersTab
            sellers={sellers}
            isLoading={sellersLoading}
            isFetching={sellersFetching}
            isError={sellersIsError}
            error={sellersError instanceof Error ? sellersError : null}
            searchTerm={sellerSearchTerm}
            onSearchChange={handleSellerSearchChange}
          />
        )}
      </div>

      {/* Pagination — outside the panel, consistent with other sections */}
      {activeTab === 'clientes' && !isLoading && !isError && totalPages > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      {activeTab === 'vendedores' && !sellersLoading && !sellersIsError && sellersTotalPages > 0 && (
        <Pagination
          currentPage={sellerPage}
          totalPages={sellersTotalPages}
          totalItems={sellersTotalItems}
          pageSize={sellerPageSize}
          onPageChange={setSellerPage}
          onPageSizeChange={handleSellerPageSizeChange}
        />
      )}

      {/* Modal Cliente */}
      <ClientFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        client={editingClient}
      />
    </div>
  );
}
