import type { LineaFactura } from '@/features/facturacion/useNuevaFacturaState';
import type { ConfiguracionSerie } from '@/services/configuracionSeries.service';

export function validateNuevaFactura(params: {
  clienteId: string | null;
  lineas: LineaFactura[];
  serie: ConfiguracionSerie | null | undefined;
  tipoOperacion: string;
  detraccion?: {
    cod_bien: string;
    porcentaje: number;
    cuenta_bn: string;
  };
}): string | null {
  if (!params.clienteId) return 'Seleccioná un cliente para continuar';
  if (params.lineas.length === 0) return 'Agregá al menos una línea al comprobante';
  if (!params.serie) return 'No hay serie activa configurada para este tipo de comprobante';

  // Validar detracción si la operación está sujeta a detracción (Cat. 51 código 1001)
  if (params.tipoOperacion === '1001') {
    if (!params.detraccion?.cod_bien?.trim()) {
      return 'Seleccioná el bien/servicio sujeto a detracción';
    }
    if (!params.detraccion?.porcentaje || params.detraccion.porcentaje <= 0) {
      return 'Ingresá el porcentaje de detracción (debe ser mayor a 0)';
    }
    if (!params.detraccion?.cuenta_bn?.trim()) {
      return 'Ingresá la cuenta del Banco de la Nación para la detracción';
    }
  }

  return null;
}
