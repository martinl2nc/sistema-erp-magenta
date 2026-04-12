import { createClient } from '@/lib/supabase/server';
import { getActiveClientsSSR } from '@/services/clients.service';
import { getPedidosElegiblesSSR } from '@/services/facturas.service';
import RegistrarExternaForm from '@/features/facturacion/RegistrarExternaForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrar Comprobante Externo | CotizadorPro',
  description: 'Registrar un comprobante emitido desde el portal SUNAT SOL',
};

export default async function RegistrarExternaPage() {
  const supabase = await createClient();
  const [clients, pedidosElegibles] = await Promise.all([
    getActiveClientsSSR(supabase),
    getPedidosElegiblesSSR(supabase),
  ]);

  return <RegistrarExternaForm initialClients={clients} pedidosElegibles={pedidosElegibles} />;
}
