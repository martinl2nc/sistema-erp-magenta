export default function Loading() {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0F1115]">
      <header className="flex shrink-0 bg-[#0F1115] h-16 border-[#334155] border-b px-6 items-center z-10">
        <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <span className="bg-[#334155]/50 h-4 w-12 rounded animate-pulse" />
          <span className="text-[#334155]">/</span>
          <span className="bg-[#334155]/50 h-4 w-20 rounded animate-pulse" />
          <span className="text-[#334155]">/</span>
          <span className="bg-[#334155]/50 h-4 w-28 rounded animate-pulse" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-[#94A3B8] flex items-center gap-2">
          <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
          Cargando formulario de pedido...
        </div>
      </main>
    </div>
  );
}
