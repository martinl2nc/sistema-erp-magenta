'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Client } from '@/services/clients.service';
import type { Product } from '@/services/products.service';
import type { Quote, QuoteFormData, QuoteLineItem } from '@/services/quotes.service';
import { calculateQuoteTotals, createEmptyLineItem, getInitialQuoteData } from './quoteForm.utils';

interface UseQuoteFormStateParams {
  isEditing: boolean;
  loading: boolean;
  existingQuote?: Quote;
  activeClients: Client[];
  allClients: Client[];
  products: Product[];
}

export const useQuoteFormState = ({
  isEditing,
  loading,
  existingQuote,
  activeClients,
  allClients,
  products,
}: UseQuoteFormStateParams) => {
  const [quoteData, setQuoteData] = useState<QuoteFormData>(() => getInitialQuoteData());
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || loading) return;

    if (isEditing && existingQuote) {
      const { cotizaciones_lineas, ...headData } = existingQuote;
      setQuoteData({
        ...headData,
        vendedor_id: headData.vendedor_id || '',
        observaciones_pdf: headData.observaciones_pdf || '',
        lineas: [],
      });
      const parsedLines = (cotizaciones_lineas || []).map((line) => ({
        ...line,
        producto_id: line.producto_id || null,
      }));
      setLineItems(parsedLines);
    } else if (!isEditing) {
      setLineItems([createEmptyLineItem()]);
    }

    setInitialized(true);
  }, [initialized, loading, isEditing, existingQuote]);

  const selectableClients = useMemo(() => {
    if (!quoteData.cliente_id) return activeClients;
    const currentClient = allClients.find((client) => client.id === quoteData.cliente_id);
    if (currentClient && !currentClient.activo) return [currentClient, ...activeClients];
    return activeClients;
  }, [activeClients, allClients, quoteData.cliente_id]);

  const totals = useMemo(
    () => calculateQuoteTotals(lineItems, Number(quoteData.descuento_global_monto), quoteData.aplica_igv),
    [lineItems, quoteData.descuento_global_monto, quoteData.aplica_igv],
  );

  const handleQuoteChange = (field: keyof QuoteFormData, value: string | number | boolean) => {
    setQuoteData((prev) => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string | number | null) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      switch (field) {
        case 'producto_id':
          item.producto_id = value ? String(value) : null;
          break;
        case 'nombre_producto_historico':
          item.nombre_producto_historico = String(value ?? '');
          break;
        case 'cantidad':
          item.cantidad = Number(value) || 0;
          break;
        case 'precio_unitario':
          item.precio_unitario = Number(value) || 0;
          break;
        case 'descuento_linea_monto':
          item.descuento_linea_monto = Number(value) || 0;
          break;
        case 'subtotal_linea':
          item.subtotal_linea = Number(value) || 0;
          break;
        default:
          break;
      }

      if (field === 'producto_id' && value) {
        const selectedProduct = products.find((product) => product.id === value);
        if (selectedProduct) {
          item.nombre_producto_historico = selectedProduct.nombre;
          item.precio_unitario = Number(selectedProduct.precio_base) || 0;
        }
      }

      item.subtotal_linea = Number(item.cantidad) * Number(item.precio_unitario) - Number(item.descuento_linea_monto);
      updated[index] = item;
      return updated;
    });
  };

  return {
    quoteData,
    lineItems,
    totals,
    selectableClients,
    handleQuoteChange,
    addLineItem,
    removeLineItem,
    updateLineItem,
    setQuoteData,
  };
};
