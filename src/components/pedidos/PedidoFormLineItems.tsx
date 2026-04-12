import type { Product } from '@/services/products.service';
import type { LineaLocal } from '@/types/common.types';

interface PedidoFormLineItemsProps {
  lineas: LineaLocal[];
  products: Product[];
  aplicaIgv: boolean;
  formatCurrency: (value: number) => string;
  getLineSubtotal: (index: number) => number;
  onUpdateLineItem: <K extends keyof LineaLocal>(index: number, field: K, value: LineaLocal[K]) => void;
  onRemoveLineItem: (index: number) => void;
  onAddLineItem: () => void;
}

export default function PedidoFormLineItems({
  lineas,
  products,
  aplicaIgv,
  formatCurrency,
  getLineSubtotal,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
}: PedidoFormLineItemsProps) {
  return (
    <div className="bg-[#181B21] border border-[#334155] rounded-xl overflow-hidden shadow-sm flex flex-col">
      {lineas.length === 0 ? (
        <div className="p-8 text-center border-b border-[#334155]">
          <p className="text-sm text-[#94A3B8]">No has añadido ningún producto.</p>
        </div>
      ) : (
        <>
          {/* Mobile view */}
          <div className="md:hidden divide-y divide-[#334155]">
            {lineas.map((item, index) => (
              <div key={index} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <select value={item.producto_id || ''} onChange={(e) => onUpdateLineItem(index, 'producto_id', e.target.value || null)} className="flex-1 bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-2 focus:border-[#3B82F6] focus:outline-none">
                    <option value="">Personalizado...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button onClick={() => onRemoveLineItem(index)} className="shrink-0 text-[#EF4444]/80 hover:text-[#EF4444] p-2 rounded hover:bg-[#EF4444]/10 transition-colors">
                    <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg block"></iconify-icon>
                  </button>
                </div>
                <input type="text" value={item.nombre_producto_historico} onChange={(e) => onUpdateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Descripción del producto..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                <div className={`grid gap-2 ${aplicaIgv ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Cant.</label>
                    <input type="number" min={item.fraccionable ? '0.001' : '1'} step={item.fraccionable ? '0.001' : '1'} value={item.cantidad} onChange={(e) => onUpdateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Precio U.</label>
                    <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => onUpdateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                  </div>
                  {aplicaIgv && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Desc.</label>
                      <input type="number" min="0" step="0.01" value={item.descuento_linea_monto} onChange={(e) => onUpdateLineItem(index, 'descuento_linea_monto', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-[#94A3B8]">Sub:&nbsp;</span>
                  <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(getLineSubtotal(index))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#0F1115] border-b border-[#334155]">
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[220px]">De Catálogo</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase min-w-[250px]">Producto personalizado</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[100px]">Cant.</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[140px]">Precio U. (S/)</th>
                  {aplicaIgv && (
                    <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[120px]">Desc (S/)</th>
                  )}
                  <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[120px] text-right">Subtotal</th>
                  <th className="py-3 px-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {lineas.map((item, index) => (
                  <tr key={index} className="hover:bg-[#334155]/10">
                    <td className="py-3 px-4">
                      <select value={item.producto_id || ''} onChange={(e) => onUpdateLineItem(index, 'producto_id', e.target.value || null)} className="w-full bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-1.5 focus:border-[#3B82F6] focus:outline-none">
                        <option value="">Personalizado...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input type="text" value={item.nombre_producto_historico} onChange={(e) => onUpdateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Escriba aquí..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" min={item.fraccionable ? '0.001' : '1'} step={item.fraccionable ? '0.001' : '1'} value={item.cantidad} onChange={(e) => onUpdateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => onUpdateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                    </td>
                    {aplicaIgv && (
                      <td className="py-3 px-4">
                        <input type="number" min="0" step="0.01" value={item.descuento_linea_monto} onChange={(e) => onUpdateLineItem(index, 'descuento_linea_monto', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-[#94A3B8] text-right pt-1.5">{formatCurrency(getLineSubtotal(index))}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => onRemoveLineItem(index)} className="text-[#EF4444]/80 hover:text-[#EF4444] p-1.5 rounded hover:bg-[#EF4444]/10 transition-colors">
                        <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg block"></iconify-icon>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="p-4 border-t border-[#334155] bg-[#181B21]">
        <button onClick={onAddLineItem} className="flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 px-3 py-1.5 rounded transition-colors focus:outline-none">
          <iconify-icon icon="solar:add-circle-linear" class="text-lg"></iconify-icon> Añadir Producto
        </button>
      </div>
    </div>
  );
}
