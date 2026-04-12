import { createClient } from '@/lib/supabase/server';
import PedidoForm from '@/components/pedidos/PedidoForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuevo Pedido | CotizadorPro',
  description: 'Crear un nuevo pedido directo',
};

export default async function NuevoPedidoPage() {
  const supabase = await createClient();

  const [allClientsRes, activeClientsRes, productsRes, sellersRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('*')
      .order('fecha_creacion', { ascending: false }),
    supabase
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false }),
    supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .order('fecha_creacion', { ascending: false }),
    supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('rol', 'vendedor')
      .order('nombre', { ascending: true }),
  ]);

  return (
    <PedidoForm
      initialAllClients={allClientsRes.data ?? []}
      initialActiveClients={activeClientsRes.data ?? []}
      initialProducts={productsRes.data ?? []}
      initialSellers={sellersRes.data ?? []}
    />
  );
}
