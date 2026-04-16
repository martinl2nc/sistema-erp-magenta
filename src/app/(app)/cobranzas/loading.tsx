export default function CobranzasLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-[#334155]/30 rounded w-48 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-5 bg-[#334155]/20 rounded w-24 animate-pulse"></div>
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#181B21] border border-[#334155] rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-[#334155]/30 rounded w-24 mb-3"></div>
            <div className="h-6 bg-[#334155]/50 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 mb-4 flex gap-4 animate-pulse">
        <div className="h-9 bg-[#334155]/30 rounded w-48"></div>
        <div className="h-9 bg-[#334155]/30 rounded flex-1"></div>
      </div>

      {/* Table skeleton */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg overflow-hidden">
        <div className="bg-[#0F1115] px-5 py-3 flex gap-4">
          {[100, 180, 120, 120, 100, 100].map((w, i) => (
            <div key={i} className="h-3 bg-[#334155]/30 rounded" style={{ width: w }}></div>
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-5 py-4 border-t border-[#334155] flex gap-4 animate-pulse">
            {[100, 180, 120, 120, 100, 100].map((w, j) => (
              <div key={j} className="h-4 bg-[#334155]/20 rounded" style={{ width: w }}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
