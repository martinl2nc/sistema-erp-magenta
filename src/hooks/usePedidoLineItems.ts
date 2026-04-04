/**
 * Custom hook para gestión de líneas de pedido/cotización
 * Centraliza la lógica CRUD de líneas con validaciones automáticas
 */

import { useState, useCallback, useMemo } from 'react';
import type { LineaLocal } from '@/types/common.types';
import { calculateLineSubtotal, calculateLinesTotal, areAllLinesValid } from '@/utils/calculations';

export interface Product {
  id: string | number;
  nombre: string;
  precio_base: number | string;
  fraccionable?: boolean;
}

export interface UsePedidoLineItemsOptions {
  /** Líneas iniciales (opcional) */
  initialLines?: LineaLocal[];
  
  /** Lista de productos disponibles para autocompletar */
  products?: Product[];
  
  /** Callback cuando cambian las líneas */
  onChange?: (lines: LineaLocal[]) => void;
  
  /** Callback cuando se agrega una línea */
  onAdd?: (line: LineaLocal) => void;
  
  /** Callback cuando se elimina una línea */
  onRemove?: (index: number, line: LineaLocal) => void;
}

export interface UsePedidoLineItemsReturn {
  /** Array de líneas actual */
  lineas: LineaLocal[];
  
  /** Actualiza un campo de una línea específica */
  updateLineItem: <K extends keyof LineaLocal>(index: number, field: K, value: LineaLocal[K]) => void;
  
  /** Agrega una nueva línea vacía */
  addLineItem: () => void;
  
  /** Elimina una línea por índice */
  removeLineItem: (index: number) => void;
  
  /** Reemplaza todas las líneas */
  setAllLines: (lines: LineaLocal[]) => void;
  
  /** Limpia todas las líneas */
  clearLines: () => void;
  
  /** Subtotal total de todas las líneas */
  totalLineas: number;
  
  /** Valida que todas las líneas sean válidas */
  isValid: boolean;
  
  /** Número de líneas */
  count: number;
  
  /** Calcula el subtotal de una línea específica */
  getLineSubtotal: (index: number) => number;
}

/**
 * Hook personalizado para gestionar líneas de pedido/cotización
 * 
 * Características:
 * - Validación automática de cantidades (no negativas, respeta fraccionable)
 * - Autocompletado de datos desde productos
 * - Cálculo automático de subtotales
 * - Callbacks para tracking de cambios
 * 
 * @example
 * ```tsx
 * const { lineas, updateLineItem, addLineItem, removeLineItem, totalLineas, isValid } = usePedidoLineItems({
 *   initialLines: existingPedido?.lineas || [],
 *   products: productsList,
 *   onChange: (lines) => console.log('Líneas actualizadas:', lines)
 * });
 * 
 * return (
 *   <div>
 *     {lineas.map((linea, index) => (
 *       <div key={index}>
 *         <input 
 *           value={linea.cantidad} 
 *           onChange={(e) => updateLineItem(index, 'cantidad', Number(e.target.value))}
 *         />
 *         <button onClick={() => removeLineItem(index)}>Eliminar</button>
 *       </div>
 *     ))}
 *     <button onClick={addLineItem}>Agregar línea</button>
 *     <p>Total: {totalLineas}</p>
 *   </div>
 * );
 * ```
 */
export function usePedidoLineItems(options: UsePedidoLineItemsOptions = {}): UsePedidoLineItemsReturn {
  const { 
    initialLines = [], 
    products = [],
    onChange, 
    onAdd, 
    onRemove 
  } = options;

  const [lineas, setLineas] = useState<LineaLocal[]>(initialLines);

  /**
   * Actualiza un campo de una línea específica
   * Con validaciones automáticas y autocompletado
   */
  const updateLineItem = useCallback(<K extends keyof LineaLocal>(
    index: number,
    field: K,
    value: LineaLocal[K]
  ) => {
    setLineas(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        
        const updatedItem = { ...item, [field]: value };
        
        // Autocompletar datos desde producto si se selecciona un producto_id
        if (field === 'producto_id' && value) {
          const product = products.find(p => String(p.id) === String(value));
          if (product) {
            updatedItem.nombre_producto_historico = product.nombre;
            updatedItem.precio_unitario = Number(product.precio_base) || 0;
            updatedItem.fraccionable = product.fraccionable || false;
          }
        }
        
        // Validación: Si no es fraccionable, redondear cantidad a entero
        if (field === 'cantidad') {
          const cantidad = value as number;
          if (!updatedItem.fraccionable && cantidad !== Math.floor(cantidad)) {
            updatedItem.cantidad = Math.floor(cantidad);
          }
          // No permitir cantidades negativas
          if (cantidad < 0) {
            updatedItem.cantidad = 0;
          }
        }
        
        // Validación: No permitir precios negativos
        if (field === 'precio_unitario') {
          const precio = value as number;
          if (precio < 0) {
            updatedItem.precio_unitario = 0;
          }
        }
        
        // Validación: No permitir descuentos negativos
        if (field === 'descuento_linea_monto') {
          const descuento = value as number;
          if (descuento < 0) {
            updatedItem.descuento_linea_monto = 0;
          }
        }
        
        return updatedItem;
      });
      
      onChange?.(updated);
      return updated;
    });
  }, [products, onChange]);

  /**
   * Agrega una nueva línea vacía
   */
  const addLineItem = useCallback(() => {
    const newLine: LineaLocal = {
      producto_id: null,
      nombre_producto_historico: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento_linea_monto: 0,
      fraccionable: false,
    };
    
    setLineas(prev => {
      const updated = [...prev, newLine];
      onChange?.(updated);
      onAdd?.(newLine);
      return updated;
    });
  }, [onChange, onAdd]);

  /**
   * Elimina una línea por índice
   */
  const removeLineItem = useCallback((index: number) => {
    setLineas(prev => {
      const lineToRemove = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      onChange?.(updated);
      onRemove?.(index, lineToRemove);
      return updated;
    });
  }, [onChange, onRemove]);

  /**
   * Reemplaza todas las líneas
   */
  const setAllLines = useCallback((newLines: LineaLocal[]) => {
    setLineas(newLines);
    onChange?.(newLines);
  }, [onChange]);

  /**
   * Limpia todas las líneas
   */
  const clearLines = useCallback(() => {
    setLineas([]);
    onChange?.([]);
  }, [onChange]);

  /**
   * Calcula el subtotal de una línea específica
   */
  const getLineSubtotal = useCallback((index: number): number => {
    if (index < 0 || index >= lineas.length) return 0;
    return calculateLineSubtotal(lineas[index]);
  }, [lineas]);

  /**
   * Subtotal total de todas las líneas (memoizado)
   */
  const totalLineas = useMemo(() => {
    return calculateLinesTotal(lineas);
  }, [lineas]);

  /**
   * Valida que todas las líneas sean válidas (memoizado)
   */
  const isValid = useMemo(() => {
    return areAllLinesValid(lineas);
  }, [lineas]);

  /**
   * Número de líneas
   */
  const count = lineas.length;

  return {
    lineas,
    updateLineItem,
    addLineItem,
    removeLineItem,
    setAllLines,
    clearLines,
    totalLineas,
    isValid,
    count,
    getLineSubtotal,
  };
}
