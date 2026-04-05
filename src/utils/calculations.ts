/**
 * Utilidades de cálculo financiero
 * Centraliza toda la lógica de cálculos monetarios para pedidos y cotizaciones
 */

import { TAX_RATES, DECIMAL_PRECISION } from '@/constants';
import type { LineaLocal, FinancialCalculation } from '@/types/common.types';

/**
 * Redondea un número a la precisión decimal especificada
 * Usa toFixed para asegurar precisión en cálculos monetarios
 * 
 * @param value - Valor a redondear
 * @param decimals - Número de decimales (default: 2)
 * @returns Valor redondeado
 * 
 * @example
 * roundToDecimal(1.2345) // 1.23
 * roundToDecimal(1.2345, 3) // 1.235
 */
export const roundToDecimal = (
  value: number, 
  decimals: number = DECIMAL_PRECISION
): number => {
  return parseFloat(value.toFixed(decimals));
};

/**
 * Calcula el subtotal de una línea (cantidad × precio unitario)
 * Redondea automáticamente a 2 decimales
 * 
 * @param linea - Línea de pedido/cotización
 * @returns Subtotal redondeado
 * 
 * @example
 * calculateLineSubtotal({ cantidad: 10, precio_unitario: 50.5, ... }) // 505.00
 */
export const calculateLineSubtotal = (linea: LineaLocal): number => {
  const bruto = linea.cantidad * linea.precio_unitario;
  const descuento = linea.descuento_linea_monto || 0;
  return roundToDecimal(Math.max(0, bruto - descuento));
};

/**
 * Calcula el subtotal de todas las líneas
 * Suma todos los subtotales y redondea el resultado
 * 
 * @param lineas - Array de líneas
 * @returns Subtotal total redondeado
 * 
 * @example
 * const lineas = [
 *   { cantidad: 10, precio_unitario: 50, ... },
 *   { cantidad: 5, precio_unitario: 30.5, ... }
 * ];
 * calculateLinesTotal(lineas) // 652.50
 */
export const calculateLinesTotal = (lineas: LineaLocal[]): number => {
  const total = lineas.reduce((sum, linea) => {
    return sum + calculateLineSubtotal(linea);
  }, 0);
  
  return roundToDecimal(total);
};

/**
 * Calcula todos los valores financieros de un pedido/cotización
 * 
 * Proceso de cálculo:
 * 1. Suma de líneas (subtotal)
 * 2. Aplicar descuento global → Base imponible
 * 3. Calcular IGV si aplica (18% de base imponible)
 * 4. Total = Base imponible + IGV
 * 
 * @param lineas - Array de líneas del documento
 * @param descuentoGlobal - Descuento global a aplicar (en monto, no porcentaje)
 * @param aplicaIgv - Si se debe aplicar IGV (18%)
 * @returns Objeto con todos los cálculos financieros
 * 
 * @example
 * const lineas = [
 *   { cantidad: 10, precio_unitario: 50.00, ... },  // 500.00
 *   { cantidad: 5, precio_unitario: 30.50, ... },   // 152.50
 * ];
 * 
 * const result = calculateFinancials(lineas, 50.00, true);
 * // {
 * //   subtotal: 652.50,
 * //   descuento: 50.00,
 * //   baseImponible: 602.50,
 * //   igv: 108.45,
 * //   total: 710.95
 * // }
 */
export const calculateFinancials = (
  lineas: LineaLocal[],
  descuentoGlobal: number,
  aplicaIgv: boolean
): FinancialCalculation => {
  // 1. Calcular subtotal de todas las líneas (Base Imponible)
  const subtotal = calculateLinesTotal(lineas);
  
  // 2. Calcular IGV (18% sobre la base imponible completa)
  const igv = aplicaIgv 
    ? roundToDecimal(subtotal * TAX_RATES.IGV) 
    : 0;
  
  // 3. Calcular total provisional (Base + IGV)
  const totalProvisional = subtotal + igv;
  
  // 4. Aplicar descuento global sobre el total con IGV
  const total = roundToDecimal(Math.max(0, totalProvisional - descuentoGlobal));

  return {
    subtotal: roundToDecimal(subtotal),
    descuento: descuentoGlobal,
    baseImponible: roundToDecimal(subtotal), // La base imponible es el subtotal antes de impuestos
    igv,
    total,
  };
};

