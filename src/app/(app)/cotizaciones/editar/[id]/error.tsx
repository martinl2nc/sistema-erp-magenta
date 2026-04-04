'use client';

import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center z-10">
        <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Inicio</span>
          <span className="text-[#334155]">/</span>
          <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={() => router.push('/cotizaciones')}>Cotizaciones</span>
          <span className="text-[#334155]">/</span>
          <span className="text-[#EF4444] font-medium">Error</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-[#181B21] border border-[#334155] rounded-xl p-8 max-w-md text-center space-y-4">
          <div className="w-12 h-12 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-2xl text-[#EF4444]"></iconify-icon>
          </div>
          <h2 className="text-lg font-medium text-[#E2E8F0]">Error al cargar la cotización</h2>
          <p className="text-sm text-[#94A3B8]">{error.message || 'Ocurrió un error inesperado.'}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-[#334155] bg-[#181B21] text-[#E2E8F0] hover:bg-[#334155]/40 text-sm font-medium transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => router.push('/cotizaciones')}
              className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Volver a Cotizaciones
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
