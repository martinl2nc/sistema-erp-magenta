import { createClient } from '@/lib/supabase/server';
import { getInitialGuiasRemision } from '@/services/guiasRemision.service';
import GuiasRemisionClient from '@/features/facturacion/guias/GuiasRemisionClient';
import type { Metadata } from 'next';
import type { PaginatedGuias } from '@/services/guiasRemision.service';

export const metadata: Metadata = {
  title: 'Guías de Remisión | CotizadorPro',
  description: 'Listado y emisión de Guías de Remisión Electrónicas (GRE)',
};

export default async function GuiasRemisionPage() {
  const supabase = await createClient();
  let initialGuias: PaginatedGuias = { data: [], count: 0 };
  try {
    initialGuias = await getInitialGuiasRemision(supabase);
  } catch { /* non-fatal — client loads fresh */ }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#E2E8F0]">
          Guías de Remisión
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Guías de Remisión Electrónicas emitidas ante SUNAT (serie T002).
        </p>
      </div>
      <GuiasRemisionClient initialGuias={initialGuias} />
    </div>
  );
}
