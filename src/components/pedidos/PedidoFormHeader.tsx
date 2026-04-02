interface PedidoFormHeaderProps {
  onGoDashboard: () => void;
  onGoPedidos: () => void;
}

export default function PedidoFormHeader({ onGoDashboard, onGoPedidos }: PedidoFormHeaderProps) {
  return (
    <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center justify-between z-10 relative">
      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
        <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={onGoDashboard}>Inicio</span>
        <span className="text-[#334155]">/</span>
        <span className="hover:text-[#E2E8F0] cursor-pointer transition-colors" onClick={onGoPedidos}>Pedidos</span>
        <span className="text-[#334155]">/</span>
        <span className="text-[#E2E8F0] font-medium">Nuevo Pedido</span>
      </div>
    </header>
  );
}
