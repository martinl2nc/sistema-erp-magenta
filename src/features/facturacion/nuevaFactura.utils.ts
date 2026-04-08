import type { LineaFactura } from '@/features/facturacion/useNuevaFacturaState';
import type { ConfiguracionSerie } from '@/services/configuracionSeries.service';

export function validateNuevaFactura(params: {
  clienteId: string | null;
  lineas: LineaFactura[];
  serie: ConfiguracionSerie | null | undefined;
}): string | null {
  if (!params.clienteId) return 'Seleccioná un cliente para continuar';
  if (params.lineas.length === 0) return 'Agregá al menos una línea al comprobante';
  if (!params.serie) return 'No hay serie activa configurada para este tipo de comprobante';
  return null;
}
