import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWorkbook, applyHeaderRow, getClientName, CURRENCY_FMT, DATE_FMT } from '@/lib/excel/workbook';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const fechaDesde = searchParams.get('fechaDesde') ?? '';
    const fechaHasta = searchParams.get('fechaHasta') ?? '';
    const cuentaBancariaId = searchParams.get('cuentaBancariaId') ?? '';
    const metodoPagoCodigo = searchParams.get('metodoPagoCodigo') ?? '';

    let query = supabase
      .from('cobros')
      .select(`
        *,
        comprobantes!cobros_comprobante_id_fkey (
          serie_numero,
          clientes ( razon_social, nombres_contacto, apellidos_contacto )
        ),
        cat_metodos_pago ( codigo, descripcion ),
        cuentas_bancarias_empresa ( banco, numero_cuenta ),
        perfiles_usuario:registrado_por ( nombre )
      `)
      .eq('anulado', false)
      .order('fecha_pago', { ascending: false })
      .order('created_at', { ascending: false });

    if (fechaDesde) query = query.gte('fecha_pago', fechaDesde);
    if (fechaHasta) query = query.lte('fecha_pago', fechaHasta);
    if (cuentaBancariaId) query = query.eq('cuenta_bancaria_id', cuentaBancariaId);
    if (metodoPagoCodigo) query = query.eq('metodo_pago_codigo', metodoPagoCodigo);
    if (search.trim()) {
      query = query.ilike('referencia_operacion', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const wb = createWorkbook();
    const ws = wb.addWorksheet('Transacciones');

    const cols = [
      { header: 'Fecha Pago', width: 13, numFmt: DATE_FMT },
      { header: 'Comprobante', width: 16 },
      { header: 'Cliente', width: 32 },
      { header: 'Método de Pago', width: 18 },
      { header: 'Nro. Operación', width: 18 },
      { header: 'Banco / Cuenta', width: 22 },
      { header: 'Monto', width: 13, numFmt: CURRENCY_FMT },
      { header: 'Moneda', width: 9 },
      { header: 'Registrado por', width: 20 },
    ];
    applyHeaderRow(ws.getRow(1), cols, ws);

    for (const c of data ?? []) {
      const comprobante = c.comprobantes as { serie_numero: string; clientes?: { razon_social: string | null; nombres_contacto: string; apellidos_contacto: string } | null } | null;
      const clienteName = comprobante?.clientes
        ? getClientName(comprobante.clientes)
        : '';
      const banco = c.cuentas_bancarias_empresa
        ? `${c.cuentas_bancarias_empresa.banco} - ${c.cuentas_bancarias_empresa.numero_cuenta}`
        : '';

      ws.addRow([
        c.fecha_pago ? new Date(c.fecha_pago) : '',
        comprobante?.serie_numero ?? '',
        clienteName,
        c.cat_metodos_pago?.descripcion ?? c.metodo_pago_codigo,
        c.referencia_operacion ?? '',
        banco,
        c.monto_cobrado ?? 0,
        c.moneda,
        c.perfiles_usuario?.nombre ?? '',
      ]);
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.getCell(1).numFmt = DATE_FMT;
      row.getCell(7).numFmt = CURRENCY_FMT;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="transacciones_${today}.xlsx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el export';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
