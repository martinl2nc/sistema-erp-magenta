export default function Loading() {
  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="h-8 w-48 bg-[#334155]/50 rounded animate-pulse" />
        <div className="h-4 w-32 bg-[#334155]/30 rounded animate-pulse" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex border-b border-[#334155] mb-6 gap-1">
        <div className="h-10 w-40 bg-[#334155]/20 rounded-t" />
        <div className="h-10 w-40 bg-[#334155]/10 rounded-t" />
      </div>

      {/* Content Skeleton */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg h-[400px] flex items-center justify-center">
        <div className="text-[#94A3B8] flex items-center gap-2">
          <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
          Cargando panel de facturación...
        </div>
      </div>
    </div>
  );
}
