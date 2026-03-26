'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import { getCategoryProductCount } from '@/services/categories.service';
import type { Category } from '@/services/categories.service';

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CategoryDrawer({ open, onClose }: CategoryDrawerProps) {
  const { data: categories = [], isLoading } = useCategoriesList();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditingName('');
      setNewName('');
    }
  }, [open]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(
      { nombre: newName.trim() },
      {
        onSuccess: () => {
          toast.success('Categoría creada correctamente.');
          setNewName('');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.nombre);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateMutation.mutate(
      { id: editingId, data: { nombre: editingName.trim() } },
      {
        onSuccess: () => {
          toast.success('Categoría actualizada.');
          setEditingId(null);
          setEditingName('');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = async (cat: Category) => {
    try {
      const productCount = await getCategoryProductCount(cat.id);

      if (productCount > 0) {
        toast.error(`No se puede eliminar "${cat.nombre}": tiene ${productCount} producto${productCount > 1 ? 's' : ''} asociado${productCount > 1 ? 's' : ''}. Reasigna los productos a otra categoría primero.`, { duration: 7000 });
        return;
      }

      if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;

      deleteMutation.mutate(cat.id, {
        onSuccess: () => toast.success(`Categoría "${cat.nombre}" eliminada.`),
        onError: (err) => toast.error(err.message),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al verificar productos');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#0F1115]/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[400px] bg-[#181B21] border-l border-[#334155] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col transform transition-transform duration-300 ease-in-out">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#334155] bg-[#181B21]">
          <h2 className="text-lg font-semibold tracking-tight text-[#E2E8F0]">
            Administrar Categorías
          </h2>
          <button
            onClick={onClose}
            className="hover:text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors focus:outline-none text-[#94A3B8] rounded-md p-1.5 cursor-pointer"
          >
            <iconify-icon icon="solar:close-circle-linear" width="20" height="20" class="block"></iconify-icon>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Create new */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nueva Categoría</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                placeholder="Nombre de la categoría..."
                className="flex-1 bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <iconify-icon icon="solar:add-circle-linear" width="16" height="16"></iconify-icon>
                Crear
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#334155]"></div>

          {/* Category list */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-3">
              Categorías existentes ({categories.length})
            </label>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-[#334155]/30 rounded-lg" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center text-[#94A3B8] text-sm py-8">
                No hay categorías registradas.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 group"
                  >
                    {editingId === cat.id ? (
                      /* Edit mode */
                      <>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                          autoFocus
                          className="flex-1 bg-transparent border-none text-sm text-[#E2E8F0] focus:outline-none"
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                          className="text-[#22C55E] hover:bg-[#22C55E]/10 p-1 rounded transition-colors"
                          title="Guardar"
                        >
                          <iconify-icon icon="solar:check-circle-linear" width="18" height="18" class="block"></iconify-icon>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/40 p-1 rounded transition-colors"
                          title="Cancelar"
                        >
                          <iconify-icon icon="solar:close-circle-linear" width="18" height="18" class="block"></iconify-icon>
                        </button>
                      </>
                    ) : (
                      /* View mode */
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-[#E2E8F0]">{cat.nombre}</span>
                          <CategoryProductBadge categoryId={cat.id} />
                        </div>
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 p-1 rounded transition-colors"
                          title="Editar"
                        >
                          <iconify-icon icon="solar:pen-linear" width="16" height="16" class="block"></iconify-icon>
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 p-1 rounded transition-colors"
                          title="Eliminar"
                        >
                          <iconify-icon icon="solar:trash-bin-trash-linear" width="16" height="16" class="block"></iconify-icon>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#334155] bg-[#181B21]">
          <button
            onClick={onClose}
            className="w-full border border-[#334155] hover:bg-[#334155]/50 text-[#E2E8F0] text-sm font-medium rounded-lg py-2.5 px-4 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Componente auxiliar: Badge con contador de productos ───────
function CategoryProductBadge({ categoryId }: { categoryId: string }) {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    getCategoryProductCount(categoryId)
      .then(setCount)
      .catch(() => setCount(null));
  }, [categoryId]);
  
  // No mostrar nada mientras carga o si no hay productos
  if (count === null || count === 0) return null;
  
  return (
    <span 
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#334155] text-[#94A3B8]"
      title={`${count} producto${count > 1 ? 's' : ''} usando esta categoría`}
    >
      {count}
    </span>
  );
}
