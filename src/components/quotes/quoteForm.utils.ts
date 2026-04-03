import type { Client } from '@/services/clients.service';
import type { QuoteFormData, QuoteLineItem } from '@/services/quotes.service';
import { formatCurrency as formatCurrencyUtil, getClientDisplayName as getClientNameUtil } from '@/utils/formatters';
import { TAX_RATES } from '@/constants';

export interface QuoteTotals {
  subtotal: number;
  igv_monto: number;
  total_final: number;
}

export const createEmptyLineItem = (): QuoteLineItem => ({
  producto_id: null,
  nombre_producto_historico: '',
  cantidad: 1,
  precio_unitario: 0,
  descuento_linea_monto: 0,
  subtotal_linea: 0,
});

export const getInitialQuoteData = (): QuoteFormData => {
  const fechaEmision = new Date();
  const fechaValidez = new Date(fechaEmision);
  fechaValidez.setDate(fechaValidez.getDate() + 15);

  return {
    cliente_id: '',
    vendedor_id: '',
    origen: 'Manual',
    fecha_emision: fechaEmision.toISOString().split('T')[0],
    fecha_validez: fechaValidez.toISOString().split('T')[0],
    aplica_igv: true,
    descuento_global_monto: 0,
    observaciones_pdf: '',
    subtotal: 0,
    igv_monto: 0,
    total_final: 0,
    estado: 'Borrador',
    seguimiento_automatico: true,
    lineas: [],
  };
};

export const calculateQuoteTotals = (lineItems: QuoteLineItem[], descuentoGlobalInput: number, aplicaIgv: boolean): QuoteTotals => {
  const subtotalBase = lineItems.reduce((acc, item) => acc + (item.subtotal_linea || 0), 0);
  const descuentoGlobal = Number(descuentoGlobalInput) || 0;
  
  // IGV se calcula sobre la base completa (sin descontar el descuento global aún)
  const igv = aplicaIgv ? subtotalBase * TAX_RATES.IGV : 0;
  
  // Subtotal con IGV = Base + IGV
  const subtotalConIgv = subtotalBase + igv;
  
  // Total Final = (Base + IGV) - Descuento Global
  const total_final = Math.max(0, subtotalConIgv - descuentoGlobal);

  return {
    subtotal: subtotalBase,
    igv_monto: igv,
    total_final: total_final,
  };
};

export const validateQuoteForm = (quoteData: QuoteFormData, lineItems: QuoteLineItem[]): string | null => {
  if (!quoteData.cliente_id) return 'Por favor selecciona un cliente de la lista.';
  if (!quoteData.vendedor_id) return 'Por favor asigna un vendedor a esta cotización.';

  const invalidLines = lineItems.some(
    (line) => line.nombre_producto_historico.trim() === '' || Number(line.cantidad) <= 0 || Number(line.precio_unitario) < 0,
  );
  if (invalidLines) return 'Asegúrate de que todas las líneas tengan nombre de producto y cantidades válidas (mayor a 0).';

  return null;
};

export const getClientDisplayName = (client: Client): string => {
  const baseName = getClientNameUtil(client);
  const nameWithDoc = client.numero_documento 
    ? `${baseName} (Doc: ${client.numero_documento})`
    : baseName;
  return client.activo ? nameWithDoc : `${nameWithDoc} - (Inactivo)`;
};

export const formatCurrency = (value: number): string => formatCurrencyUtil(value);

export const blobToBase64 = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
