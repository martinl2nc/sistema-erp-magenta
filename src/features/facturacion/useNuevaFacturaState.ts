'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePedidosElegiblesFacturacion, usePedidoLineas } from '@/hooks/usePedidos';
import { useTiposDocumento } from '@/hooks/useCatalogos';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { calcularLineaSunat, calcularTotalesSunat } from '@/utils/calculations';
import { distribuirCuotas } from '@/features/facturacion/nuevaFactura.utils';
import type { Pedido } from '@/services/pedidos.service';
import type { Client } from '@/services/clients.service';

// ─── CuotaCredito ─────────────────────────────────────────────

export interface CuotaCredito {
  id: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
}

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
  formaPago: 'Contado' as 'Contado' | 'Credito',
  cuotas: [] as CuotaCredito[],
  numeroCuotas: 1,
  intervaloDias: 30,
};

// ─── Hook ──────────────────────────────────────────────────────

export function useNuevaFacturaState(initialClients: Client[]) {
  const { data: pedidos = [] } = usePedidosElegiblesFacturacion();
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
  const [formaPago, setFormaPago] = useState<'Contado' | 'Credito'>('Contado');
  const [cuotas, setCuotas] = useState<CuotaCredito[]>([]);
  const [numeroCuotas, setNumeroCuotas] = useState(1);
  const [intervaloDias, setIntervaloDias] = useState(30);

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

  // Monto neto a financiar = total - detracción
  const montoNeto = useMemo(
    () => Number((totales.total - detraccionMonto).toFixed(2)),
    [totales.total, detraccionMonto],
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

  // Re-distribuir cuotas automáticamente cuando cambian parámetros clave
  useEffect(() => {
    if (formaPago !== 'Credito' || montoNeto <= 0) return;
    const fechaHoy = new Date().toISOString().split('T')[0];
    setCuotas(distribuirCuotas(montoNeto, numeroCuotas, fechaHoy, intervaloDias));
  }, [formaPago, numeroCuotas, intervaloDias, montoNeto]);

  // ─── Handlers ────────────────────────────────────────────────

  const handleFormaPagoChange = (value: 'Contado' | 'Credito') => {
    setFormaPago(value);
    if (value === 'Contado') setCuotas([]);
  };

  const handleNumeroCuotasChange = (n: number) => {
    setNumeroCuotas(Math.max(1, n));
  };

  const handleIntervaloDiasChange = (dias: number) => {
    setIntervaloDias(Math.max(1, dias));
  };

  const updateCuota = (id: string, patch: Partial<Omit<CuotaCredito, 'id'>>) => {
    setCuotas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

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
    pendingPedidos: pedidos,
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
    montoNeto,
    // Forma de pago / cuotas a crédito
    formaPago,
    handleFormaPagoChange,
    cuotas,
    updateCuota,
    numeroCuotas,
    handleNumeroCuotasChange,
    intervaloDias,
    handleIntervaloDiasChange,
    // Clientes para selector standalone
    initialClients,
  };
}
