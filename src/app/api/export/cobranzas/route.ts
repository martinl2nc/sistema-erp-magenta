import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWorkbook, applyHeaderRow, getClientName, TIPO_DOC, CURRENCY_FMT, DATE_FMT } from '@/lib/excel/workbook';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const formaPago = searchParams.get('formaPago') ?? '';
    const showPagados = searchParams.get('showPagados') === 'true';

    let query = supabase
      .from('vista_cuentas_por_cobrar')
      .select('*')
      .order('fecha_emision', { ascending: false });

    if (!showPagados) query = query.gt('saldo_pendiente', 0);
    if (formaPago) query = query.eq('forma_pago', formaPago);
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `serie_numero.ilike.${term},razon_social.ilike.${term},nombres_contacto.ilike.${term},apellidos_contacto.ilike.${term}`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const wb = createWorkbook();
    const ws = wb.addWorksheet('Cuentas por Cobrar');

    const cols = [
      { header: 'Serie-Nro.', width: 16 },
      { header: 'Tipo', width: 16 },
      { header: 'Cliente', width: 32 },
      { header: 'Fecha Emisión', width: 14, numFmt: DATE_FMT },
      { header: 'Fecha Vencimiento', width: 17, numFmt: DATE_FMT },
      { header: 'Forma de Pago', width: 14 },
      { header: 'Estado Pago', width: 14 },
      { header: 'Total Facturado', width: 15, numFmt: CURRENCY_FMT },
      { header: 'Total Cobrado', width: 14, numFmt: CURRENCY_FMT },
      { header: 'Saldo Pendiente', width: 15, numFmt: CURRENCY_FMT },
    ];
    applyHeaderRow(ws.getRow(1), cols, ws);

    for (const c of data ?? []) {
      ws.addRow([
        c.serie_numero,
        TIPO_DOC[c.tipo_doc_codigo] ?? c.tipo_doc_codigo,
        getClientName({
          razon_social: c.razon_social,
          nombres_contacto: c.nombres_contacto,
          apellidos_contacto: c.apellidos_contacto,
        }),
        c.fecha_emision ? new Date(c.fecha_emision) : '',
        c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : '',
        c.forma_pago,
        c.estado_pago,
        c.monto_cobrable ?? 0,
        c.total_cobrado ?? 0,
        c.saldo_pendiente ?? 0,
      ]);
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      [4, 5].forEach((col) => { row.getCell(col).numFmt = DATE_FMT; });
      [8, 9, 10].forEach((col) => { row.getCell(col).numFmt = CURRENCY_FMT; });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cobranzas_${today}.xlsx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el export';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
