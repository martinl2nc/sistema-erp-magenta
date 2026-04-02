import PedidoForm from '@/components/pedidos/PedidoForm';

export default async function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PedidoForm id={id} />;
}
