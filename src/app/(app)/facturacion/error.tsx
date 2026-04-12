'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)] p-8 text-center space-y-6">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-red-500"></iconify-icon>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[#E2E8F0]">Error en el módulo de facturación</h2>
        <p className="text-[#94A3B8] max-w-md mx-auto">
          No pudimos cargar la información de facturación. Esto puede deberse a un problema de conexión o permisos.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-6 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-medium transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-6 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/20 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
