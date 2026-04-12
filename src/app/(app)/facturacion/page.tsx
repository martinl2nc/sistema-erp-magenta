import FacturacionDashboard from '@/features/facturacion/FacturacionDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Facturación | CotizadorPro',
  description: 'Gestión de facturación electrónica y emisión de comprobantes SUNAT',
};

export default function FacturacionPage() {
  return <FacturacionDashboard />;
}
