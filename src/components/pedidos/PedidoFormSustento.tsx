interface PedidoFormSustentoProps {
  isEditing: boolean;
  isDragging: boolean;
  file: File | null;
  existingSustentoUrl?: string | null;
  existingSustentoNombre?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onOpenFileDialog: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

export default function PedidoFormSustento({
  isEditing,
  isDragging,
  file,
  existingSustentoUrl,
  existingSustentoNombre,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenFileDialog,
  onFileChange,
  onClearFile,
}: PedidoFormSustentoProps) {
  return (
    <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 shadow-sm">
      <label className="block text-sm font-medium text-[#E2E8F0] mb-2">
        Sustento de Aprobación {!isEditing && <span className="text-red-400">*</span>}
        <span className="text-[#94A3B8] font-normal ml-1">(PDF, JPG o PNG — máx. 10 MB)</span>
      </label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-[#3B82F6] bg-[#3B82F6]/5'
            : file
            ? 'border-[#10B981] bg-[#10B981]/5'
            : isEditing && existingSustentoUrl
            ? 'border-[#3B82F6]/50 bg-[#3B82F6]/5'
            : 'border-[#334155] hover:border-[#3B82F6]/50 hover:bg-[#0F1115]'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onOpenFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={onFileChange}
        />
        {file ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <iconify-icon icon="solar:file-check-linear" class="text-[#10B981] text-4xl"></iconify-icon>
            <div>
              <p className="text-sm font-medium text-[#10B981]">{file.name}</p>
              <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClearFile(); }}
              className="px-3 py-1 text-xs font-medium text-[#EF4444] border border-[#EF4444]/30 rounded hover:bg-[#EF4444]/10 transition-colors"
            >
              Quitar archivo nuevo
            </button>
          </div>
        ) : isEditing && existingSustentoUrl ? (
          <div className="flex flex-col items-center gap-2">
            <iconify-icon icon="solar:document-text-linear" class="text-[#3B82F6] text-4xl"></iconify-icon>
            <p className="text-sm font-medium text-[#3B82F6]">{existingSustentoNombre || 'Sustento existente cargado'}</p>
            <p className="text-sm text-[#94A3B8]">Haz clic o arrastra para reemplazar este archivo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <iconify-icon icon="solar:upload-linear" class="text-[#94A3B8] text-4xl"></iconify-icon>
            <p className="text-sm font-medium text-[#E2E8F0]">Haz clic para subir un archivo</p>
            <p className="text-sm text-[#94A3B8]">O arrastra el archivo directamente aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
