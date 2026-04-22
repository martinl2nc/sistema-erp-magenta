/**
 * Constantes de la aplicación
 * Centraliza valores configurables y números mágicos
 */

/**
 * Tasas de impuestos en Perú
 */
export const TAX_RATES = {
  /** Impuesto General a las Ventas (18%) */
  IGV: 0.18,
} as const;

/**
 * Configuración de carga de archivos
 */
export const FILE_UPLOAD = {
  /** Tamaño máximo en megabytes */
  MAX_SIZE_MB: 10,
  
  /** Tamaño máximo en bytes (10 MB) */
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  
  /** Tipos MIME permitidos */
  ALLOWED_TYPES: {
    PDF: 'application/pdf',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    JPG: 'image/jpg',
  } as const,
  
  /** Array de tipos permitidos (para validación) */
  ALLOWED_TYPES_ARRAY: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ] as const,
  
  /** Mensaje de error para tipo no permitido */
  ERROR_INVALID_TYPE: 'Solo se permiten archivos PDF, JPG o PNG',
  
  /** Mensaje de error para tamaño excedido */
  ERROR_SIZE_EXCEEDED: 'El archivo no puede superar los 10 MB',
} as const;

/**
 * Precisión decimal para cálculos monetarios
 * Número de decimales a usar en redondeos
 */
export const DECIMAL_PRECISION = 2;

/**
 * Estados posibles de cotizaciones
 */
export const QUOTE_STATES = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  APPROVED: 'Aprobada',
  CANCELLED: 'Cancelada',
} as const;

/**
 * Estados posibles de pedidos
 */
export const ORDER_STATES = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
} as const;

/**
 * Tipos de comprobantes electrónicos SUNAT
 */
export const COMPROBANTE_TYPES = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
} as const;

/**
 * Tipos de documento de identidad
 */
export const DOCUMENT_TYPES = {
  DNI: '1',
  RUC: '6',
  PASSPORT: '7',
  CARNET_EXTRANJERIA: '4',
} as const;

/**
 * Monedas soportadas
 */
export const CURRENCIES = {
  PEN: 'PEN', // Soles
  USD: 'USD', // Dólares
} as const;

/**
 * Configuración de paginación
 */
export const PAGINATION = {
  /** Elementos por página por defecto */
  DEFAULT_PAGE_SIZE: 10,
  
  /** Opciones de elementos por página */
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
} as const;

/**
 * Tiempos de espera (en milisegundos)
 */
export const TIMEOUTS = {
  /** Duración de toast notifications */
  TOAST_DURATION: 3000,
  
  /** Timeout para debounce en búsquedas */
  SEARCH_DEBOUNCE: 300,
  
  /** Timeout para auto-guardado */
  AUTO_SAVE: 2000,
} as const;

// Umbral mínimo en PEN para mostrar panel de detracción en compras
export const DETRACCION_THRESHOLD_PEN = 700;

/**
 * Rutas de la aplicación
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  QUOTES: '/cotizaciones',
  QUOTES_NEW: '/cotizaciones/nueva',
  ORDERS: '/pedidos',
  ORDERS_NEW: '/pedidos/nuevo',
  BILLING: '/facturacion',
  ADMIN_CLIENTS: '/admin/clientes',
  ADMIN_PRODUCTS: '/admin/productos',
  ADMIN_COMPANY: '/admin/empresa',
  ADMIN_SELLERS: '/admin/vendedores',
} as const;
