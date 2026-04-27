import { TAX_RATES, DECIMAL_PRECISION } from '@/constants';
import type { LineaLocal, FinancialCalculation } from '@/types/common.types';

export const roundToDecimal = (
  value: number, 
  decimals: number = DECIMAL_PRECISION
): number => {
  return parseFloat(value.toFixed(decimals));
};

export const calculateLineSubtotal = (linea: LineaLocal): number => {
  const bruto = linea.cantidad * linea.precio_unitario;
  const descuento = linea.descuento_linea_monto || 0;
  return roundToDecimal(Math.max(0, bruto - descuento));
};

export const calculateLinesTotal = (lineas: LineaLocal[]): number => {
  const total = lineas.reduce((sum, linea) => {
    return sum + calculateLineSubtotal(linea);
  }, 0);
  
  return roundToDecimal(total);
};

export const calculateQuoteTotals = (
  lineas: LineaLocal[],
  descuentoGlobal: number,
  aplicaIgv: boolean
): FinancialCalculation => {
  const subtotal = calculateLinesTotal(lineas);
  const igv = aplicaIgv 
    ? roundToDecimal(subtotal * TAX_RATES.IGV) 
    : 0;
  const totalProvisional = subtotal + igv;
  const total = roundToDecimal(Math.max(0, totalProvisional - descuentoGlobal));

  return {
    subtotal: roundToDecimal(subtotal),
    descuento: descuentoGlobal,
    baseImponible: roundToDecimal(subtotal),
    igv,
    total,
  };
};

export const calculatePedidoTotalsFromLines = (
  lineas: Array<{ subtotal_linea: number }>,
  descuentoGlobal: number,
  aplicaIgv: boolean
) => {
  const baseTotal = lineas.reduce((acc, l) => acc + Number(l.subtotal_linea), 0);
  const igvTotal = aplicaIgv ? roundToDecimal(baseTotal * TAX_RATES.IGV) : 0;
  const subtotalConIgv = baseTotal + igvTotal;
  const totalFinal = roundToDecimal(Math.max(0, subtotalConIgv - (descuentoGlobal || 0)));

  return { baseTotal, igvTotal, totalFinal };
};

export const isValidLine = (linea: LineaLocal): boolean => {
  return (
    linea.nombre_producto_historico.trim() !== '' &&
    linea.cantidad > 0 &&
    linea.precio_unitario >= 0
  );
};

export const areAllLinesValid = (lineas: LineaLocal[]): boolean => {
  if (lineas.length === 0) return false;
  return lineas.every(isValidLine);
};

export interface LineaSunatCalc {
  mto_valor_unitario: number;
  mto_base_igv: number;
  mto_igv: number;
  subtotal: number;
}

export const calcularLineaSunat = (
  precioUnitario: number,
  cantidad: number,
  afectacionIgv: string,
  descuentoLinea: number = 0,
): LineaSunatCalc => {
  const mto_valor_unitario = precioUnitario;
  const base_bruta = cantidad * mto_valor_unitario;
  const mto_base_igv = roundToDecimal(Math.max(0, base_bruta - descuentoLinea));

  if (afectacionIgv === '10') {
    const mto_igv = roundToDecimal(mto_base_igv * TAX_RATES.IGV);
    return { mto_valor_unitario, mto_base_igv, mto_igv, subtotal: roundToDecimal(mto_base_igv + mto_igv) };
  }

  return { mto_valor_unitario, mto_base_igv, mto_igv: 0, subtotal: mto_base_igv };
};

export interface TotalesSunat {
  subtotal: number;
  mto_oper_gravadas: number;
  mto_oper_exoneradas: number;
  mto_oper_inafectas: number;
  igv: number;
  total: number;
  descuentoMonto: number;
}

export const calcularTotalesSunat = (
  lineas: Array<Pick<LineaSunatCalc, 'mto_base_igv' | 'mto_igv' | 'subtotal'> & { afectacion_igv: string }>,
  descuentoMonto: number,
  descuentoCodigo: string = '03',
): TotalesSunat => {
  let baseGravada = 0;
  let baseExonerada = 0;
  let baseInafecta = 0;
  let totalIgv = 0;

  for (const l of lineas) {
    if (l.afectacion_igv === '10') {
      baseGravada += l.mto_base_igv;
      totalIgv += l.mto_igv;
    } else if (l.afectacion_igv === '20') {
      baseExonerada += l.subtotal;
    } else {
      baseInafecta += l.subtotal;
    }
  }

  const discount = roundToDecimal(descuentoMonto);
  // subtotal = base neta SIN IGV y ANTES del descuento global (para display correcto)
  const subtotal = roundToDecimal(baseGravada + baseExonerada + baseInafecta);

  let igv: number;
  let total: number;

  if (descuentoCodigo === '02' && discount > 0) {
    // El descuento global reduce la base imponible del IGV
    const gravadaNeta = roundToDecimal(Math.max(0, baseGravada - discount));
    igv = roundToDecimal(gravadaNeta * TAX_RATES.IGV);
    total = roundToDecimal(gravadaNeta + igv + baseExonerada + baseInafecta);
  } else {
    // El descuento global se aplica al total (no afecta la base del IGV)
    igv = roundToDecimal(totalIgv);
    total = roundToDecimal(subtotal + igv - discount);
  }

  return {
    subtotal,
    mto_oper_gravadas: roundToDecimal(baseGravada),
    mto_oper_exoneradas: roundToDecimal(baseExonerada),
    mto_oper_inafectas: roundToDecimal(baseInafecta),
    igv,
    total,
    descuentoMonto: discount,
  };
};

