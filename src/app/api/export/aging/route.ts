import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWorkbook, applyHeaderRow, getClientName, CURRENCY_FMT } from '@/lib/excel/workbook';
import type { AgingReportRow } from '@/services/cobros.service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_aging_report');
    if (error) throw new Error(error.message);

    const wb = createWorkbook();
    const ws = wb.addWorksheet('Antigüedad de Saldos');

    const cols = [
      { header: 'Cliente', width: 36 },
      { header: 'Deuda Total', width: 14, numFmt: CURRENCY_FMT },
      { header: 'Por Vencer', width: 14, numFmt: CURRENCY_FMT },
      { header: 'Vencido 1-30d', width: 14, numFmt: CURRENCY_FMT },
      { header: 'Vencido 31-60d', width: 15, numFmt: CURRENCY_FMT },
      { header: 'Vencido 61-90d', width: 15, numFmt: CURRENCY_FMT },
      { header: 'Vencido +90d', width: 14, numFmt: CURRENCY_FMT },
      { header: 'Nro. Comprobantes', width: 18 },
    ];
    applyHeaderRow(ws.getRow(1), cols, ws);

    for (const r of (data ?? []) as AgingReportRow[]) {
      ws.addRow([
        getClientName({
          razon_social: r.razon_social,
          nombres_contacto: r.nombres_contacto,
          apellidos_contacto: r.apellidos_contacto,
        }),
        r.deuda_total,
        r.por_vencer,
        r.vencido_1_30,
        r.vencido_31_60,
        r.vencido_61_90,
        r.vencido_mas_90,
        r.count_comprobantes,
      ]);
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      [2, 3, 4, 5, 6, 7].forEach((col) => { row.getCell(col).numFmt = CURRENCY_FMT; });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="aging_${today}.xlsx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el export';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
