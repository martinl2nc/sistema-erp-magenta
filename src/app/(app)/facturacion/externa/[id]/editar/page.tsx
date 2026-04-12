import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getComprobanteExternoByIdSSR,
  getPedidosElegiblesSSR,
} from '@/services/facturas.service';
import { getActiveClientsSSR } from '@/services/clients.service';
import EditarExternaForm from '@/features/facturacion/EditarExternaForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Editar Comprobante Externo | CotizadorPro',
};

export default async function EditarExternaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [comprobante, clients, pedidosElegibles] = await Promise.all([
    getComprobanteExternoByIdSSR(supabase, id),
    getActiveClientsSSR(supabase),
    getPedidosElegiblesSSR(supabase),
  ]);

  if (!comprobante) {
    redirect('/facturacion');
  }

  return (
    <EditarExternaForm
      comprobante={comprobante}
      initialClients={clients}
      pedidosElegibles={pedidosElegibles}
    />
  );
}
