'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { pedidosService } from '@/services/pedidos.service';
import { useCreatePedido, useUpdatePedidoCompleto } from '@/hooks/usePedidos';
import { clientsKeys } from '@/hooks/useClients';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePedidoLineItems } from '@/hooks/usePedidoLineItems';
import { useAuth } from '@/context/AuthContext';

import ClientFormModal from '@/features/clients/ClientFormModal';
import PedidoFormHeader from '@/components/pedidos/PedidoFormHeader';
import PedidoFormMasterData from '@/components/pedidos/PedidoFormMasterData';
import PedidoFormLineItems from '@/components/pedidos/PedidoFormLineItems';
import PedidoFormSustento from '@/components/pedidos/PedidoFormSustento';
import PedidoFormFooter from '@/components/pedidos/PedidoFormFooter';
import type { Client } from '@/services/clients.service';
import type { Product } from '@/services/products.service';
import type { Seller } from '@/services/sellers.service';
import type { Pedido, PedidoLinea } from '@/services/pedidos.service';
import { formatCurrency, getClientDisplayName } from '@/utils/formatters';
import { calculateFinancials } from '@/utils/calculations';

interface PedidoFormProps {
  id?: string;
  initialPedido?: Pedido & { lineas: PedidoLinea[] };
  initialAllClients: Client[];
  initialActiveClients: Client[];
  initialProducts: Product[];
  initialSellers: Seller[];
}

export default function PedidoForm({
  id,
  initialPedido,
  initialAllClients,
  initialActiveClients,
  initialProducts,
  initialSellers,
}: PedidoFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPedido = useCreatePedido();
  const { user, role } = useAuth();

  // Catalog data from server-side props
  const activeClients = initialActiveClients;
  const allClients = initialAllClients;
  const sellers = initialSellers;
  const products = initialProducts;

  const isEditing = !!id;
  const existingPedido = initialPedido;
  const updatePedido = useUpdatePedidoCompleto();

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
  const {
    file,
    isDragging,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFile,
    openFileDialog,
  } = useFileUpload();

  const {
    lineas,
    setAllLines,
    updateLineItem,
    addLineItem,
    removeLineItem,
    getLineSubtotal,
  } = usePedidoLineItems({
    products,
  });

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial calculations usando la utility centralizada
  const { subtotal: subtotalPedido, baseImponible: baseParaIgv, igv: igvMonto, total: totalFinal } = 
    calculateFinancials(lineas, descuentoGlobal, aplicaIgv);

  const sumaLineas = subtotalPedido; // Ya está calculado por calculateFinancials

  const handleClientCreated = (newClient: Client) => {
    queryClient.invalidateQueries({ queryKey: clientsKeys.all() });
    setClienteId(String(newClient.id));
    setDireccionFacturacion(newClient.direccion || '');
  };

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

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
        descuento_linea_monto: l.descuento_linea_monto || 0,
        fraccionable: products.find(p => String(p.id) === String(l.producto_id))?.fraccionable || false,
      })) || [];
      if (loadedLines.length > 0) setAllLines(loadedLines);
      
      setInitialized(true);
    } else if (!isEditing) {
      setInitialized(true);
    }
  }, [initialized, isEditing, existingPedido, products, setAllLines]);

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

      const lineasPayload = lineas.map((l, index) => ({
        producto_id: l.producto_id,
        nombre_producto_historico: l.nombre_producto_historico,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        descuento_linea_monto: l.descuento_linea_monto || 0,
        subtotal_linea: getLineSubtotal(index),
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



  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      <PedidoFormHeader onGoDashboard={() => router.push('/dashboard')} onGoPedidos={() => router.push('/pedidos')} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">Generar Pedido Directo</h1>
        </div>

        <PedidoFormMasterData
          clienteId={clienteId}
          vendedorId={vendedorId}
          nroOc={nroOc}
          fechaPedido={fechaPedido}
          direccionFacturacion={direccionFacturacion}
          observaciones={observaciones}
          aplicaIgv={aplicaIgv}
          descuentoGlobal={descuentoGlobal}
          selectableClients={selectableClients}
          sellers={sellers}
          isVendorLocked={isVendorLocked}
          getClientDisplayName={getClientDisplayName}
          onOpenClientModal={() => setIsClientModalOpen(true)}
          onClienteChange={(value) => {
            setClienteId(value);
            const selectedClient = selectableClients.find(c => String(c.id) === value);
            if (selectedClient) setDireccionFacturacion(selectedClient.direccion || '');
            else setDireccionFacturacion('');
          }}
          onVendedorChange={setVendedorId}
          onNroOcChange={setNroOc}
          onFechaPedidoChange={setFechaPedido}
          onDireccionFacturacionChange={setDireccionFacturacion}
          onObservacionesChange={setObservaciones}
          onAplicaIgvChange={setAplicaIgv}
          onDescuentoGlobalChange={setDescuentoGlobal}
        />

        <PedidoFormLineItems
          lineas={lineas}
          products={products}
          aplicaIgv={aplicaIgv}
          formatCurrency={formatCurrency}
          getLineSubtotal={getLineSubtotal}
          onUpdateLineItem={updateLineItem}
          onRemoveLineItem={removeLineItem}
          onAddLineItem={addLineItem}
        />

        <PedidoFormSustento
          isEditing={isEditing}
          isDragging={isDragging}
          file={file}
          existingSustentoUrl={existingPedido?.sustento_url}
          existingSustentoNombre={existingPedido?.sustento_nombre}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onOpenFileDialog={openFileDialog}
          onFileChange={handleFileChange}
          onClearFile={clearFile}
        />
        
        <div className="h-28"></div>
      </main>

      <PedidoFormFooter
        sumaLineas={formatCurrency(sumaLineas)}
        descuentoGlobal={descuentoGlobal}
        descuentoGlobalFmt={formatCurrency(descuentoGlobal)}
        aplicaIgv={aplicaIgv}
        igvMontoFmt={formatCurrency(igvMonto)}
        totalFinalFmt={formatCurrency(totalFinal)}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
        canSubmit={!isSubmitting && !!clienteId && !!direccionFacturacion.trim() && lineas.length > 0 && (!!file || (isEditing && !!existingPedido?.sustento_url))}
        onCancel={() => router.push('/pedidos')}
        onSave={handleSave}
      />

      <ClientFormModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSuccess={handleClientCreated} />
    </div>
  );
}
