import ListadoCobros from '@/features/cobros/ListadoCobros';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transacciones | CotizadorPro',
  description: 'Listado general de cobros para conciliación bancaria',
};

export default function TransaccionesPage() {
  return <ListadoCobros />;
}
