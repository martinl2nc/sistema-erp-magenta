import { createClient } from '@/lib/supabase/server';
import QuoteForm from '@/components/quotes/QuoteForm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('cotizaciones')
    .select('numero_correlativo')
    .eq('id', id)
    .single();

  return {
    title: data
      ? `Editar COT-${data.numero_correlativo} | CotizadorPro`
      : 'Editar Cotización | CotizadorPro',
  };
}

export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [quoteRes, allClientsRes, activeClientsRes, productsRes, sellersRes, configRes] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select(`
        *,
        clientes ( id, razon_social, nombres_contacto, apellidos_contacto, numero_documento, email, telefono, direccion ),
        perfiles_usuario ( id, nombre, email ),
        cotizaciones_lineas (*, productos(fraccionable))
      `)
      .eq('id', id)
      .single(),
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

  if (quoteRes.error || !quoteRes.data) {
    notFound();
  }

  return (
    <QuoteForm
      id={id}
      initialQuote={quoteRes.data}
      initialAllClients={allClientsRes.data ?? []}
      initialActiveClients={activeClientsRes.data ?? []}
      initialProducts={productsRes.data ?? []}
      initialSellers={sellersRes.data ?? []}
      companyConfig={configRes.data ?? null}
    />
  );
}
