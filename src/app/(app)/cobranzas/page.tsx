import CobranzasDashboard from '@/features/cobros/CobranzasDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cobranzas | CotizadorPro',
  description: 'Control de cuentas por cobrar y registro de pagos',
};

export default function CobranzasPage() {
  return <CobranzasDashboard />;
}
