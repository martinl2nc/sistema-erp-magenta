'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface ExportButtonProps {
  getUrl: () => string;
  filename: string;
  label?: string;
}

export function ExportButton({ getUrl, filename, label = 'Exportar Excel' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const url = getUrl();
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title={label}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shrink-0"
    >
      {loading ? (
        <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base" />
      ) : (
        <iconify-icon icon="solar:file-download-linear" class="text-base" />
      )}
      <span className="hidden sm:inline">{loading ? 'Generando...' : label}</span>
    </button>
  );
}
