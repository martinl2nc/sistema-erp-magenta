import { getComprasServer } from '@/services/compras-server.service';
import ComprasFacturacionDashboard from '@/features/compras/ComprasFacturacionDashboard';

export default async function ComprasFacturacionPage() {
  const initialCompras = await getComprasServer({ showPagados: true });
  return <ComprasFacturacionDashboard initialCompras={initialCompras} />;
}
