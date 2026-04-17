import type { LineaFactura, CuotaCredito } from '@/features/facturacion/useNuevaFacturaState';
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

export function validateCuotas(
  cuotas: CuotaCredito[],
  montoNeto: number,
  fechaEmision: string,
): string | null {
  if (cuotas.length === 0) return 'Agregá al menos una cuota';

  for (const c of cuotas) {
    if (!c.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) {
      return 'Todas las cuotas deben tener una fecha válida (YYYY-MM-DD)';
    }
    if (c.fecha <= fechaEmision) {
      return 'Las fechas de vencimiento de las cuotas deben ser posteriores a la fecha de emisión';
    }
    if (c.monto <= 0) return 'El monto de cada cuota debe ser mayor a 0';
  }

  const sumatoria = Number(cuotas.reduce((s, c) => s + c.monto, 0).toFixed(2));
  const neto = Number(montoNeto.toFixed(2));
  if (sumatoria !== neto) {
    const diff = Number((sumatoria - neto).toFixed(2));
    return `La suma de cuotas (${sumatoria}) no coincide con el monto a financiar (${neto}). Diferencia: ${diff > 0 ? '+' : ''}${diff}`;
  }

  return null;
}

export function distribuirCuotas(
  monto: number,
  n: number,
  fechaBase: string,
  intervaloDias: number = 30,
): CuotaCredito[] {
  if (n <= 0) return [];

  const base = Math.floor((monto / n) * 100) / 100;
  const residuo = Number((monto - base * n).toFixed(2));

  return Array.from({ length: n }, (_, i) => {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + intervaloDias * (i + 1));
    const fechaStr = fecha.toISOString().split('T')[0];
    const montoCuota = i === n - 1 ? Number((base + residuo).toFixed(2)) : base;
    return { id: crypto.randomUUID(), monto: montoCuota, fecha: fechaStr };
  });
}
