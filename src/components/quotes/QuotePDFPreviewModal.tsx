'use client';
interface QuotePDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blobUrl: string | null;
  quoteIdStr: string;
  isSending: boolean;
  onDownload: () => void;
  onSend: () => void;
}

export default function QuotePDFPreviewModal({
  isOpen,
  onClose,
  blobUrl,
  quoteIdStr,
  isSending,
  onDownload,
  onSend,
}: QuotePDFPreviewModalProps) {
  if (!isOpen || !blobUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full h-full md:h-[90vh] md:max-w-4xl bg-[#181B21] border-0 md:border md:border-[#334155] md:rounded-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:file-text-linear" class="text-[#3B82F6] text-lg"></iconify-icon>
            <span className="text-sm font-semibold text-[#E2E8F0]">Vista Previa — {quoteIdStr}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/50 transition-colors text-sm"
          >
            <iconify-icon icon="solar:close-linear" class="text-base"></iconify-icon>
            Cerrar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop: inline iframe */}
          <iframe
            src={blobUrl}
            className="hidden md:block w-full h-full border-none"
            title={`Vista previa ${quoteIdStr}`}
          />

          {/* Mobile: open in new tab */}
          <div className="md:hidden h-full flex flex-col items-center justify-center gap-5 p-8">
            <iconify-icon icon="solar:file-text-bold" class="text-6xl text-[#3B82F6]"></iconify-icon>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-[#E2E8F0]">{quoteIdStr}</p>
              <p className="text-xs text-[#94A3B8]">Abre el PDF en una nueva pestaña para previsualizarlo.</p>
            </div>
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              <iconify-icon icon="solar:eye-linear" class="text-base"></iconify-icon>
              Ver PDF
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#334155] px-4 py-3 flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#334155] bg-[#0F1115] text-[#E2E8F0] hover:bg-[#334155]/40 text-sm font-medium transition-colors"
          >
            <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
            Descargar PDF
          </button>
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <iconify-icon icon="solar:letter-linear" class="text-base"></iconify-icon>
            {isSending ? 'Enviando...' : 'Enviar al Cliente'}
          </button>
        </div>

      </div>
    </div>
  );
}
