import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── POST /api/facturacion/externa ───────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // ── Auth ──────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    // ── Validar campos requeridos ─────────────────────────────
    const clienteId      = formData.get('cliente_id') as string | null;
    const tipoDocCodigo  = formData.get('tipo_doc_codigo') as string | null;
    const serie          = formData.get('serie') as string | null;
    const correlativoRaw = formData.get('correlativo') as string | null;
    const fechaEmision   = formData.get('fecha_emision') as string | null;
    const subtotalRaw    = formData.get('subtotal') as string | null;
    const igvMontoRaw    = formData.get('igv_monto') as string | null;
    const totalRaw       = formData.get('total') as string | null;
    const pedidoId       = formData.get('pedido_id') as string | null;
    const pdfFile        = formData.get('pdf') as File | null;
    const xmlFile        = formData.get('xml') as File | null;

    if (!clienteId || !tipoDocCodigo || !serie || !correlativoRaw || !fechaEmision ||
        !subtotalRaw || !igvMontoRaw || !totalRaw || !pdfFile || !xmlFile) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const correlativo = parseInt(correlativoRaw, 10);
    const subtotal    = parseFloat(subtotalRaw);
    const igvMonto    = parseFloat(igvMontoRaw);
    const total       = parseFloat(totalRaw);

    if (isNaN(correlativo) || isNaN(subtotal) || isNaN(igvMonto) || isNaN(total)) {
      return NextResponse.json({ success: false, error: 'Valores numéricos inválidos' }, { status: 400 });
    }

    // ── Upload PDF y XML ──────────────────────────────────────
    const supabaseAdmin = createAdminClient();
    const fileId = `${serie}-${String(correlativo).padStart(8, '0')}`;
    const pdfPath = `${fileId}/comprobante.pdf`;
    const xmlPath = `${fileId}/comprobante.xml`;

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('comprobantes_externos')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });

    if (pdfUploadError) {
      return NextResponse.json({ success: false, error: `Error subiendo PDF: ${pdfUploadError.message}` }, { status: 500 });
    }

    const xmlBuffer = Buffer.from(await xmlFile.arrayBuffer());
    const { error: xmlUploadError } = await supabaseAdmin.storage
      .from('comprobantes_externos')
      .upload(xmlPath, xmlBuffer, { upsert: true, contentType: 'application/xml' });

    if (xmlUploadError) {
      await supabaseAdmin.storage.from('comprobantes_externos').remove([pdfPath]);
      return NextResponse.json({ success: false, error: `Error subiendo XML: ${xmlUploadError.message}` }, { status: 500 });
    }

    // ── Signed URLs (100 años) ────────────────────────────────
    const { data: pdfSigned } = await supabaseAdmin.storage
      .from('comprobantes_externos')
      .createSignedUrl(pdfPath, 31536000 * 100);

    const { data: xmlSigned } = await supabaseAdmin.storage
      .from('comprobantes_externos')
      .createSignedUrl(xmlPath, 31536000 * 100);

    // ── INSERT en comprobantes ────────────────────────────────
    const serieNumero = `${serie}-${String(correlativo).padStart(8, '0')}`;

    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('comprobantes')
      .insert({
        cliente_id:       clienteId,
        pedido_id:        pedidoId || null,
        tipo_doc_codigo:  tipoDocCodigo,
        serie,
        correlativo,
        serie_numero:     serieNumero,
        fecha_emision:    fechaEmision,
        tipo_moneda:      'PEN',
        forma_pago:       'Contado',
        mto_oper_gravadas: subtotal,
        mto_oper_exoneradas: 0,
        mto_oper_inafectas: 0,
        mto_igv:          igvMonto,
        total_impuestos:  igvMonto,
        valor_venta:      subtotal,
        subtotal:         subtotal,
        mto_imp_venta:    total,
        enlace_pdf:       pdfSigned?.signedUrl ?? null,
        enlace_xml:       xmlSigned?.signedUrl ?? null,
        estado_sunat:     'aceptada_sunat',
        origen_emision:   'sol',
      })
      .select('id')
      .single();

    if (dbError) {
      // Rollback uploads
      await supabaseAdmin.storage.from('comprobantes_externos').remove([pdfPath, xmlPath]);
      if (dbError.code === '23505') {
        return NextResponse.json({ success: false, error: 'Ya existe un comprobante con esa serie y número' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: `Error al guardar: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, comprobante_id: inserted.id }, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
