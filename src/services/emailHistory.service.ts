import { createClient } from '@/lib/supabase/client';

export interface EmailHistoryEntry {
  id: string;
  cotizacion_id: string;
  enviado_a_email: string;
  fecha_envio: string;
}

export const emailHistoryService = {
  async logSend(cotizacionId: string, enviadoAEmail: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('cotizacion_envios')
      .insert({ cotizacion_id: cotizacionId, enviado_a_email: enviadoAEmail });
    if (error) throw error;
  },

  async getHistory(cotizacionId: string): Promise<EmailHistoryEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cotizacion_envios')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha_envio', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
