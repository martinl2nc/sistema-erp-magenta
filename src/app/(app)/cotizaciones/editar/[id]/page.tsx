import QuoteForm from '@/components/quotes/QuoteForm';

export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteForm id={id} />;
}
