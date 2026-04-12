'use client';

import { PAGINATION } from '@/constants';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btnBase =
    'flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#3B82F6]';
  const btnActive = `${btnBase} bg-[#3B82F6] text-white`;
  const btnDefault = `${btnBase} text-[#94A3B8] hover:bg-[#334155]/50 hover:text-[#E2E8F0]`;
  const btnDisabled = `${btnBase} text-[#334155] cursor-not-allowed`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#334155]">
      {/* Registro info + page size selector */}
      <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
        <span>
          {totalItems === 0
            ? 'Sin resultados'
            : `${from}–${to} de ${totalItems} registro${totalItems !== 1 ? 's' : ''}`}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#0F1115] border border-[#334155] rounded-md py-1 pl-2 pr-6 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] appearance-none cursor-pointer"
            >
              {PAGINATION.PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={currentPage === 1 ? btnDisabled : btnDefault}
            aria-label="Página anterior"
          >
            <iconify-icon icon="solar:alt-arrow-left-linear" stroke-width="1.5" class="text-base"></iconify-icon>
          </button>

          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-[#334155]">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={page === currentPage ? btnActive : btnDefault}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={currentPage === totalPages ? btnDisabled : btnDefault}
            aria-label="Página siguiente"
          >
            <iconify-icon icon="solar:alt-arrow-right-linear" stroke-width="1.5" class="text-base"></iconify-icon>
          </button>
        </div>
      )}
    </div>
  );
}
