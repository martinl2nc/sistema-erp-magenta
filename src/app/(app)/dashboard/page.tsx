import { createClient } from '@/lib/supabase/server';
import { getPorMesServer } from '@/services/dashboard.service';
import DashboardClient from './DashboardClient';
import type { MesData } from '@/services/dashboard.service';

export const metadata = {
  title: 'Dashboard | Sistema de Cotizaciones',
  description: 'Resumen general y métricas del sistema',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  let initialPorMes: MesData[] = [];
  try {
    initialPorMes = await getPorMesServer(supabase);
  } catch { /* non-fatal — client loads fresh */ }

  return <DashboardClient initialPorMes={initialPorMes} />;
}
