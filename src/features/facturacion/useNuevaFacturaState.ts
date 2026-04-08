'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePedidosList, usePedidoLineas } from '@/hooks/usePedidos';
import { useTiposDocumento } from '@/hooks/useCatalogos';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { calcularLineaSunat, calcularTotalesSunat } from '@/utils/calculations';
import type { Pedido } from '@/services/pedidos.service';
import type { Client } from '@/services/clients.service';

// ─── LineaFactura ──────────────────────────────────────────────
// Representa una línea del comprobante en el formulario.
// Compatible con líneas derivadas de un pedido y líneas manuales.

export interface LineaFactura {
  _id: string;
  producto_id: string | null;
  sku: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  unidad_sunat: string;
  afectacion_igv: string;
  descuento_linea_monto: number;
  // Calculados por SUNAT
  mto_valor_unitario: number;
  mto_base_igv: number;
  mto_igv: number;
  subtotal: number;
}

// ─── Helpers ───────────────────────────────────────────────────

function createEmptyLinea(): LineaFactura {
  return {
    _id: crypto.randomUUID(),
    producto_id: null,
    sku: null,
    nombre_producto: '',
    cantidad: 1,
    precio_unitario: 0,
    unidad_sunat: 'NIU',
    afectacion_igv: '10',
    descuento_linea_monto: 0,
    mto_valor_unitario: 0,
    mto_base_igv: 0,
    mto_igv: 0,
    subtotal: 0,
  };
}

const EMPTY_STATE = {
  selectedClienteId: null as string | null,
  selectedClient: null as Client | null,
  tipoDocCodigo: '01',
  direccionFacturacion: '',
  lineas: [] as LineaFactura[],
  descuentoMonto: 0,
  tipoOperacion: '0101',
  detraccionCodBien: '',
  detraccionCodMedioPago: '001',
  detraccionPorcentaje: 0,
  detraccionMonto: 0,
  detraccionCuentaBn: '',
};

// ─── Hook ──────────────────────────────────────────────────────

