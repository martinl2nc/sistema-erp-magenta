'use client';

import AdminTabs from '@/components/admin/AdminTabs';
import SellersTab from '@/features/sellers/SellersTab';

export default function SellersPage() {
  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:h-full space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-medium tracking-tight text-[#E2E8F0]">
          Administración del Sistema
        </h1>
        <AdminTabs />
      </div>

      <div className="bg-[#181B21] border border-[#334155] rounded-xl shadow-sm flex flex-col md:flex-1 md:overflow-hidden">
        <SellersTab />
      </div>
    </div>
  );
}
