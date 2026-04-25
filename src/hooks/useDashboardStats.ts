'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService, type DateRangeParams, type MesData } from '@/services/dashboard.service';
import { useAuth } from '@/context/AuthContext';

const STALE_TIME = 5 * 60 * 1000;

export const dashboardKeys = {
  all: () => ['dashboard'] as const,
  kpis: (vendedorId?: string | null) => [...dashboardKeys.all(), 'kpis', vendedorId] as const,
  porMes: (vendedorId?: string | null) => [...dashboardKeys.all(), 'porMes', vendedorId] as const,
  porEstado: (vendedorId?: string | null) => [...dashboardKeys.all(), 'porEstado', vendedorId] as const,
  topClientes: (vendedorId?: string | null) => [...dashboardKeys.all(), 'topClientes', vendedorId] as const,
  topProductos: (vendedorId?: string | null) => [...dashboardKeys.all(), 'topProductos', vendedorId] as const,
  funnel: (vendedorId?: string | null) => [...dashboardKeys.all(), 'funnel', vendedorId] as const,
  financial: (vendedorId?: string | null) => [...dashboardKeys.all(), 'financial', vendedorId] as const,
  alerts: (vendedorId?: string | null) => [...dashboardKeys.all(), 'alerts', vendedorId] as const,
  kpisComparison: (current: DateRangeParams, previous: DateRangeParams, vendedorId?: string | null) =>
    [...dashboardKeys.all(), 'kpisComparison', current, previous, vendedorId] as const,
};

export function useDashboardStats(
  currentRangeParams: DateRangeParams,
  previousRangeParams: DateRangeParams,
  initialPorMes?: MesData[],
) {
  const { user, role } = useAuth();
  const vendedorId = role === 'vendedor' ? user?.id : null;

  const kpisComparison = useQuery({
    queryKey: dashboardKeys.kpisComparison(currentRangeParams, previousRangeParams, vendedorId),
    queryFn: () => dashboardService.getKpisComparison(currentRangeParams, previousRangeParams, vendedorId),
    staleTime: 5 * 60 * 1000,
  });

  const porMes = useQuery({
    queryKey: dashboardKeys.porMes(vendedorId),
    queryFn: () => dashboardService.getCotizacionesPorMes(6, vendedorId),
    staleTime: STALE_TIME,
    initialData: vendedorId === null && initialPorMes?.length ? initialPorMes : undefined,
    initialDataUpdatedAt: vendedorId === null && initialPorMes?.length ? Date.now() : undefined,
  });

  const porEstado = useQuery({
    queryKey: dashboardKeys.porEstado(vendedorId),
    queryFn: () => dashboardService.getDistribucionPorEstado(vendedorId),
    staleTime: STALE_TIME,
  });

  const topClientes = useQuery({
    queryKey: dashboardKeys.topClientes(vendedorId),
    queryFn: () => dashboardService.getTopClientes(5, vendedorId),
    staleTime: STALE_TIME,
  });

  const topProductos = useQuery({
    queryKey: dashboardKeys.topProductos(vendedorId),
    queryFn: () => dashboardService.getTopProductos(5, vendedorId),
    staleTime: STALE_TIME,
  });

  const funnel = useQuery({
    queryKey: dashboardKeys.funnel(vendedorId),
    queryFn: () => dashboardService.getFunnelStats(vendedorId),
    staleTime: STALE_TIME,
  });

  const financial = useQuery({
    queryKey: dashboardKeys.financial(vendedorId),
    queryFn: () => dashboardService.getFinancialMetrics(vendedorId),
    staleTime: STALE_TIME,
  });

  const alerts = useQuery({
    queryKey: dashboardKeys.alerts(vendedorId),
    queryFn: () => dashboardService.getAlertData(vendedorId),
    staleTime: STALE_TIME,
  });

  return { kpisComparison, porMes, porEstado, topClientes, topProductos, funnel, financial, alerts };
}
