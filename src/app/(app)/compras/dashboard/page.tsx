import { getKpisComprasServer } from '@/services/compras-server.service';
import ComprasDashboard from '@/features/compras/ComprasDashboard';

export default async function ComprasDashboardPage() {
  const initialKpis = await getKpisComprasServer();
  return <ComprasDashboard initialKpis={initialKpis} />;
}
