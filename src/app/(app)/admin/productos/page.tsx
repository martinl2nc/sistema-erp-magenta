'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import AdminTabs from '@/components/admin/AdminTabs';
import { useProductsList, useCreateProduct, useUpdateProduct, useToggleProductActive } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/Pagination';
import ProductDrawer from '@/features/products/ProductDrawer';
import CategoryDrawer from '@/features/products/CategoryDrawer';
import type { Product, ProductFormData } from '@/services/products.service';
import { PAGINATION, TIMEOUTS } from '@/constants';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  // ─── Server State (Capa 2) ──────────────────────────────────
  const { data: result, isLoading, isFetching, isError, error } = useProductsList({
    page,
    pageSize,
    search: debouncedSearch,
  });
  const products = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const toggleMutation = useToggleProductActive();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // ─── Handlers ───────────────────────────────────────────────
  const handleNew = () => {
    setEditingProduct(null);
    setDrawerOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            toast.success('Producto actualizado correctamente.');
            handleCloseDrawer();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Producto creado correctamente.');
          handleCloseDrawer();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleToggle = (product: Product) => {
    toggleMutation.mutate({ id: product.id, activo: !product.activo });
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
        {/* Toolbar */}
        <div className="p-4 border-b border-[#334155] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <iconify-icon icon="solar:magnifer-linear" class="text-[#94A3B8] text-lg"></iconify-icon>
            </div>
            <input
              type="text"
              placeholder="Buscar Producto..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-10 pr-3 py-2 text-sm text-[#E2E8F0] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCategoryDrawerOpen(true)}
              className="flex justify-center items-center gap-2 border border-[#334155] hover:bg-[#334155]/50 text-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <iconify-icon icon="solar:tag-linear" width="18" height="18"></iconify-icon>
              Categorías
            </button>
            <button
              onClick={handleNew}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21]"
            >
              <iconify-icon icon="solar:add-circle-linear" width="18" height="18"></iconify-icon>
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Table / Cards */}
        <div className={`md:flex-1 md:overflow-y-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-50' : ''}`}>
          {isLoading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-[#334155]/30 rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6">
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-4 text-[#EF4444] text-sm font-medium">
                {error instanceof Error ? error.message : 'Error al cargar productos'}
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] text-sm">
              {searchTerm ? 'No se encontraron productos.' : 'No hay productos registrados.'}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                        {product.nombre}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={product.activo}
                            onChange={() => handleToggle(product)}
                          />
                          <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                        </label>
                        <button
                          onClick={() => handleEdit(product)}
                          className="flex items-center gap-1 border border-[#334155] hover:bg-[#334155]/50 transition-colors text-[#E2E8F0] rounded-md px-2 py-1"
                        >
                          <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                          <span className="text-xs">Editar</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {product.sku && (
                        <span className={`text-xs ${product.activo ? 'text-[#94A3B8]' : 'text-[#94A3B8]/50'}`}>
                          SKU: {product.sku}
                        </span>
                      )}
                      {product.categorias?.nombre && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#334155] ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          {product.categorias.nombre}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold text-right ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                      S/ {formatPrice(product.precio_base)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F1115] border-b border-[#334155]">
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">SKU</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nombre</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Categoría</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider text-right">Precio Base</th>
                      <th className="py-3 px-6 text-xs font-medium text-[#94A3B8] uppercase tracking-wider text-center">Estado</th>
                      <th className="py-3 px-6 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {products.map((product, index) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-[#334155]/30 transition-colors group ${
                          index % 2 === 0 ? 'bg-[#334155]/20' : ''
                        }`}
                      >
                        <td className={`py-4 px-6 text-sm font-medium ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          {product.sku || '—'}
                        </td>
                        <td className={`py-4 px-6 text-sm ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          {product.nombre}
                        </td>
                        <td className="py-4 px-6">
                          {product.categorias?.nombre ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#334155] ${
                              product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'
                            }`}>
                              {product.categorias.nombre}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] text-xs">—</span>
                          )}
                        </td>
                        <td className={`py-4 px-6 text-sm text-right ${product.activo ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                          S/ {formatPrice(product.precio_base)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={product.activo}
                              onChange={() => handleToggle(product)}
                            />
                            <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                          </label>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleEdit(product)}
                            className="flex items-center gap-1.5 border border-[#334155] hover:bg-[#334155]/50 transition-colors font-medium text-[#E2E8F0] rounded-md px-2.5 py-1.5"
                          >
                            <iconify-icon icon="solar:pen-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                            <span className="text-xs">Editar</span>
                          </button>
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

      {/* Drawer */}
      <ProductDrawer
        open={drawerOpen}
        product={editingProduct}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Category Drawer */}
      <CategoryDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
      />
    </div>
  );
}
