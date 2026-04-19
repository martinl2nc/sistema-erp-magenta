import AgingReport from '@/features/cobros/AgingReport';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Antigüedad de Deuda | CotizadorPro',
  description: 'Reporte de aging por cliente para gestión de cobranza',
};

export default function AgingPage() {
  return <AgingReport />;
}