/**
 * Valida que una línea tenga valores válidos
 * 
 * @param linea - Línea a validar
 * @returns true si la línea es válida
 */
export const isValidLine = (linea: LineaLocal): boolean => {
  return (
    linea.nombre_producto_historico.trim() !== '' &&
    linea.cantidad > 0 &&
    linea.precio_unitario >= 0
  );
};

/**
 * Valida que todas las líneas sean válidas
 * 
 * @param lineas - Array de líneas
 * @returns true si todas las líneas son válidas
 */
export const areAllLinesValid = (lineas: LineaLocal[]): boolean => {
  if (lineas.length === 0) return false;
  return lineas.every(isValidLine);
};

// ─── Cálculos SUNAT por línea ───────────────────────────────────────────────

export interface LineaSunatCalc {
  mto_valor_unitario: number;
  mto_base_igv: number;
  mto_igv: number;
  subtotal: number;
}

/**
 * Calcula los valores SUNAT de una línea de comprobante.
 * Separado de calculateFinancials porque la afectación IGV (Cat. 07) cambia el comportamiento.
 *
 * @param precioUnitario - Precio unitario base (sin IGV)
 * @param cantidad - Cantidad
 * @param afectacionIgv - Código Cat. 07 SUNAT ('10'=gravado, '20'=exonerado, otros=inafecto)
 * @param descuentoLinea - Descuento aplicado a la línea (monto, default 0)
 */
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

/**
 * Agrega los totales del comprobante por tipo de afectación IGV.
 * Aplica el descuento global (Cód. 03) sobre el subtotal con IGV.
 */
export const calcularTotalesSunat = (
  lineas: Array<Pick<LineaSunatCalc, 'mto_base_igv' | 'mto_igv' | 'subtotal'> & { afectacion_igv: string }>,
  descuentoMonto: number,
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

  const subtotalConIgv = roundToDecimal(baseGravada + baseExonerada + baseInafecta + totalIgv);
  return {
    subtotal: subtotalConIgv,
    mto_oper_gravadas: roundToDecimal(baseGravada),
    mto_oper_exoneradas: roundToDecimal(baseExonerada),
    mto_oper_inafectas: roundToDecimal(baseInafecta),
    igv: roundToDecimal(totalIgv),
    total: roundToDecimal(subtotalConIgv - descuentoMonto),
    descuentoMonto: roundToDecimal(descuentoMonto),
  };
};

// ─── Descuentos ──────────────────────────────────────────────────────────────

/**
 * Calcula el descuento global como porcentaje del subtotal
 * 
 * @param descuentoMonto - Monto del descuento
 * @param subtotal - Subtotal antes del descuento
 * @returns Porcentaje de descuento (0-100)
 * 
 * @example
 * calculateDiscountPercentage(50, 500) // 10
 */
export const calculateDiscountPercentage = (
  descuentoMonto: number,
  subtotal: number
): number => {
  if (subtotal === 0) return 0;
  return roundToDecimal((descuentoMonto / subtotal) * 100);
};

/**
 * Calcula el monto de descuento a partir de un porcentaje
 * 
 * @param porcentaje - Porcentaje de descuento (0-100)
 * @param subtotal - Subtotal antes del descuento
 * @returns Monto del descuento
 * 
 * @example
 * calculateDiscountAmount(10, 500) // 50
 */
export const calculateDiscountAmount = (
  porcentaje: number,
  subtotal: number
): number => {
  return roundToDecimal((subtotal * porcentaje) / 100);
};
