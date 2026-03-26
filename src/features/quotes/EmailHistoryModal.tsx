'use client';
import { useEmailHistory } from '@/hooks/useEmailHistory';

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacionId: string | null;
  quoteIdStr: string;
}

export default function EmailHistoryModal({ isOpen, onClose, cotizacionId, quoteIdStr }: EmailHistoryModalProps) {
  const { data: history = [], isLoading } = useEmailHistory(isOpen ? cotizacionId : null);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#181B21] border-t sm:border sm:border-[#334155] rounded-t-2xl sm:rounded-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#334155] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-2.5">
            <iconify-icon icon="solar:history-2-linear" class="text-[#3B82F6] text-xl"></iconify-icon>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Historial de envíos</p>
              <p className="text-xs text-[#94A3B8]">{quoteIdStr}</p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-[#94A3B8] text-sm">
              <iconify-icon icon="solar:spinner-linear" class="animate-spin text-[#3B82F6] text-lg"></iconify-icon>
              Cargando historial...
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <iconify-icon icon="solar:letter-opened-linear" class="text-5xl text-[#334155]"></iconify-icon>
              <p className="text-sm text-[#94A3B8]">Esta cotización no ha sido enviada por correo aún.</p>
            </div>
          )}

          {!isLoading && history.length > 0 && (
            <>
              <p className="text-xs text-[#94A3B8] mb-4">
                {history.length} {history.length === 1 ? 'envío registrado' : 'envíos registrados'}
              </p>

              <div className="space-y-0">
                {history.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0" />
                      {idx < history.length - 1 && (
                        <div className="w-px flex-1 bg-[#334155] my-1" />
                      )}
                    </div>

                    {/* Entry content */}
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <iconify-icon icon="solar:letter-linear" class="text-[#94A3B8] text-sm shrink-0"></iconify-icon>
                        <p className="text-sm font-medium text-[#E2E8F0] truncate">{entry.enviado_a_email}</p>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5 pl-5">{formatDate(entry.fecha_envio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
