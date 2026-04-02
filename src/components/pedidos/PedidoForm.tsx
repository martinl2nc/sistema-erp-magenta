'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { pedidosService } from '@/services/pedidos.service';
import { useCreatePedido, usePedido, useUpdatePedidoCompleto } from '@/hooks/usePedidos';
import { useClientsList, useActiveClientsList, clientsKeys } from '@/hooks/useClients';
import { useSellersList } from '@/hooks/useSellers';
import { useProductsList } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';

import ClientFormModal from '@/features/clients/ClientFormModal';
import type { Client } from '@/services/clients.service';
import type { LineaLocal } from '@/types/common.types';
import { formatCurrency, getClientDisplayName } from '@/utils/formatters';
import { calculateFinancials } from '@/utils/calculations';

export default function PedidoForm({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPedido = useCreatePedido();
  const { user, role } = useAuth();

  const { data: activeClients = [], isLoading: loadingActiveClients } = useActiveClientsList();
  const { data: allClients = [], isLoading: loadingAllClients } = useClientsList();
  const { data: sellers = [], isLoading: loadingSellers } = useSellersList();
  const { data: products = [], isLoading: loadingProducts } = useProductsList();

  const isEditing = !!id;
  const { data: existingPedido, isLoading: loadingPedido } = usePedido(id);
  const updatePedido = useUpdatePedidoCompleto();

  const loadingClients = loadingActiveClients || loadingAllClients;
  const loading = loadingClients || loadingSellers || loadingProducts || loadingPedido;

  const selectableClients = activeClients;
  const isVendorLocked = role === 'vendedor';

  const [clienteId, setClienteId] = useState('');
  const [vendedorId, setVendedorId] = useState(isVendorLocked && user ? user.id : '');
  const [nroOc, setNroOc] = useState('');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [fechaPedido, setFechaPedido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [aplicaIgv, setAplicaIgv] = useState(true);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  
  const [lineas, setLineas] = useState<LineaLocal[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Financial calculations usando la utility centralizada
  const { subtotal: subtotalPedido, baseImponible: baseParaIgv, igv: igvMonto, total: totalFinal } = 
    calculateFinancials(lineas, descuentoGlobal, aplicaIgv);

  // Helper para calcular subtotal de una línea individual (reutiliza la lógica de calculations)
  const calcSubtotal = (l: LineaLocal) => l.cantidad * l.precio_unitario;
  const sumaLineas = subtotalPedido; // Ya está calculado por calculateFinancials

  const handleClientCreated = (newClient: Client) => {
    queryClient.invalidateQueries({ queryKey: clientsKeys.all() });
    setClienteId(String(newClient.id));
    setDireccionFacturacion(newClient.direccion || '');
  };

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || loadingActiveClients || loadingSellers || loadingProducts || loadingPedido) return;

    if (isEditing && existingPedido) {
      setClienteId(existingPedido.cliente_id || '');
      setVendedorId(existingPedido.vendedor_id || '');
      setNroOc(existingPedido.nro_oc_cliente || '');
      setDireccionFacturacion(existingPedido.direccion_facturacion || '');
      setFechaPedido(existingPedido.fecha_pedido ? existingPedido.fecha_pedido.slice(0, 10) : '');
      setObservaciones(existingPedido.observaciones || '');
      setAplicaIgv(existingPedido.aplica_igv ?? true);
      setDescuentoGlobal(existingPedido.descuento_global_monto || 0);

      const loadedLines = existingPedido.lineas?.map((l: any) => ({
        producto_id: l.producto_id,
        nombre_producto_historico: l.nombre_producto_historico,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        fraccionable: products.find(p => String(p.id) === String(l.producto_id))?.fraccionable || false,
      })) || [];
      if (loadedLines.length > 0) setLineas(loadedLines);
      
      setInitialized(true);
    } else if (!isEditing) {
      setInitialized(true);
    }
  }, [initialized, isEditing, existingPedido, loadingActiveClients, loadingSellers, loadingProducts, loadingPedido, products]);

  // Line item handlers
  const updateLineItem = <K extends keyof LineaLocal>(index: number, field: K, value: LineaLocal[K]) => {
    setLineas(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      
      if (field === 'producto_id' && value) {
        const p = products.find(prod => String(prod.id) === String(value));
        if (p) {
          updated.nombre_producto_historico = p.nombre;
          updated.precio_unitario = Number(p.precio_base) || 0;
          updated.fraccionable = p.fraccionable || false;
        }
      }
      return updated;
    }));
  };

  const addLineItem = () => {
    setLineas(prev => [...prev, {
      producto_id: null,
      nombre_producto_historico: '',
      cantidad: 1,
      precio_unitario: 0,
      fraccionable: false
    }]);
  };

  const removeLineItem = (index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  // File handling
  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Submit
  const handleSave = async () => {
    if (!clienteId) { toast.error('Debes seleccionar un cliente registrado'); return; }
    if (!direccionFacturacion.trim()) { toast.error('La dirección de facturación es obligatoria'); return; }
    if (!file && !isEditing) { toast.error('El sustento de aprobación es obligatorio para crear un pedido directo'); return; }
    if (lineas.length === 0) { toast.error('Debes añadir al menos un producto'); return; }
    if (lineas.some(l => !l.nombre_producto_historico.trim() || l.precio_unitario < 0 || l.cantidad <= 0)) {
      toast.error('Verifica que todos los productos tengan descripción y valores válidos');
      return;
    }

    setIsSubmitting(true);
    try {
      let pathToSave = '';
      let nombreToSave = '';

      if (file) {
        const res = await pedidosService.uploadSustento(file, isEditing && existingPedido?.cotizacion_id ? String(existingPedido.cotizacion_id) : null);
        pathToSave = res.path;
        nombreToSave = res.nombre;
      } else if (isEditing && existingPedido) {
        pathToSave = existingPedido.sustento_url;
        nombreToSave = existingPedido.sustento_nombre || '';
      }

      const payload = {
        cliente_id: clienteId,
        vendedor_id: vendedorId || null,
        nro_oc_cliente: nroOc.trim() || undefined,
        direccion_facturacion: direccionFacturacion.trim() || undefined,
        sustento_url: pathToSave,
        sustento_nombre: nombreToSave,
        observaciones: observaciones.trim() || undefined,
        fecha_pedido: fechaPedido || undefined,
        aplica_igv: aplicaIgv,
        subtotal: subtotalPedido,
        descuento_global_monto: descuentoGlobal,
        igv_monto: igvMonto,
        total_final: totalFinal,
      };

      const lineasPayload = lineas.map((l) => ({
        producto_id: l.producto_id,
        nombre_producto_historico: l.nombre_producto_historico,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal_linea: calcSubtotal(l),
      }));

      if (isEditing && id) {
        await updatePedido.mutateAsync({ id, payload: payload as any, lineas: lineasPayload });
        toast.success('Pedido actualizado correctamente');
      } else {
        const nuevoPedido = await createPedido.mutateAsync(payload as any);
        await pedidosService.createPedidoLineas(
          lineasPayload.map(l => ({ ...l, pedido_id: nuevoPedido.id }))
        );
        toast.success('Pedido creado correctamente');
      }

      router.push('/pedidos');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-[#94A3B8] flex items-center gap-2">
          <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
          Cargando datos...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      {/* Top Header */}
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Inicio</span>
          <span className="text-[#334155]">/</span>
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/pedidos')}>Pedidos</span>
          <span className="text-[#334155]">/</span>
          <span className="text-[#E2E8F0] font-medium">Nuevo Pedido</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">Generar Pedido Directo</h1>
        </div>

        {/* Master Data */}
        <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#94A3B8]">Cliente Registrado <span className="text-red-400">*</span></label>
                  <button type="button" onClick={() => setIsClientModalOpen(true)} className="text-xs font-medium text-[#3B82F6] hover:text-[#60A5FA] px-2 py-0.5 rounded hover:bg-[#3B82F6]/10 transition-colors focus:outline-none flex items-center gap-1">
                    <iconify-icon icon="solar:add-circle-linear" class="text-sm"></iconify-icon>
                    Nuevo
                  </button>
                </div>
                <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={clienteId} onChange={(e) => {
                  setClienteId(e.target.value);
                  const selectedClient = selectableClients.find(c => String(c.id) === e.target.value);
                  if (selectedClient) setDireccionFacturacion(selectedClient.direccion || '');
                  else setDireccionFacturacion('');
                }}>
                  <option value="">Seleccionar Cliente...</option>
                  {selectableClients.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Vendedor Asignado</label>
                {isVendorLocked ? (
                  <div className="w-full bg-[#0F1115]/60 border border-[#334155]/60 rounded-lg px-3 py-2.5 text-sm text-[#94A3B8] cursor-not-allowed flex items-center gap-2">
                    <iconify-icon icon="solar:lock-linear" class="text-base shrink-0"></iconify-icon>
                    <span className="text-[#E2E8F0]">
                      {sellers.find(s => s.id === vendedorId)?.nombre || '—'}
                    </span>
                  </div>
                ) : (
                  <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                    <option value="">(Sin Asignar)</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-[#E2E8F0]">Aplicar IGV (18%)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={aplicaIgv} onChange={(e) => setAplicaIgv(e.target.checked)} />
                  <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#0F1115] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Descuento Global (S/)</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-[#94A3B8] sm:text-sm font-medium">S/</span>
                  </div>
                  <input type="number" min="0" step="0.01" value={descuentoGlobal} onChange={(e) => setDescuentoGlobal(Math.max(0, parseFloat(e.target.value) || 0))} className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nro. de OC <span className="font-normal">(opcional)</span></label>
                  <input type="text" value={nroOc} onChange={(e) => setNroOc(e.target.value)} placeholder="Ej: OC-45091" className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Fecha Pedido <span className="font-normal">(opcional)</span></label>
                  <input type="date" value={fechaPedido} onChange={(e) => setFechaPedido(e.target.value)} className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Dirección de Facturación <span className="text-red-400">*</span></label>
                <input type="text" value={direccionFacturacion} onChange={(e) => setDireccionFacturacion(e.target.value)} placeholder="Dirección predeterminada del cliente..." className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Observaciones</label>
                <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Condiciones, tiempos..." className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6] resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-[#181B21] border border-[#334155] rounded-xl overflow-hidden shadow-sm flex flex-col">
          {lineas.length === 0 ? (
            <div className="p-8 text-center border-b border-[#334155]">
              <p className="text-sm text-[#94A3B8]">No has añadido ningún producto.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-[#334155]">
                {lineas.map((item, index) => (
                  <div key={index} className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                       <select value={item.producto_id || ''} onChange={(e) => updateLineItem(index, 'producto_id', e.target.value || null)} className="flex-1 bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-2 focus:border-[#3B82F6] focus:outline-none">
                         <option value="">Personalizado...</option>
                         {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                       </select>
                       <button onClick={() => removeLineItem(index)} className="shrink-0 text-[#EF4444]/80 hover:text-[#EF4444] p-2 rounded hover:bg-[#EF4444]/10 transition-colors">
                         <iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg block"></iconify-icon>
                       </button>
                    </div>
                    <input type="text" value={item.nombre_producto_historico} onChange={(e) => updateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Descripción del producto..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Cant.</label>
                        <input type="number" min={item.fraccionable ? '0.001' : '1'} step={item.fraccionable ? '0.001' : '1'} value={item.cantidad} onChange={(e) => updateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Precio U.</label>
                        <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => updateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-2 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-xs text-[#94A3B8]">Sub:&nbsp;</span>
                      <span className="text-sm font-semibold text-[#E2E8F0]">{formatCurrency(calcSubtotal(item))}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#0F1115] border-b border-[#334155]">
                      <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[220px]">De Catálogo</th>
                      <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase min-w-[250px]">Producto personalizado</th>
                      <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[100px]">Cant.</th>
                      <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[140px]">Precio U. (S/)</th>
                      <th className="py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase w-[120px] text-right">Subtotal</th>
                      <th className="py-3 px-4 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {lineas.map((item, index) => (
                      <tr key={index} className="hover:bg-[#334155]/10">
                        <td className="py-3 px-4">
                          <select value={item.producto_id || ''} onChange={(e) => updateLineItem(index, 'producto_id', e.target.value || null)} className="w-full bg-[#0F1115] border border-[#334155] rounded text-sm text-[#E2E8F0] px-2 py-1.5 focus:border-[#3B82F6] focus:outline-none">
                            <option value="">Personalizado...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <input type="text" value={item.nombre_producto_historico} onChange={(e) => updateLineItem(index, 'nombre_producto_historico', e.target.value)} placeholder="Escriba aquí..." className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none placeholder-[#334155]" />
                        </td>
                        <td className="py-3 px-4">
                          <input type="number" min={item.fraccionable ? '0.001' : '1'} step={item.fraccionable ? '0.001' : '1'} value={item.cantidad} onChange={(e) => updateLineItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-center focus:border-[#3B82F6] focus:outline-none" />
                        </td>
                        <td className="py-3 px-4">
                          <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => updateLineItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1.5 text-sm text-[#E2E8F0] text-right focus:border-[#3B82F6] focus:outline-none" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-[#94A3B8] text-right pt-1.5">{formatCurrency(calcSubtotal(item))}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => removeLineItem(index)} className="text-[#EF4444]/80 hover:text-[#EF4444] p-1.5 rounded hover:bg-[#EF4444]/10 transition-colors">
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
            <button onClick={addLineItem} className="flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 px-3 py-1.5 rounded transition-colors focus:outline-none">
              <iconify-icon icon="solar:add-circle-linear" class="text-lg"></iconify-icon> Añadir Producto
            </button>
          </div>
        </div>

        {/* Sustento Section */}
        <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-[#E2E8F0] mb-2">
            Sustento de Aprobación {!isEditing && <span className="text-red-400">*</span>}
            <span className="text-[#94A3B8] font-normal ml-1">(PDF, JPG o PNG — máx. 10 MB)</span>
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-[#3B82F6] bg-[#3B82F6]/5'
                : file
                ? 'border-[#10B981] bg-[#10B981]/5'
                : isEditing && existingPedido?.sustento_url
                ? 'border-[#3B82F6]/50 bg-[#3B82F6]/5'
                : 'border-[#334155] hover:border-[#3B82F6]/50 hover:bg-[#0F1115]'
            }`}
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={() => setIsDragging(false)}
             onDrop={handleDrop}
             onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <iconify-icon icon="solar:file-check-linear" class="text-[#10B981] text-4xl"></iconify-icon>
                <div>
                  <p className="text-sm font-medium text-[#10B981]">{file.name}</p>
                  <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="px-3 py-1 text-xs font-medium text-[#EF4444] border border-[#EF4444]/30 rounded hover:bg-[#EF4444]/10 transition-colors"
                >
                  Quitar archivo nuevo
                </button>
              </div>
            ) : isEditing && existingPedido?.sustento_url ? (
              <div className="flex flex-col items-center gap-2">
                <iconify-icon icon="solar:document-text-linear" class="text-[#3B82F6] text-4xl"></iconify-icon>
                <p className="text-sm font-medium text-[#3B82F6]">{existingPedido.sustento_nombre || 'Sustento existente cargado'}</p>
                <p className="text-sm text-[#94A3B8]">Haz clic o arrastra para reemplazar este archivo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <iconify-icon icon="solar:upload-linear" class="text-[#94A3B8] text-4xl"></iconify-icon>
                <p className="text-sm font-medium text-[#E2E8F0]">Haz clic para subir un archivo</p>
                <p className="text-sm text-[#94A3B8]">O arrastra el archivo directamente aquí</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="h-28"></div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-[#181B21] border-t border-[#334155] shadow-xl z-20">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex items-center justify-between gap-6 px-2">
            <div className="space-y-1">
              <span className="text-xs text-[#94A3B8] block">Suma líneas: {formatCurrency(sumaLineas)}</span>
              {descuentoGlobal > 0 && <span className="text-xs text-[#EF4444] block">Descuento: -{formatCurrency(descuentoGlobal)}</span>}
              {aplicaIgv && <span className="text-xs text-[#94A3B8] block">IGV (18%): {formatCurrency(igvMonto)}</span>}
            </div>
            <div className="text-right">
              <span className="block text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Total del Pedido</span>
              <span className="text-2xl font-semibold text-[#E2E8F0] tracking-tight">{formatCurrency(totalFinal)}</span>
            </div>
          </div>
          
          <div className="w-full sm:w-auto flex gap-3">
             <button
               onClick={() => router.push('/pedidos')}
               disabled={isSubmitting}
               className="flex-1 sm:flex-none border border-[#334155] text-[#94A3B8] text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
             >
               Cancelar
             </button>
             <button
               onClick={handleSave}
               disabled={isSubmitting || !file || lineas.length === 0 || !clienteId}
               className="flex-1 sm:flex-none bg-[#3B82F6] text-white text-sm font-medium px-8 py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
             >
               {isSubmitting ? (
                 <>
                   <iconify-icon icon="solar:spinner-linear" class="animate-spin text-lg"></iconify-icon>
                   Guardando...
                 </>
               ) : (
                 <>
                   <iconify-icon icon="solar:box-linear" class="text-lg"></iconify-icon>
                   Crear Pedido Directo
                 </>
               )}
             </button>
          </div>
        </div>
      </footer>

      <ClientFormModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSuccess={handleClientCreated} />
    </div>
  );
}
