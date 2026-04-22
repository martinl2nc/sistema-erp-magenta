/**
 * Tipos y interfaces compartidos en la aplicación
 */

/**
 * Línea de pedido/cotización (histórico)
 * Representa una línea de producto con su información histórica
 * para mantener precios y nombres aunque el producto cambie
 */
export interface LineaLocal {
  /** ID del producto (null si fue eliminado o es personalizado) */
  producto_id: string | null;
  
  /** Nombre del producto en el momento de la creación (histórico) */
  nombre_producto_historico: string;
  
  /** Cantidad del producto */
  cantidad: number;
  
  /** Precio unitario del producto */
  precio_unitario: number;

  /** Descuento aplicado a esta línea (monto en soles) */
  descuento_linea_monto: number;
  
  /** Indica si el producto permite cantidades fraccionarias (ej: 1.5) */
  fraccionable: boolean;
}

/**
 * Resultado de cálculos financieros
 * Contiene todos los valores calculados para un pedido/cotización
 */
export interface FinancialCalculation {
  /** Suma de todas las líneas (Base Imponible) */
  subtotal: number;
  
  /** Monto del descuento global aplicado (se resta del total con IGV) */
  descuento: number;
  
  /** Base imponible (se mantiene igual al subtotal) */
  baseImponible: number;
  
  /** Monto del IGV calculado (18% sobre el subtotal) */
  igv: number;
  
  /** Total final a pagar (Subtotal + IGV - Descuento) */
  total: number;
}

/**
 * Estados posibles de una cotización
 */
export type EstadoCotizacion = 'Borrador' | 'Enviada' | 'Aprobada' | 'Cancelada';

/**
 * Estados posibles de un pedido
 */
export type EstadoPedido = 'Pendiente' | 'Procesando' | 'Completado' | 'Cancelado';

/**
 * Estados posibles de una factura
 */
export type EstadoFactura = 'Pendiente' | 'Emitida' | 'Anulada' | 'Rechazada';

/**
 * Tipos de comprobantes electrónicos SUNAT
 */
export type TipoComprobante = 'Factura' | 'Boleta' | 'NotaCredito' | 'NotaDebito';

/**
 * Tipos de documento de identidad
 */
export type TipoDocumento = 'DNI' | 'RUC' | 'Pasaporte' | 'Carnet de Extranjería';

/**
 * Roles de usuario en el sistema
 */
export type UserRole = 'admin' | 'vendedor';

/**
 * Monedas soportadas
 */
export type Currency = 'PEN' | 'USD';

/**
 * Interfaz base para entidades con timestamps
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Interfaz para datos de cliente (mínimo requerido para display)
 */
export interface ClientDisplayInfo {
  razon_social?: string | null;
  nombres_contacto?: string | null;
  apellidos_contacto?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  direccion?: string | null;
}

/**
 * Opciones de ordenamiento
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Estado de carga genérico
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface MetodoPago {
  codigo: string;
  descripcion: string;
  requiere_referencia: boolean;
  activo: boolean;
}

export interface CuentaBancaria {
  id: string;
  banco: string;
  numero_cuenta: string;
  cci: string | null;
  moneda: string;
  es_detraccion: boolean;
  activo: boolean;
  created_at: string;
  _tiene_pagos?: boolean;
}
