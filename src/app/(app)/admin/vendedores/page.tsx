'use client';

import { useState } from 'react';
import { useSellersList } from '@/hooks/useSellers';
import { useDebounce } from '@/hooks/useDebounce';
import AdminTabs from '@/components/admin/AdminTabs';
import SellersTab from '@/features/sellers/SellersTab';
import Pagination from '@/components/ui/Pagination';
import { PAGINATION, TIMEOUTS } from '@/constants';

export default function SellersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebounce(searchTerm, TIMEOUTS.SEARCH_DEBOUNCE);

  const { data: result, isLoading, isFetching, isError, error } = useSellersList({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const sellers = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleSearchChange = (val: string) => { setSearchTerm(val); setPage(1); };
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1); };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">
          Administración del Sistema
        </h1>
        <AdminTabs />
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-xl shadow-sm flex flex-col md:flex-1 md:overflow-hidden">
        <SellersTab
          sellers={sellers}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          error={error instanceof Error ? error : null}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />
      </div>

      {!isLoading && !isError && totalPages > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
