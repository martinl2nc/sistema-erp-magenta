'use client';

export default function CobranzasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col items-center justify-center gap-4 py-20">
      <iconify-icon icon="solar:danger-triangle-linear" class="text-5xl text-[#EF4444]"></iconify-icon>
      <h2 className="text-lg font-semibold text-[#E2E8F0]">Error al cargar cobranzas</h2>
      <p className="text-sm text-[#94A3B8] text-center max-w-md">
        {error.message || 'Ocurrió un error inesperado. Intentá de nuevo.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-[#334155]/50 hover:bg-[#334155] text-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#334155]"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
