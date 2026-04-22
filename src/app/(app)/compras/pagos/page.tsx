import { getKpisComprasServer, getComprasServer } from '@/services/compras-server.service';
import ComprasPagosDashboard from '@/features/compras/ComprasPagosDashboard';

export default async function ComprasPagosPage() {
  const [initialKpis, initialCompras] = await Promise.all([
    getKpisComprasServer(),
    getComprasServer({ showPagados: false }),
  ]);
  return <ComprasPagosDashboard initialKpis={initialKpis} initialCompras={initialCompras} />;
}
