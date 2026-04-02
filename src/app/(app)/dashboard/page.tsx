'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';

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
}

function KpiCard({ title, value, subtitle, icon, accentColor, loading }: KpiCardProps) {
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
          <p className="text-3xl font-bold text-[#E2E8F0]">{value}</p>
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

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#94A3B8] mb-1">{label}</p>
      <p className="text-[#3B82F6] font-semibold">{payload[0]?.value} cotizaciones</p>
      {payload[1] && <p className="text-[#22C55E] font-semibold">{formatCurrency(payload[1].value)}</p>}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold" style={{ color: d.payload.fill }}>{d.name}</p>
      <p className="text-[#E2E8F0]">{d.value} cotizaciones</p>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();
  const { kpis, porMes, porEstado, topClientes, topProductos } = useDashboardStats();

  const isAdmin = role === 'admin';
  const kpiData = kpis.data;
  const porMesData = porMes.data ?? [];
  const porEstadoData = (porEstado.data ?? []).map(d => ({
    ...d,
    fill: ESTADO_COLORS[d.estado] ?? '#94A3B8',
  }));

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#E2E8F0]">Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {isAdmin ? 'Resumen general de todas las cotizaciones' : 'Resumen de tus cotizaciones'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Cotizaciones este mes" value={kpiData?.totalMes ?? 0} subtitle="Creadas en el mes actual" icon="solar:document-text-bold" accentColor="#3B82F6" loading={kpis.isLoading} />
        <KpiCard title="Monto cotizado este mes" value={kpiData ? formatCurrency(kpiData.montoMes) : 'S/ 0'} subtitle="Total en cotizaciones del mes" icon="solar:money-bag-bold" accentColor="#22C55E" loading={kpis.isLoading} />
        <KpiCard title="Tasa de conversión" value={kpiData ? `${kpiData.tasaConversion}%` : '0%'} subtitle="Aprobadas + enviadas / total" icon="solar:chart-bold" accentColor="#A855F7" loading={kpis.isLoading} />
        <KpiCard title="Por vencer (3 días)" value={kpiData?.porVencer ?? 0} subtitle="Cotizaciones próximas a vencer" icon="solar:clock-circle-bold" accentColor={kpiData && kpiData.porVencer > 0 ? '#F59E0B' : '#64748B'} loading={kpis.isLoading} />
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

        <SectionCard title="Top 5 productos más cotizados">
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
                  <th className="text-right pb-2 font-medium">Uds. cotizadas</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.data.map((p, i) => (
                  <tr key={i} className="border-b border-[#334155]/40 last:border-0">
                    <td className="py-2.5 pr-3 text-[#64748B] font-mono text-xs">{i + 1}</td>
                    <td className="py-2.5 text-[#E2E8F0] truncate max-w-[220px]" title={p.nombre}>{p.nombre}</td>
                    <td className="py-2.5 text-right text-[#3B82F6] font-medium">{p.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
