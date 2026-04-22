import { createClient } from '@/lib/supabase/server';
import type { KpisCompras, PaginatedCompras, ComprobanteCompra } from './compras.service';

export async function getKpisComprasServer(): Promise<KpisCompras> {
  const supabase = await createClient();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [cxpRes, mesRes] = await Promise.all([
    supabase
      .from('comprobantes_compra')
      .select('saldo_pendiente, estado_pago')
      .gt('saldo_pendiente', 0),
    supabase
      .from('comprobantes_compra')
      .select('mto_imp_venta, mto_igv')
      .gte('fecha_emision', firstDayOfMonth),
  ]);

  if (cxpRes.error) throw new Error('Error al cargar cuentas por pagar: ' + cxpRes.error.message);
  if (mesRes.error) throw new Error('Error al cargar KPIs del mes: ' + mesRes.error.message);

  const cxpData = cxpRes.data ?? [];
  const mesData = mesRes.data ?? [];

  return {
    totalCxP:            cxpData.reduce((s, r) => s + r.saldo_pendiente, 0),
    countPendientes:     cxpData.filter(r => r.estado_pago === 'pendiente').length,
    countParciales:      cxpData.filter(r => r.estado_pago === 'parcial').length,
    totalMes:            mesData.reduce((s, r) => s + r.mto_imp_venta, 0),
    igvCreditoFiscalMes: mesData.reduce((s, r) => s + r.mto_igv, 0),
  };
}

export async function getComprasServer(params: {
  pageSize?: number;
  showPagados?: boolean;
} = {}): Promise<PaginatedCompras> {
  const supabase = await createClient();
  const { pageSize = 10, showPagados = true } = params;

  let query = supabase
    .from('comprobantes_compra')
    .select(
      '*, proveedores ( razon_social, nombres_contacto, apellidos_contacto, numero_documento ), cat_categorias_gasto ( id, nombre )',
      { count: 'exact' }
    )
    .order('fecha_emision', { ascending: false })
    .range(0, pageSize - 1);

  if (!showPagados) query = query.gt('saldo_pendiente', 0);

  const { data, error, count } = await query;
  if (error) throw new Error('Error al cargar comprobantes de compra: ' + error.message);
  return { data: (data ?? []) as ComprobanteCompra[], count: count ?? 0 };
}