export interface SunatPayloadTotals {
  mtoOperGravadas: number;
  mtoOperExoneradas: number;
  mtoOperInafectas: number;
  mtoIGV: number;
  totalImpuestos: number;
  valorVenta: number;
  subTotal: number;
  mtoImpVenta: number;
}

export const buildSunatPayloadTotals = (
  detalles: Array<{
    mto_base_igv: number;
    igv: number;
    total_impuestos: number;
    tip_afe_igv_codigo: string | null;
  }>,
  descuentoGlobalMonto: number,
  descuentoCodigo: string = '03',
): SunatPayloadTotals => {
  let mtoOperGravadas = 0;
  let mtoOperExoneradas = 0;
  let mtoOperInafectas = 0;
  let mtoIGV = 0;
  let totalImpuestos = 0;
  let valorVenta = 0;

  for (const d of detalles) {
    const itemBase = roundToDecimal(d.mto_base_igv);
    const itemIgv = roundToDecimal(d.igv);
    const itemTotalImpuestos = roundToDecimal(d.total_impuestos);
    const tipAfe = d.tip_afe_igv_codigo ? String(d.tip_afe_igv_codigo) : '10';

    if (['10', '11', '12', '17'].includes(tipAfe)) {
      mtoOperGravadas = roundToDecimal(mtoOperGravadas + itemBase);
    } else if (['20', '21'].includes(tipAfe)) {
      mtoOperExoneradas = roundToDecimal(mtoOperExoneradas + itemBase);
    } else {
      mtoOperInafectas = roundToDecimal(mtoOperInafectas + itemBase);
    }

    mtoIGV = roundToDecimal(mtoIGV + itemIgv);
    totalImpuestos = roundToDecimal(totalImpuestos + itemTotalImpuestos);
    valorVenta = roundToDecimal(valorVenta + itemBase);
  }

  const discount = roundToDecimal(descuentoGlobalMonto);
  // subTotal = valorVenta + IGV bruto (sin descuento) → usado como BaseAmount del AllowanceCharge
  const subTotal = roundToDecimal(valorVenta + mtoIGV);

  if (descuentoCodigo === '02' && discount > 0) {
    // El descuento global reduce la base imponible: recalcular IGV sobre la base neta
    const gravadaNeta = roundToDecimal(Math.max(0, mtoOperGravadas - discount));
    const mtoIGV_neto = roundToDecimal(gravadaNeta * TAX_RATES.IGV);
    const mtoImpVenta = roundToDecimal(gravadaNeta + mtoIGV_neto + mtoOperExoneradas + mtoOperInafectas);
    return { mtoOperGravadas, mtoOperExoneradas, mtoOperInafectas, mtoIGV: mtoIGV_neto, totalImpuestos: mtoIGV_neto, valorVenta, subTotal, mtoImpVenta };
  }

  // Tipo '03' o sin descuento: el IGV no cambia, el descuento se resta del total
  const mtoImpVenta = roundToDecimal(subTotal - discount);
  return { mtoOperGravadas, mtoOperExoneradas, mtoOperInafectas, mtoIGV, totalImpuestos, valorVenta, subTotal, mtoImpVenta };
};

export const calculateDiscountPercentage = (
  descuentoMonto: number,
  subtotal: number
): number => {
  if (subtotal === 0) return 0;
  return roundToDecimal((descuentoMonto / subtotal) * 100);
};

export const calculateDiscountAmount = (
  porcentaje: number,
  subtotal: number
): number => {
  return roundToDecimal((subtotal * porcentaje) / 100);
};

export const calculateFinancials = calculateQuoteTotals;

export interface LineaCompraCalc {
  mto_valor_unitario: number;
  mto_valor_venta: number;
  igv: number;
  total_impuestos: number;
}

export const calcLineaCompra = (
  mto_precio_unitario: number,
  cantidad: number,
  descuento: number = 0,
): LineaCompraCalc => {
  const mto_valor_unitario = roundToDecimal(mto_precio_unitario / (1 + TAX_RATES.IGV), 6);
  const mto_valor_venta    = roundToDecimal(mto_valor_unitario * cantidad - descuento);
  const igv                = roundToDecimal(mto_valor_venta * TAX_RATES.IGV);
  return { mto_valor_unitario, mto_valor_venta, igv, total_impuestos: igv };
};

export interface TotalesCompra {
  baseGravada: number;
  igvCalculado: number;
  mtoIgv: number;
  total: number;
}

export const calcTotalesCompra = (
  lineas: Array<{ mto_valor_venta: number }>,
  descuentoGlobal: number,
  igvOverride: number | null,
): TotalesCompra => {
  const baseGravada  = roundToDecimal(lineas.reduce((s, l) => s + l.mto_valor_venta, 0) - descuentoGlobal);
  const igvCalculado = roundToDecimal(baseGravada * TAX_RATES.IGV);
  const mtoIgv       = igvOverride !== null ? igvOverride : igvCalculado;
  const total        = roundToDecimal(baseGravada + mtoIgv);
  return { baseGravada, igvCalculado, mtoIgv, total };
};