export function useNuevaFacturaState(initialClients: Client[]) {
  const { data: pedidos = [] } = usePedidosList();
  const { data: tiposDoc = [] } = useTiposDocumento();
  const { data: companyConfig } = useCompanyConfig();

  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tipoDocCodigo, setTipoDocCodigo] = useState('01');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [lineas, setLineas] = useState<LineaFactura[]>([]);
  const [descuentoMonto, setDescuentoMonto] = useState(0);
  const [descuentoCodigo, setDescuentoCodigo] = useState('03');
  const [tipoOperacion, setTipoOperacion] = useState('0101');
  const [detraccionCodBien, setDetraccionCodBien] = useState('');
  const [detraccionCodMedioPago, setDetraccionCodMedioPago] = useState('001');
  const [detraccionPorcentaje, setDetraccionPorcentaje] = useState(0);
  const [detraccionMonto, setDetraccionMonto] = useState(0);
  const [detraccionCuentaBn, setDetraccionCuentaBn] = useState('');

  // Pedidos filtrados para el selector
  const pendingPedidos = useMemo(
    () => pedidos.filter((p) => ['pendiente_facturacion', 'error_facturacion'].includes(p.estado)),
    [pedidos],
  );

  // Pedido actualmente seleccionado
  const selectedPedido = useMemo(
    () => pedidos.find((p) => p.id === selectedPedidoId) ?? null,
    [pedidos, selectedPedidoId],
  );

  // Tipos de comprobante (Factura/Boleta)
  const tiposComprobante = useMemo(
    () => tiposDoc.filter((t) => t.categoria === 'comprobante'),
    [tiposDoc],
  );

  // Líneas del pedido seleccionado
  const { data: pedidoLineasData, isLoading: loadingLineas } = usePedidoLineas(
    selectedPedidoId ?? undefined,
  );

  // Totales derivados (memoizados)
  const totales = useMemo(
    () => calcularTotalesSunat(lineas, descuentoMonto),
    [lineas, descuentoMonto],
  );

  // Sincronizar líneas cuando llegan del servidor
  useEffect(() => {
    if (!pedidoLineasData || !selectedPedidoId) return;
    const pedido = pedidos.find((p) => p.id === selectedPedidoId);
    const defaultAfectacion = pedido?.aplica_igv ? '10' : '20';
    setLineas(
      pedidoLineasData.map((l) => {
        const calc = calcularLineaSunat(
          l.precio_unitario,
          l.cantidad,
          defaultAfectacion,
          l.descuento_linea_monto ?? 0,
        );
        return {
          _id: l.id,
          producto_id: l.producto_id,
          sku: l.sku ?? null,
          nombre_producto: l.nombre_producto_historico,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          unidad_sunat: 'NIU',
          afectacion_igv: defaultAfectacion,
          descuento_linea_monto: l.descuento_linea_monto ?? 0,
          ...calc,
        };
      }),
    );
    setDescuentoMonto(pedido?.descuento_global_monto ?? 0);
  }, [pedidoLineasData, selectedPedidoId, pedidos]);

  // Auto-calcular monto de detracción
  useEffect(() => {
    if (tipoOperacion === '1001' && detraccionPorcentaje > 0) {
      setDetraccionMonto(
        Number((totales.total * (detraccionPorcentaje / 100)).toFixed(2)),
      );
    }
  }, [totales.total, detraccionPorcentaje, tipoOperacion]);

  // Pre-llenar cuenta BN desde config de empresa
  useEffect(() => {
    if (tipoOperacion === '1001' && companyConfig?.detraccion_cuenta_bn) {
      setDetraccionCuentaBn((prev) => prev || companyConfig.detraccion_cuenta_bn || '');
    }
  }, [tipoOperacion, companyConfig?.detraccion_cuenta_bn]);

  // ─── Handlers ────────────────────────────────────────────────

  const handlePedidoSelect = (pedidoId: string | null) => {
    setSelectedPedidoId(pedidoId);

    if (!pedidoId) {
      setSelectedClienteId(EMPTY_STATE.selectedClienteId);
      setSelectedClient(EMPTY_STATE.selectedClient);
      setTipoDocCodigo(EMPTY_STATE.tipoDocCodigo);
      setDireccionFacturacion(EMPTY_STATE.direccionFacturacion);
      setLineas(EMPTY_STATE.lineas);
      setDescuentoMonto(EMPTY_STATE.descuentoMonto);
      setTipoOperacion(EMPTY_STATE.tipoOperacion);
      return;
    }

    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido?.clientes) return;

    const cliente = pedido.clientes;
    setSelectedClienteId(pedido.cliente_id);

    // Auto-seleccionar tipo comprobante según preferencia del cliente
    const preferido = cliente.comprobante_preferido?.toLowerCase();
    const match = tiposComprobante.find((t) =>
      t.descripcion.toLowerCase().includes(preferido ?? 'factura'),
    );
    setTipoDocCodigo(match?.codigo ?? tiposComprobante[0]?.codigo ?? '01');

    setDireccionFacturacion(cliente.direccion || '');
    // Las líneas se sincronizan via useEffect cuando llega pedidoLineasData
  };

  const handleClienteSelect = (clienteId: string | null, client: Client | null) => {
    setSelectedClienteId(clienteId);
    setSelectedClient(client);

    if (!client) return;

    const preferido = client.comprobante_preferido?.toLowerCase();
    const match = tiposComprobante.find((t) =>
      t.descripcion.toLowerCase().includes(preferido ?? 'factura'),
    );
    setTipoDocCodigo(match?.codigo ?? '01');
    setDireccionFacturacion(client.direccion || '');
  };

  const addLinea = () => {
    setLineas((prev) => [...prev, createEmptyLinea()]);
  };

  const removeLinea = (idx: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLinea = (idx: number, patch: Partial<LineaFactura>) => {
    setLineas((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, ...patch };
        // Recalcular SUNAT si cambian campos que afectan el cálculo
        if (
          'precio_unitario' in patch ||
          'cantidad' in patch ||
          'afectacion_igv' in patch ||
          'descuento_linea_monto' in patch
        ) {
          const calc = calcularLineaSunat(
            updated.precio_unitario,
            updated.cantidad,
            updated.afectacion_igv,
            updated.descuento_linea_monto,
          );
          return { ...updated, ...calc };
        }
        return updated;
      }),
    );
  };

  return {
    // Pedido
    selectedPedidoId,
    selectedPedido,
    pendingPedidos,
    loadingLineas,
    handlePedidoSelect,
    // Cliente
    selectedClienteId,
    selectedClient,
    handleClienteSelect,
    // Comprobante
    tipoDocCodigo,
    setTipoDocCodigo,
    // Líneas
    lineas,
    addLinea,
    removeLinea,
    updateLinea,
    // Descuento global
    descuentoMonto,
    setDescuentoMonto,
    descuentoCodigo,
    setDescuentoCodigo,
    // Tipo operación + detracción
    tipoOperacion,
    setTipoOperacion,
    detraccionCodBien,
    setDetraccionCodBien,
    detraccionCodMedioPago,
    setDetraccionCodMedioPago,
    detraccionPorcentaje,
    setDetraccionPorcentaje,
    detraccionMonto,
    setDetraccionMonto,
    detraccionCuentaBn,
    setDetraccionCuentaBn,
    // Dirección
    direccionFacturacion,
    setDireccionFacturacion,
    // Totales
    totales,
    // Clientes para selector standalone
    initialClients,
  };
}
