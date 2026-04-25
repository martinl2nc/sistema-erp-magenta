'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/context/AuthContext';
import type { MesData } from '@/services/dashboard.service';
import { formatCurrency } from '@/utils/formatters';
import { FunnelChart } from '@/components/dashboard/FunnelChart';
import { FinancialMetrics } from '@/components/dashboard/FinancialMetrics';
import { AlertsSection } from '@/components/dashboard/AlertsSection';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { ComparisonBadge } from '@/components/dashboard/ComparisonBadge';
import { Tooltip as CustomTooltip } from '@/components/dashboard/Tooltip';



const ESTADO_COLORS: Record<string, string> = {
  'Borrador':  '#94A3B8',
  'Aprobada':  '#22C55E',
  'Enviada':   '#A855F7',
  'Cancelada': '#EF4444',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#334155]/40 rounded-md ${className}`} />;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  accentColor: string;
  loading?: boolean;
  comparison?: number; // Percentage change
}

function KpiCard({ title, value, subtitle, icon, accentColor, loading, comparison }: KpiCardProps) {
  return (
    <div className="bg-[#181B21] border border-[#334155] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#94A3B8]">{title}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <iconify-icon icon={icon} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-[#E2E8F0]">{value}</p>
            {comparison !== undefined && <ComparisonBadge percentageChange={comparison} size="sm" />}
          </div>
          <p className="text-xs text-[#64748B]">{subtitle}</p>
        </>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#181B21] border border-[#334155] rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#94A3B8] mb-1">{label || payload[0]?.payload?.label}</p>
      <p className="text-[#3B82F6] font-semibold">{payload[0]?.value} cotizaciones</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold" style={{ color: d.payload.fill }}>{d.name}</p>
      <p className="text-[#E2E8F0]">{d.value} cotizaciones</p>
    </div>
  );
}

export default function DashboardClient({ initialPorMes }: { initialPorMes?: MesData[] }) {
  const router = useRouter();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { role, user } = useAuth();
  const vendedorId = role === 'vendedor' ? user?.id : null;

  // State para el rango de fechas
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    preset: 'thisMonth',
  });

  // Calcular el rango anterior para comparación
  const getPreviousRange = (current: DateRange) => {
    const duration = differenceInDays(current.end, current.start) + 1;
    const previousEnd = new Date(current.start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - duration + 1);
    
    return {
      start: format(previousStart, 'yyyy-MM-dd'),
      end: format(previousEnd, 'yyyy-MM-dd'),
    };
  };

  const currentRangeParams = {
    start: format(dateRange.start, 'yyyy-MM-dd'),
    end: format(dateRange.end, 'yyyy-MM-dd'),
  };

  const previousRangeParams = getPreviousRange(dateRange);

  // Dashboard queries
  const {
    kpisComparison,
    porMes,
    porEstado,
    topClientes,
    topProductos,
    funnel,
    financial,
    alerts
  } = useDashboardStats(currentRangeParams, previousRangeParams, initialPorMes);

  const isAdmin = role === 'admin';
  const kpiData = kpisComparison.data?.current;
  const kpiChanges = kpisComparison.data?.changes;
  const porMesData = porMes.data ?? [];
  const porEstadoData = useMemo(
    () => (porEstado.data ?? []).map(d => ({ ...d, fill: ESTADO_COLORS[d.estado] ?? '#94A3B8' })),
    [porEstado.data],
  );

  return (
    <div ref={dashboardRef} id="dashboard-export-root" className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#E2E8F0]">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {isAdmin ? 'Resumen general de todas las cotizaciones' : 'Resumen de tus cotizaciones'}
          </p>
        </div>
      </div>

      {/* Filtro de rango de fechas */}
      <div className="bg-[#181B21] border border-[#334155] rounded-xl p-5">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CustomTooltip content="Total de cotizaciones creadas en el periodo seleccionado">
          <div className="w-full">
            <KpiCard 
              title="Cotizaciones en periodo" 
              value={kpiData?.totalMes ?? 0} 
              subtitle="Creadas en el periodo seleccionado" 
              icon="solar:document-text-bold" 
              accentColor="#3B82F6" 
              loading={kpisComparison.isLoading}
              comparison={kpiChanges?.totalMes}
            />
          </div>
        </CustomTooltip>
        <CustomTooltip content="Monto total cotizado (suma de todas las cotizaciones del periodo)">
          <div className="w-full">
            <KpiCard 
              title="Monto cotizado" 
              value={kpiData ? formatCurrency(kpiData.montoMes) : formatCurrency(0)}
              subtitle="Total en cotizaciones del periodo" 
              icon="solar:money-bag-bold" 
              accentColor="#22C55E" 
              loading={kpisComparison.isLoading}
              comparison={kpiChanges?.montoMes}
            />
          </div>
        </CustomTooltip>
        <CustomTooltip content="Porcentaje de cotizaciones aprobadas o enviadas sobre el total histórico">
          <div className="w-full">
            <KpiCard 
              title="Tasa de conversión" 
              value={kpiData ? `${kpiData.tasaConversion}%` : '0%'} 
              subtitle="Aprobadas + enviadas / total" 
              icon="solar:chart-bold" 
              accentColor="#A855F7" 
              loading={kpisComparison.isLoading}
              comparison={kpiChanges?.tasaConversion}
            />
          </div>
        </CustomTooltip>
        <CustomTooltip content="Cotizaciones que vencen en los próximos 3 días y requieren atención">
          <div 
            className="w-full cursor-pointer"
            onClick={() => router.push('/cotizaciones?filter=expiring')}
          >
            <KpiCard 
              title="Por vencer (3 días)" 
              value={kpiData?.porVencer ?? 0} 
              subtitle="Cotizaciones próximas a vencer" 
              icon="solar:clock-circle-bold" 
              accentColor={kpiData && kpiData.porVencer > 0 ? '#F59E0B' : '#64748B'} 
              loading={kpisComparison.isLoading}
              comparison={kpiChanges?.porVencer}
            />
          </div>
        </CustomTooltip>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <SectionCard title="Cotizaciones por mes (últimos 6 meses)">
            {porMes.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porMesData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="count" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#334155', opacity: 0.3 }} />
                  <Bar yAxisId="count" dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Cotizaciones" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Distribución por estado">
          {porEstado.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : porEstadoData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[#64748B] text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porEstadoData} dataKey="count" nameKey="estado" cx="50%" cy="45%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                  {porEstadoData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Top 5 clientes por monto">
          {topClientes.isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !topClientes.data?.length ? (
            <p className="text-[#64748B] text-sm py-4 text-center">Sin datos disponibles</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#64748B] border-b border-[#334155]">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Cliente</th>
                  <th className="text-right pb-2 font-medium">Cotiz.</th>
                  <th className="text-right pb-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.data.map((c, i) => (
                  <tr key={i} className="border-b border-[#334155]/40 last:border-0">
                    <td className="py-2.5 pr-3 text-[#64748B] font-mono text-xs">{i + 1}</td>
                    <td className="py-2.5 text-[#E2E8F0] truncate max-w-[160px]" title={c.razon_social}>{c.razon_social}</td>
                    <td className="py-2.5 text-right text-[#94A3B8]">{c.count}</td>
                    <td className="py-2.5 text-right text-[#22C55E] font-medium">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Top 5 productos por revenue">
          {topProductos.isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !topProductos.data?.length ? (
            <p className="text-[#64748B] text-sm py-4 text-center">Sin datos disponibles</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#64748B] border-b border-[#334155]">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Producto</th>
                  <th className="text-right pb-2 font-medium">Uds.</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.data.map((p, i) => (
                  <tr key={i} className="border-b border-[#334155]/40 last:border-0">
                    <td className="py-2.5 pr-3 text-[#64748B] font-mono text-xs">{i + 1}</td>
                    <td className="py-2.5 text-[#E2E8F0] truncate max-w-[180px]" title={p.nombre}>{p.nombre}</td>
                    <td className="py-2.5 text-right text-[#94A3B8]">{p.cantidad}</td>
                    <td className="py-2.5 text-right text-[#22C55E] font-medium">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* Nueva sección: Funnel de Conversión */}
      <SectionCard title="Funnel de Conversión">
        <FunnelChart 
          data={funnel.data ?? { cotizaciones: 0, pedidos: 0, facturas: 0, conversionAPedido: 0, conversionAFactura: 0 }}
          isLoading={funnel.isLoading}
        />
      </SectionCard>

      {/* Nueva sección: Métricas Financieras */}
      <div>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Métricas Financieras</h3>
        <FinancialMetrics 
          data={financial.data ?? { valorPromedio: 0, totalDescuentos: 0, cotizacionesConDescuento: 0, porcentajeConDescuento: 0 }}
          isLoading={financial.isLoading}
        />
      </div>

      {/* Nueva sección: Alertas y Oportunidades */}
      <div>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Alertas y Oportunidades</h3>
        <AlertsSection 
          data={alerts.data ?? { cotizacionesExpiradas: 0, borradoresAntiguos: 0, nuevosClientes: 0 }}
          isLoading={alerts.isLoading}
        />
      </div>
    </div>
  );
}
