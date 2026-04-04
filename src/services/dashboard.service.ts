import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, subMonths, subDays, differenceInDays } from 'date-fns';

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
  revenue: number; // Nuevo campo
}

// Nuevas interfaces
export interface FunnelStats {
  cotizaciones: number;
  pedidos: number;
  facturas: number;
  conversionAPedido: number; // %
  conversionAFactura: number; // %
}

export interface FinancialMetrics {
  valorPromedio: number;
  totalDescuentos: number;
  cotizacionesConDescuento: number;
  porcentajeConDescuento: number;
}

export interface AlertData {
  cotizacionesExpiradas: number;
  borradoresAntiguos: number;
  nuevosClientes: number;
}

export interface DateRangeParams {
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface KpiComparison {
  current: KpiStats;
  previous: KpiStats;
  changes: {
    totalMes: number; // % change
    montoMes: number; // % change
    tasaConversion: number; // % change
    porVencer: number; // % change
  };
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
    const montoMes = dataMes?.reduce((sum: number, q: any) => sum + (q.total_final ?? 0), 0) ?? 0;

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

    data?.forEach((q: any) => {
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
    data?.forEach((q: any) => {
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

    const ids = quotes.map((q: any) => q.id);
    const { data: lines } = await supabase
      .from('cotizaciones_lineas')
      .select('nombre_producto_historico, cantidad, precio_unitario, subtotal_linea')
      .in('cotizacion_id', ids);

    const map: Record<string, { cantidad: number; revenue: number }> = {};
    lines?.forEach((l: any) => {
      const nombre = l.nombre_producto_historico ?? 'Sin nombre';
      if (!map[nombre]) {
        map[nombre] = { cantidad: 0, revenue: 0 };
      }
      map[nombre].cantidad += l.cantidad ?? 0;
      map[nombre].revenue += l.subtotal_linea ?? 0;
    });

    return Object.entries(map)
      .map(([nombre, data]) => ({ nombre, cantidad: data.cantidad, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  // Nuevos métodos para Sprint 1

  async getFunnelStats(vendedorId?: string | null): Promise<FunnelStats> {
    const supabase = createClient();

    // Etapa 1: Total de cotizaciones (excluyendo Canceladas y Borradores)
    let qCotizaciones = supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['Enviada', 'Aprobada']);
    if (vendedorId) qCotizaciones = qCotizaciones.eq('vendedor_id', vendedorId);
    const { count: totalCotizaciones } = await qCotizaciones;

    // Etapa 2: Cotizaciones que se convirtieron en pedidos
    let qPedidos = supabase
      .from('pedidos')
      .select('cotizacion_id, id');
    if (vendedorId) qPedidos = qPedidos.eq('vendedor_id', vendedorId);
    const { data: pedidosData } = await qPedidos;

    const cotizacionesConPedido = new Set(pedidosData?.map((p: any) => p.cotizacion_id) ?? []);
    const totalPedidos = cotizacionesConPedido.size;

    // Etapa 3: Pedidos que se convirtieron en facturas
    const pedidoIds = pedidosData?.map((p: any) => p.id) ?? [];
    let totalFacturas = 0;

    if (pedidoIds.length > 0) {
      const { count: facturasCount } = await supabase
        .from('comprobantes')
        .select('pedido_id', { count: 'exact', head: true })
        .in('pedido_id', pedidoIds)
        .not('estado_sunat', 'eq', 'anulada');
      totalFacturas = facturasCount ?? 0;
    }

    // Calcular porcentajes
    const conversionAPedido = totalCotizaciones ? (totalPedidos / totalCotizaciones) * 100 : 0;
    const conversionAFactura = totalCotizaciones ? (totalFacturas / totalCotizaciones) * 100 : 0;

    return {
      cotizaciones: totalCotizaciones ?? 0,
      pedidos: totalPedidos,
      facturas: totalFacturas,
      conversionAPedido: Math.round(conversionAPedido * 10) / 10,
      conversionAFactura: Math.round(conversionAFactura * 10) / 10,
    };
  },

  async getFinancialMetrics(vendedorId?: string | null): Promise<FinancialMetrics> {
    const supabase = createClient();

    let query = supabase
      .from('cotizaciones')
      .select('total_final, descuento_global_monto')
      .neq('estado', 'Cancelada');
    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data } = await query;

    if (!data || data.length === 0) {
      return {
        valorPromedio: 0,
        totalDescuentos: 0,
        cotizacionesConDescuento: 0,
        porcentajeConDescuento: 0,
      };
    }

    const totalFinal = data.reduce((sum: number, q: any) => sum + (q.total_final ?? 0), 0);
    const totalDescuentos = data.reduce((sum: number, q: any) => sum + (q.descuento_global_monto ?? 0), 0);
    const cotizacionesConDescuento = data.filter((q: any) => (q.descuento_global_monto ?? 0) > 0).length;

    return {
      valorPromedio: Math.round(totalFinal / data.length),
      totalDescuentos: Math.round(totalDescuentos),
      cotizacionesConDescuento,
      porcentajeConDescuento: Math.round((cotizacionesConDescuento / data.length) * 100),
    };
  },

  async getAlertData(vendedorId?: string | null): Promise<AlertData> {
    const supabase = createClient();
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = subDays(new Date(), 7).toISOString().split('T')[0];

    // Cotizaciones expiradas sin convertir (estado Enviada y fecha_validez pasada)
    let qExpiradas = supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'Enviada')
      .lt('fecha_validez', hoy);
    if (vendedorId) qExpiradas = qExpiradas.eq('vendedor_id', vendedorId);
    const { count: cotizacionesExpiradas } = await qExpiradas;

    // Borradores antiguos (>7 días sin actualizar)
    let qBorradores = supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'Borrador')
      .lt('ultima_actualizacion', hace7Dias);
    if (vendedorId) qBorradores = qBorradores.eq('vendedor_id', vendedorId);
    const { count: borradoresAntiguos } = await qBorradores;

    // Nuevos clientes este mes
    const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
    const { count: nuevosClientes } = await supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_creacion', inicioMes);

    return {
      cotizacionesExpiradas: cotizacionesExpiradas ?? 0,
      borradoresAntiguos: borradoresAntiguos ?? 0,
      nuevosClientes: nuevosClientes ?? 0,
    };
  },

  // Métodos para Sprint 2: Comparación temporal

  async getKpisByDateRange(dateRange: DateRangeParams, vendedorId?: string | null): Promise<KpiStats> {
    const supabase = createClient();
    const { start, end } = dateRange;
    const hoy = new Date().toISOString().split('T')[0];
    const en3Dias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Cotizaciones en el rango de fechas
    let qRange = supabase
      .from('cotizaciones')
      .select('total_final, estado')
      .gte('fecha_emision', start)
      .lte('fecha_emision', end);
    if (vendedorId) qRange = qRange.eq('vendedor_id', vendedorId);
    const { data: dataRange } = await qRange;

    const totalMes = dataRange?.length ?? 0;
    const montoMes = dataRange?.reduce((sum: number, q: any) => sum + (q.total_final ?? 0), 0) ?? 0;

    // Todas las cotizaciones para tasa de conversión (sin filtro de fecha)
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

    // Por vencer en 3 días (independiente del rango)
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

  async getKpisComparison(
    currentRange: DateRangeParams,
    previousRange: DateRangeParams,
    vendedorId?: string | null
  ): Promise<KpiComparison> {
    const [current, previous] = await Promise.all([
      this.getKpisByDateRange(currentRange, vendedorId),
      this.getKpisByDateRange(previousRange, vendedorId),
    ]);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      current,
      previous,
      changes: {
        totalMes: calculateChange(current.totalMes, previous.totalMes),
        montoMes: calculateChange(current.montoMes, previous.montoMes),
        tasaConversion: calculateChange(current.tasaConversion, previous.tasaConversion),
        porVencer: calculateChange(current.porVencer, previous.porVencer),
      },
    };
  },
};
