import type { Client } from '@/services/clients.service';
import type { Seller } from '@/services/sellers.service';

interface PedidoFormMasterDataProps {
  clienteId: string;
  vendedorId: string;
  nroOc: string;
  fechaPedido: string;
  direccionFacturacion: string;
  observaciones: string;
  aplicaIgv: boolean;
  descuentoGlobal: number;
  selectableClients: Client[];
  sellers: Seller[];
  isVendorLocked: boolean;
  getClientDisplayName: (client: Client) => string;
  onOpenClientModal: () => void;
  onClienteChange: (value: string) => void;
  onVendedorChange: (value: string) => void;
  onNroOcChange: (value: string) => void;
  onFechaPedidoChange: (value: string) => void;
  onDireccionFacturacionChange: (value: string) => void;
  onObservacionesChange: (value: string) => void;
  onAplicaIgvChange: (value: boolean) => void;
  onDescuentoGlobalChange: (value: number) => void;
}

export default function PedidoFormMasterData({
  clienteId,
  vendedorId,
  nroOc,
  fechaPedido,
  direccionFacturacion,
  observaciones,
  aplicaIgv,
  descuentoGlobal,
  selectableClients,
  sellers,
  isVendorLocked,
  getClientDisplayName,
  onOpenClientModal,
  onClienteChange,
  onVendedorChange,
  onNroOcChange,
  onFechaPedidoChange,
  onDireccionFacturacionChange,
  onObservacionesChange,
  onAplicaIgvChange,
  onDescuentoGlobalChange,
}: PedidoFormMasterDataProps) {
  return (
    <div className="bg-[#181B21] border border-[#334155] rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#94A3B8]">Cliente Registrado <span className="text-red-400">*</span></label>
              <button type="button" onClick={onOpenClientModal} className="text-xs font-medium text-[#3B82F6] hover:text-[#60A5FA] px-2 py-0.5 rounded hover:bg-[#3B82F6]/10 transition-colors focus:outline-none flex items-center gap-1">
                <iconify-icon icon="solar:add-circle-linear" class="text-sm"></iconify-icon>
                Nuevo
              </button>
            </div>
            <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={clienteId} onChange={(e) => onClienteChange(e.target.value)}>
              <option value="">Seleccionar Cliente...</option>
              {selectableClients.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Vendedor Asignado</label>
            {isVendorLocked ? (
              <div className="w-full bg-[#0F1115]/60 border border-[#334155]/60 rounded-lg px-3 py-2.5 text-sm text-[#94A3B8] cursor-not-allowed flex items-center gap-2">
                <iconify-icon icon="solar:lock-linear" class="text-base shrink-0"></iconify-icon>
                <span className="text-[#E2E8F0]">
                  {sellers.find(s => s.id === vendedorId)?.nombre || '—'}
                </span>
              </div>
            ) : (
              <select className="w-full bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] px-3 py-2.5 focus:outline-none focus:border-[#3B82F6]" value={vendedorId} onChange={(e) => onVendedorChange(e.target.value)}>
                <option value="">(Sin Asignar)</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-[#E2E8F0]">Aplicar IGV (18%)</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={aplicaIgv} onChange={(e) => onAplicaIgvChange(e.target.checked)} />
              <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#0F1115] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Descuento Global (S/)</label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-[#94A3B8] sm:text-sm font-medium">S/</span>
              </div>
              <input type="number" min="0" step="0.01" value={descuentoGlobal} onChange={(e) => onDescuentoGlobalChange(Math.max(0, parseFloat(e.target.value) || 0))} className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nro. de OC <span className="font-normal">(opcional)</span></label>
              <input type="text" value={nroOc} onChange={(e) => onNroOcChange(e.target.value)} placeholder="Ej: OC-45091" className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Fecha Pedido <span className="font-normal">(opcional)</span></label>
              <input type="date" value={fechaPedido} onChange={(e) => onFechaPedidoChange(e.target.value)} className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Dirección de Facturación <span className="text-red-400">*</span></label>
            <input type="text" value={direccionFacturacion} onChange={(e) => onDireccionFacturacionChange(e.target.value)} placeholder="Dirección predeterminada del cliente..." className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Observaciones</label>
            <textarea rows={2} value={observaciones} onChange={(e) => onObservacionesChange(e.target.value)} placeholder="Condiciones, tiempos..." className="block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6] resize-none"></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}
