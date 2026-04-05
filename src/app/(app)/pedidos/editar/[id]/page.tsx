import { createClient } from '@/lib/supabase/server';
import PedidoForm from '@/components/pedidos/PedidoForm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('pedidos')
    .select('numero_pedido')
    .eq('id', id)
    .single();

  return {
    title: data
      ? `Editar PED-${data.numero_pedido} | CotizadorPro`
      : 'Editar Pedido | CotizadorPro',
  };
}

export default async function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [pedidoRes, lineasRes, allClientsRes, activeClientsRes, productsRes, sellersRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select(`
        *,
        cotizaciones ( numero_correlativo ),
        clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, tipo_documento, email, direccion, comprobante_preferido, ubigueo ),
        perfiles_usuario ( nombre )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('pedidos_lineas')
      .select('*')
      .eq('pedido_id', id),
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

  if (pedidoRes.error || !pedidoRes.data) {
    notFound();
  }

  return (
    <PedidoForm
      id={id}
      initialPedido={{ ...pedidoRes.data, lineas: lineasRes.data ?? [] }}
      initialAllClients={allClientsRes.data ?? []}
      initialActiveClients={activeClientsRes.data ?? []}
      initialProducts={productsRes.data ?? []}
      initialSellers={sellersRes.data ?? []}
    />
  );
}
