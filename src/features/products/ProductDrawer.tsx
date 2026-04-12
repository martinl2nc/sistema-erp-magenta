'use client';
import { useState, useEffect } from 'react';
import { useCategoriesList } from '@/hooks/useCategories';
import { useUnidadesMedida, useAfectacionesIgv } from '@/hooks/useCatalogos';
import type { Product } from '@/services/products.service';
import type { ProductFormData } from '@/services/products.service';

interface ProductDrawerProps {
  open: boolean;
  product: Product | null; // null = create mode
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
  isSaving: boolean;
}

const initialForm: ProductFormData = {
  sku: '',
  nombre: '',
  descripcion: '',
  categoria_id: null,
  precio_base: 0,
  unidad_medida: 'NIU',
  afectacion_igv: '10',
  fraccionable: false,
};

export default function ProductDrawer({ open, product, onClose, onSave, isSaving }: ProductDrawerProps) {
  const { data: categories = [] } = useCategoriesList();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: afectaciones = [] } = useAfectacionesIgv();
  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        nombre: product.nombre,
        descripcion: product.descripcion || '',
        categoria_id: product.categoria_id,
        precio_base: parseFloat(product.precio_base) || 0,
        unidad_medida: product.unidad_medida || 'NIU',
        afectacion_igv: product.afectacion_igv || '10',
        fraccionable: product.fraccionable ?? false,
      });
    } else {
      setFormData(initialForm);
    }
    setErrorMsg(null);
  }, [product, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precio_base' ? value : name === 'categoria_id' ? (value || null) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }

    onSave({
      ...formData,
      precio_base: typeof formData.precio_base === 'string'
        ? parseFloat(formData.precio_base as unknown as string) || 0
        : formData.precio_base,
    });
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
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="hover:text-[#E2E8F0] hover:bg-[#334155]/40 transition-colors focus:outline-none text-[#94A3B8] rounded-md p-1.5 cursor-pointer"
          >
            <iconify-icon icon="solar:close-circle-linear" width="20" height="20" class="block"></iconify-icon>
          </button>
        </div>

        {/* Body (Form) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {errorMsg && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-3 text-[#EF4444] text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="Ej. SRV-001"
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Licencia Anual Software Premium"
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                placeholder="Detalles sobre el producto..."
                className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow resize-none"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Categoría</label>
              <div className="relative">
                <select
                  name="categoria_id"
                  value={formData.categoria_id || ''}
                  onChange={handleChange}
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow appearance-none cursor-pointer"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <iconify-icon icon="solar:alt-arrow-down-linear" class="text-[#94A3B8] text-base"></iconify-icon>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Unidad SUNAT */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Unidad MED. (SUNAT)</label>
                <div className="relative">
                  <select
                    name="unidad_medida"
                    value={formData.unidad_medida}
                    onChange={handleChange}
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow appearance-none cursor-pointer"
                  >
                    {unidades.map(u => (
                      <option key={u.codigo} value={u.codigo}>{u.codigo} - {u.descripcion}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <iconify-icon icon="solar:alt-arrow-down-linear" class="text-[#94A3B8] text-base"></iconify-icon>
                  </div>
                </div>
              </div>

              {/* Afectación IGV (SUNAT) */}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Afectación IGV</label>
                <div className="relative">
                  <select
                    name="afectacion_igv"
                    value={formData.afectacion_igv}
                    onChange={handleChange}
                    className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow appearance-none cursor-pointer"
                  >
                    {afectaciones.map(a => (
                      <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.descripcion}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <iconify-icon icon="solar:alt-arrow-down-linear" class="text-[#94A3B8] text-base"></iconify-icon>
                  </div>
                </div>
              </div>
            </div>

            {/* Fraccionable */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-medium text-[#94A3B8]">¿Se vende por fracción?</p>
                <p className="text-[11px] text-[#94A3B8]/60 mt-0.5">Permite cantidades decimales (ej: 2.5 kg, 1.5 m)</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, fraccionable: !prev.fraccionable }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  formData.fraccionable ? 'bg-[#3B82F6]' : 'bg-[#334155]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    formData.fraccionable ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Precio Base */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Precio Base</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-[#94A3B8] text-sm font-medium">S/</span>
                </div>
                <input
                  type="number"
                  name="precio_base"
                  value={formData.precio_base}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow"
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#334155] bg-[#181B21]">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] transition-colors text-white text-sm font-medium rounded-lg py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#181B21] disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
