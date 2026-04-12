// ─── Types ───────────────────────────────────────────────────

export interface SendQuoteWebhookParams {
  pdfBase64: string;
  pdfFilename: string;
  correoCliente: string;
  nombreCliente: string;
  numeroCorrelativo: string;
  vendedorNombre: string;
  totalFinal: number;
  fechaEmision: string;
}

// ─── Service Function (Capa 1) ───────────────────────────────

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL as string | undefined;

/**
 * Sends a quote PDF and metadata to the n8n webhook for email delivery.
 * Throws if the webhook URL is not configured or the request fails.
 */
export const sendQuoteToWebhook = async (params: SendQuoteWebhookParams): Promise<void> => {
  if (!WEBHOOK_URL) throw new Error('NEXT_PUBLIC_N8N_WEBHOOK_URL no está configurada');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Webhook respondió con status ${response.status}`);
  }
};

/**
 * Returns true if the webhook URL is configured in the environment.
 */
export const isWebhookConfigured = (): boolean => !!WEBHOOK_URL;


/**
 * Builds the webhook payload from quote context data.
 * Returns null if the client has no email (webhook cannot send).
 */
export const buildWebhookPayload = (params: {
  pdfBase64: string;
  pdfFilename: string;
  client: { email?: string | null; razon_social?: string | null; nombres_contacto?: string | null; apellidos_contacto?: string | null } | null;
  sellerName: string;
  quoteIdStr: string;
  totalFinal: number;
  fechaEmision: string;
}): SendQuoteWebhookParams | null => {
  const { client, pdfBase64, pdfFilename, sellerName, quoteIdStr, totalFinal, fechaEmision } = params;
  if (!client?.email) return null;

  const nombreCliente = client.razon_social?.trim()
    || `${client.nombres_contacto || ''} ${client.apellidos_contacto || ''}`.trim()
    || 'Cliente';

  return {
    pdfBase64,
    pdfFilename,
    correoCliente: client.email,
    nombreCliente,
    numeroCorrelativo: quoteIdStr,
    vendedorNombre: sellerName,
    totalFinal,
    fechaEmision,
  };
};
