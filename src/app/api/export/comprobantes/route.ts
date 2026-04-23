import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createWorkbook,
  applyHeaderRow,
  getClientName,
  TIPO_DOC,
  CURRENCY_FMT,
  DATE_FMT,
} from '@/lib/excel/workbook';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const tipo_doc = searchParams.get('tipo_doc') ?? '';

    // ── Fetch all comprobantes (no pagination) ──────────────────
    let query = supabase
      .from('comprobantes')
      .select('*, clientes ( razon_social, nombres_contacto, apellidos_contacto, numero_documento )')
      .order('fecha_emision', { ascending: false });

    if (tipo_doc) query = query.eq('tipo_doc_codigo', tipo_doc);

    if (search.trim()) {
      const term = search.trim();
      const { data: matchingClients } = await supabase
        .from('clientes')
        .select('id')
        .or(`razon_social.ilike.%${term}%,nombres_contacto.ilike.%${term}%,numero_documento.ilike.%${term}%`);
      const clientIds = (matchingClients ?? []).map((c: { id: string }) => c.id);
      const orParts: string[] = [`serie_numero.ilike.%${term}%`];
      if (clientIds.length > 0) orParts.push(`cliente_id.in.(${clientIds.join(',')})`);
      query = query.or(orParts.join(','));
    }

    const { data: comprobantes, error } = await query;
    if (error) throw new Error(error.message);

    // ── Batch fetch all detalles (single query, no N+1) ─────────
    const ids = (comprobantes ?? []).map((c: { id: string }) => c.id);
    const { data: detalles } = ids.length
      ? await supabase
          .from('comprobantes_detalles')
          .select('comprobante_id, descripcion, cantidad, mto_precio_unitario, igv, mto_valor_venta')
          .in('comprobante_id', ids)
      : { data: [] };

    // ── Build Excel ──────────────────────────────────────────────
    const wb = createWorkbook();

    // Sheet 1: Comprobantes
    const ws1 = wb.addWorksheet('Comprobantes');
    const cols1 = [
      { header: 'Serie-Nro.', width: 16 },
      { header: 'Tipo', width: 16 },
      { header: 'Cliente', width: 32 },
      { header: 'RUC / DNI', width: 14 },
      { header: 'Fecha Emisión', width: 14, numFmt: DATE_FMT },
      { header: 'Fecha Vencimiento', width: 17, numFmt: DATE_FMT },
      { header: 'Forma de Pago', width: 14 },
      { header: 'Estado SUNAT', width: 16 },
      { header: 'Valor Venta', width: 14, numFmt: CURRENCY_FMT },
      { header: 'IGV', width: 12, numFmt: CURRENCY_FMT },
      { header: 'Total', width: 14, numFmt: CURRENCY_FMT },
    ];
    applyHeaderRow(ws1.getRow(1), cols1, ws1);

    for (const c of comprobantes ?? []) {
      const cliente = c.clientes as { razon_social: string | null; nombres_contacto: string; apellidos_contacto: string; numero_documento: string | null } | null;
      ws1.addRow([
        c.serie_numero,
        TIPO_DOC[c.tipo_doc_codigo] ?? c.tipo_doc_codigo,
        cliente ? getClientName(cliente) : '',
        cliente?.numero_documento ?? '',
        c.fecha_emision ? new Date(c.fecha_emision) : '',
        c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : '',
        c.forma_pago,
        c.estado_sunat,
        c.valor_venta ?? 0,
        c.mto_igv ?? 0,
        c.mto_imp_venta ?? 0,
      ]);
    }

    // Apply number formats to data rows
    const currencyCols = [9, 10, 11];
    ws1.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      currencyCols.forEach((col) => {
        row.getCell(col).numFmt = CURRENCY_FMT;
      });
      row.getCell(5).numFmt = DATE_FMT;
      row.getCell(6).numFmt = DATE_FMT;
    });

    // Sheet 2: Detalles
    const ws2 = wb.addWorksheet('Detalles');
    const cols2 = [
      { header: 'Serie-Nro.', width: 16 },
      { header: 'Descripción', width: 40 },
      { header: 'Cantidad', width: 10 },
      { header: 'Precio Unitario', width: 15, numFmt: CURRENCY_FMT },
      { header: 'IGV', width: 12, numFmt: CURRENCY_FMT },
      { header: 'Subtotal Línea', width: 14, numFmt: CURRENCY_FMT },
    ];
    applyHeaderRow(ws2.getRow(1), cols2, ws2);

    // Build a lookup map: comprobante_id → serie_numero
    const serieMap = new Map((comprobantes ?? []).map((c: { id: string; serie_numero: string }) => [c.id, c.serie_numero]));

    for (const d of detalles ?? []) {
      ws2.addRow([
        serieMap.get(d.comprobante_id) ?? d.comprobante_id,
        d.descripcion,
        d.cantidad,
        d.mto_precio_unitario ?? 0,
        d.igv ?? 0,
        d.mto_valor_venta ?? 0,
      ]);
    }

    ws2.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      [4, 5, 6].forEach((col) => { row.getCell(col).numFmt = CURRENCY_FMT; });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="comprobantes_${today}.xlsx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el export';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
