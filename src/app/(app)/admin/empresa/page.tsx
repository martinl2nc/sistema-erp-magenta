import { getCompanyConfigServer } from '@/services/companyConfig.server.service';
import AdminTabs from '@/components/admin/AdminTabs';
import CompanyConfigForm from '@/features/empresa/CompanyConfigForm';

export const dynamic = 'force-dynamic';

export default async function CompanyConfigPage() {
  // Server Component → Server Service → Supabase
  const initialConfig = await getCompanyConfigServer();

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Page Header & Tabs */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Administración del Sistema</h1>
          <AdminTabs />
        </div>

        <CompanyConfigForm initialConfig={initialConfig} />

        <div className="h-8"></div>
      </main>
    </div>
  );
}
