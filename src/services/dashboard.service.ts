import { createClient } from '@/lib/supabase/client';

export interface KpiStats {
  totalMes: number;
  montoMes: number;
  tasaConversion: number;
  porVencer: number;
}

export interface MesData {
  mes: string;
  count: number;
  monto: number;
}

export interface EstadoData {
  estado: string;
  count: number;
}

export interface TopCliente {
  razon_social: string;
  total: number;
  count: number;
}

export interface TopProducto {
  nombre: string;
  cantidad: number;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const dashboardService = {
  async getKpis(vendedorId?: string | null): Promise<KpiStats> {
    const supabase = createClient();
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
    const hoy = ahora.toISOString().split('T')[0];
    const en3Dias = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let qMes = supabase
      .from('cotizaciones')
      .select('total_final, estado')
      .gte('fecha_emision', inicioMes);
    if (vendedorId) qMes = qMes.eq('vendedor_id', vendedorId);
    const { data: dataMes } = await qMes;

    const totalMes = dataMes?.length ?? 0;
    const montoMes = dataMes?.reduce((sum, q) => sum + (q.total_final ?? 0), 0) ?? 0;

    let qTotal = supabase.from('cotizaciones').select('id', { count: 'exact', head: true });
    if (vendedorId) qTotal = qTotal.eq('vendedor_id', vendedorId);
    const { count: totalAll } = await qTotal;

    let qConv = supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['Aprobada', 'Enviada']);
    if (vendedorId) qConv = qConv.eq('vendedor_id', vendedorId);
    const { count: totalConv } = await qConv;

    const tasaConversion = totalAll ? Math.round(((totalConv ?? 0) / totalAll) * 100) : 0;

    let qVencer = supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_validez', hoy)
      .lte('fecha_validez', en3Dias)
      .not('estado', 'in', '("Cancelada","Enviada")');
    if (vendedorId) qVencer = qVencer.eq('vendedor_id', vendedorId);
    const { count: porVencer } = await qVencer;

    return { totalMes, montoMes, tasaConversion, porVencer: porVencer ?? 0 };
  },

  async getCotizacionesPorMes(meses = 6, vendedorId?: string | null): Promise<MesData[]> {
    const supabase = createClient();
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1);

    let query = supabase
      .from('cotizaciones')
      .select('fecha_emision, total_final')
      .gte('fecha_emision', inicio.toISOString().split('T')[0])
      .neq('estado', 'Cancelada');
    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data } = await query;

    const mesesMap: Record<string, { count: number; monto: number }> = {};
    for (let i = 0; i < meses; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1) + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[key] = { count: 0, monto: 0 };
    }

    data?.forEach(q => {
      const key = q.fecha_emision.substring(0, 7);
      if (mesesMap[key]) {
        mesesMap[key].count++;
        mesesMap[key].monto += q.total_final ?? 0;
      }
    });

    return Object.entries(mesesMap).map(([key, val]) => ({
      mes: MONTHS[parseInt(key.split('-')[1]) - 1],
      count: val.count,
      monto: val.monto,
    }));
  },

  async getDistribucionPorEstado(vendedorId?: string | null): Promise<EstadoData[]> {
    const supabase = createClient();
    let query = supabase.from('cotizaciones').select('estado');
    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data } = await query;

    const counts: Record<string, number> = {};
    data?.forEach(q => {
      counts[q.estado] = (counts[q.estado] ?? 0) + 1;
    });

    return Object.entries(counts).map(([estado, count]) => ({ estado, count }));
  },

  async getTopClientes(limit = 5, vendedorId?: string | null): Promise<TopCliente[]> {
    const supabase = createClient();
    let query = supabase
      .from('cotizaciones')
      .select('total_final, clientes(razon_social, nombres_contacto, apellidos_contacto)')
      .neq('estado', 'Cancelada');
    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data } = await query;

    const map: Record<string, { total: number; count: number }> = {};
    (data as any[])?.forEach(q => {
      const nombre = q.clientes?.razon_social?.trim()
        || `${q.clientes?.nombres_contacto || ''} ${q.clientes?.apellidos_contacto || ''}`.trim()
        || 'Sin nombre';
      if (!map[nombre]) map[nombre] = { total: 0, count: 0 };
      map[nombre].total += q.total_final ?? 0;
      map[nombre].count++;
    });

    return Object.entries(map)
      .map(([razon_social, v]) => ({ razon_social, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  async getTopProductos(limit = 5, vendedorId?: string | null): Promise<TopProducto[]> {
    const supabase = createClient();
    let qIds = supabase
      .from('cotizaciones')
      .select('id')
      .neq('estado', 'Cancelada');
    if (vendedorId) qIds = qIds.eq('vendedor_id', vendedorId);
    const { data: quotes } = await qIds;

    if (!quotes || quotes.length === 0) return [];

    const ids = quotes.map(q => q.id);
    const { data: lines } = await supabase
      .from('cotizaciones_lineas')
      .select('nombre_producto_historico, cantidad')
      .in('cotizacion_id', ids);

    const map: Record<string, number> = {};
    lines?.forEach(l => {
      const nombre = l.nombre_producto_historico ?? 'Sin nombre';
      map[nombre] = (map[nombre] ?? 0) + (l.cantidad ?? 0);
    });

    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, limit);
  },
};
