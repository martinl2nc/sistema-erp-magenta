interface PedidoFormFooterProps {
  sumaLineas: string;
  descuentoGlobal: number;
  descuentoGlobalFmt: string;
  aplicaIgv: boolean;
  igvMontoFmt: string;
  totalFinalFmt: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  isEditing?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function PedidoFormFooter({
  sumaLineas,
  descuentoGlobal,
  descuentoGlobalFmt,
  aplicaIgv,
  igvMontoFmt,
  totalFinalFmt,
  isSubmitting,
  canSubmit,
  isEditing,
  onCancel,
  onSave,
}: PedidoFormFooterProps) {
  return (
    <footer className="shrink-0 bg-[#181B21] border-t border-[#334155] shadow-xl z-20">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto flex items-center justify-between gap-6 px-2">
          <div className="space-y-1">
            <span className="text-xs text-[#94A3B8] block">Subtotal (Base): {sumaLineas}</span>
            {aplicaIgv && <span className="text-xs text-[#94A3B8] block">IGV (18%): {igvMontoFmt}</span>}
            {descuentoGlobal > 0 && <span className="text-xs text-[#EF4444] block">Descuento Global: -{descuentoGlobalFmt}</span>}
          </div>
          <div className="text-right">
            <span className="block text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Total del Pedido</span>
            <span className="text-2xl font-semibold text-[#E2E8F0] tracking-tight">{totalFinalFmt}</span>
          </div>
        </div>

        <div className="w-full sm:w-auto flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none border border-[#334155] text-[#94A3B8] text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!canSubmit}
            className="flex-1 sm:flex-none bg-[#3B82F6] text-white text-sm font-medium px-8 py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <iconify-icon icon="solar:spinner-linear" class="animate-spin text-lg"></iconify-icon>
                Guardando...
              </>
            ) : (
              <>
                <iconify-icon icon={isEditing ? "solar:disk-linear" : "solar:box-linear"} class="text-lg"></iconify-icon>
                {isEditing ? 'Guardar Cambios' : 'Crear Pedido Directo'}
              </>
            )}
          </button>
        </div>

      </div>
    </footer>
  );
}
