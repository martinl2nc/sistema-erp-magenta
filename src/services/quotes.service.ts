import { createClient } from '@/lib/supabase/client';
import type { Client } from './clients.service';

type QuoteHeadPayload = Omit<QuoteFormData, 'id' | 'lineas'>;

const isRpcFunctionMissing = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  return error.code === 'PGRST202' || error.message?.includes('save_quote_atomic') || false;
};

const buildHeadPayload = (quoteData: QuoteFormData): QuoteHeadPayload => ({
  cliente_id: quoteData.cliente_id,
  vendedor_id: quoteData.vendedor_id || null,
  origen: quoteData.origen,
  woo_order_id: quoteData.woo_order_id ?? null,
  fecha_emision: quoteData.fecha_emision,
  fecha_validez: quoteData.fecha_validez,
  estado: quoteData.estado,
  observaciones_pdf: quoteData.observaciones_pdf || '',
  aplica_igv: quoteData.aplica_igv,
  subtotal: quoteData.subtotal,
  descuento_global_monto: quoteData.descuento_global_monto,
  igv_monto: quoteData.igv_monto,
  total_final: quoteData.total_final,
  seguimiento_automatico: quoteData.seguimiento_automatico,
});

const normalizeLineItems = (lineas: QuoteLineItem[]) =>
  lineas.map((line) => ({
    id: line.id || crypto.randomUUID(),
    producto_id: line.producto_id || null,
    nombre_producto_historico: line.nombre_producto_historico,
    cantidad: line.cantidad,
    precio_unitario: line.precio_unitario,
    descuento_linea_monto: line.descuento_linea_monto,
    subtotal_linea: line.subtotal_linea,
  }));

const saveQuoteLegacy = async (quoteData: QuoteFormData): Promise<string> => {
  const supabase = createClient();
  const { lineas } = quoteData;
  const headData = buildHeadPayload(quoteData);
  let finalQuoteId = quoteData.id;

  if (finalQuoteId) {
    const { error: headErr } = await supabase
      .from('cotizaciones')
      .update(headData)
      .eq('id', finalQuoteId);
    if (headErr) throw headErr;

    const { error: delErr } = await supabase
      .from('cotizaciones_lineas')
      .delete()
      .eq('cotizacion_id', finalQuoteId);
    if (delErr) throw delErr;
  } else {
    const { data: newHead, error: headErr } = await supabase
      .from('cotizaciones')
      .insert([headData])
      .select('id')
      .single();
    if (headErr) throw headErr;
    finalQuoteId = newHead.id;
  }

  if (lineas && lineas.length > 0 && finalQuoteId) {
    const lineasToInsert = normalizeLineItems(lineas).map((line) => ({
      ...line,
      cotizacion_id: finalQuoteId,
    }));

    const { error: linesErr } = await supabase
      .from('cotizaciones_lineas')
      .insert(lineasToInsert);
    if (linesErr) throw linesErr;
  }

  if (!finalQuoteId) throw new Error('Failed to save quote header.');
  return finalQuoteId;
};

export interface QuoteLineItem {
  id?: string;
  cotizacion_id?: string;
  producto_id?: string | null;
  nombre_producto_historico: string;
  cantidad: number;
  precio_unitario: number;
  descuento_linea_monto: number;
  subtotal_linea: number;
  productos?: { fraccionable: boolean } | null;
}

export type QuoteStatus = 'Aprobada' | 'Enviada' | 'Cancelada' | 'Borrador';

export interface Quote {
  id: string;
  numero_correlativo: number;
  origen: string;
  woo_order_id?: number | null;
  cliente_id: string;
  vendedor_id?: string | null;
  fecha_emision: string;
  fecha_validez: string;
  estado: QuoteStatus;
  observaciones_pdf?: string;
  aplica_igv: boolean;
  subtotal: number;
  descuento_global_monto: number;
  igv_monto: number;
  total_final: number;
  fecha_creacion: string;
  ultima_actualizacion: string;
  seguimiento_automatico: boolean;

  // Relaciones
  clientes?: Client;
  perfiles_usuario?: { id: string; nombre: string; email?: string };
  cotizaciones_lineas?: QuoteLineItem[];
}

export interface QuoteFormData extends Omit<Quote, 'id' | 'numero_correlativo' | 'fecha_creacion' | 'ultima_actualizacion' | 'cotizaciones_lineas' | 'clientes' | 'perfiles_usuario'> {
  id?: string;
  lineas: QuoteLineItem[];
}

export const quotesService = {
  async getQuotes(): Promise<Quote[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento ),
        perfiles_usuario ( id, nombre )
      `)
      .order('fecha_emision', { ascending: false })
      .order('numero_correlativo', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getQuoteById(id: string): Promise<Quote> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, email, telefono, direccion ),
        perfiles_usuario ( id, nombre, email ),
        cotizaciones_lineas (*, productos(fraccionable))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async saveQuote(quoteData: QuoteFormData): Promise<Quote> {
    const supabase = createClient();
    const headData = buildHeadPayload(quoteData);
    const lineas = normalizeLineItems(quoteData.lineas || []);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('save_quote_atomic', {
      p_quote_id: quoteData.id ?? null,
      p_head_data: headData,
      p_lines: lineas,
    });

    let finalQuoteId: string;

    if (rpcError) {
      if (isRpcFunctionMissing(rpcError)) {
        finalQuoteId = await saveQuoteLegacy(quoteData);
      } else {
        throw rpcError;
      }
    } else {
      finalQuoteId = rpcResult;
    }

    if (!finalQuoteId) throw new Error('Failed to save quote header.');
    return this.getQuoteById(finalQuoteId);
  },

  async deleteQuote(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cotizaciones')
      .update({ estado: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateQuoteFollowup(id: string, value: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('cotizaciones')
      .update({ seguimiento_automatico: value })
      .eq('id', id);

    if (error) throw error;
  },
};
