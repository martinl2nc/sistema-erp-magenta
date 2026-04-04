import { createClient } from '@/lib/supabase/server';
import QuoteForm from '@/components/quotes/QuoteForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nueva Cotización | CotizadorPro',
  description: 'Crear una nueva cotización profesional',
};

export default async function NuevaPage() {
  const supabase = await createClient();

  const [allClientsRes, activeClientsRes, productsRes, sellersRes, configRes] = await Promise.all([
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
    supabase
      .from('empresa_configuracion')
      .select('*')
      .limit(1)
      .single(),
  ]);

  return (
    <QuoteForm
      initialAllClients={allClientsRes.data ?? []}
      initialActiveClients={activeClientsRes.data ?? []}
      initialProducts={productsRes.data ?? []}
      initialSellers={sellersRes.data ?? []}
      companyConfig={configRes.data ?? null}
    />
  );
}
