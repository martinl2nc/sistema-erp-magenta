/**
 * Custom hook para formateo memoizado de moneda
 * Evita recrear el formatter en cada render para mejor performance
 */

import { useMemo } from 'react';

export interface UseCurrencyFormatterOptions {
  /** Código de idioma (default: 'es-PE') */
  locale?: string;
  
  /** Código de moneda (default: 'PEN') */
  currency?: string;
  
  /** Número mínimo de decimales (default: undefined - usa default del currency) */
  minimumFractionDigits?: number;
  
  /** Número máximo de decimales (default: undefined - usa default del currency) */
  maximumFractionDigits?: number;
}

export interface UseCurrencyFormatterReturn {
  /** Formatea un número como moneda */
  format: (value: number) => string;
  
  /** Formatea y retorna las partes del número (útil para styling customizado) */
  formatParts: (value: number) => Intl.NumberFormatPart[];
  
  /** Formatter original (por si necesitas acceso directo) */
  formatter: Intl.NumberFormat;
}

/**
 * Hook personalizado para formateo memoizado de moneda
 * 
 * Ventajas vs formatCurrency directo:
 * - Memoización: No recrea el formatter en cada render
 * - Performance: Ideal para listas grandes de precios
 * - Flexibilidad: Permite configurar locale, currency y decimales
 * 
 * @example
 * ```tsx
 * // Uso básico (soles peruanos)
 * const { format } = useCurrencyFormatter();
 * <span>{format(1234.56)}</span> // "S/ 1,234.56"
 * 
 * // Con configuración personalizada
 * const { format } = useCurrencyFormatter({ 
 *   currency: 'USD',
 *   maximumFractionDigits: 0 
 * });
 * <span>{format(1234.56)}</span> // "$1,235"
 * 
 * // Para styling custom de partes
 * const { formatParts } = useCurrencyFormatter();
 * const parts = formatParts(1234.56);
 * parts.map(part => 
 *   part.type === 'currency' 
 *     ? <span className="text-gray-500">{part.value}</span>
 *     : <span>{part.value}</span>
 * )
 * ```
 */
export function useCurrencyFormatter(
  options: UseCurrencyFormatterOptions = {}
): UseCurrencyFormatterReturn {
  const {
    locale = 'es-PE',
    currency = 'PEN',
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;

  // Memoizar el formatter para evitar recrearlo en cada render
  const formatter = useMemo(() => {
    const formatOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
    };

    if (minimumFractionDigits !== undefined) {
      formatOptions.minimumFractionDigits = minimumFractionDigits;
    }

    if (maximumFractionDigits !== undefined) {
      formatOptions.maximumFractionDigits = maximumFractionDigits;
    }

    return new Intl.NumberFormat(locale, formatOptions);
  }, [locale, currency, minimumFractionDigits, maximumFractionDigits]);

  // Memoizar las funciones de formato
  const format = useMemo(() => {
    return (value: number) => formatter.format(value);
  }, [formatter]);

  const formatParts = useMemo(() => {
    return (value: number) => formatter.formatToParts(value);
  }, [formatter]);

  return {
    format,
    formatParts,
    formatter,
  };
}

/**
 * Hook especializado para formateo de moneda peruana (PEN)
 * Atajos comunes para soles peruanos
 */
export function usePenFormatter() {
  return useCurrencyFormatter({ currency: 'PEN' });
}

/**
 * Hook especializado para formateo de dólares (USD)
 */
export function useUsdFormatter() {
  return useCurrencyFormatter({ currency: 'USD' });
}

/**
 * Hook para formateo sin decimales (útil para totales redondeados)
 */
export function useCurrencyFormatterNoDecimals(currency: string = 'PEN') {
  return useCurrencyFormatter({ 
    currency, 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  });
}
