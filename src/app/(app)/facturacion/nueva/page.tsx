import { createClient } from '@/lib/supabase/server';
import { getActiveClientsSSR } from '@/services/clients.service';
import NuevaFacturaForm from '@/features/facturacion/NuevaFacturaForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nueva Factura | CotizadorPro',
  description: 'Emitir un nuevo comprobante electrónico',
};

export default async function NuevaFacturaPage() {
  const supabase = await createClient();
  const clients = await getActiveClientsSSR(supabase);

  return <NuevaFacturaForm initialClients={clients} />;
}
