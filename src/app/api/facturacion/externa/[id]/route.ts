import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── PUT /api/facturacion/externa/[id] ───────────────────────
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    // ── Guard: solo comprobantes SOL ──────────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from('comprobantes')
      .select('id, origen_emision, enlace_pdf, enlace_xml, serie, correlativo')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Comprobante no encontrado' }, { status: 404 });
    }
    if (existing.origen_emision !== 'sol') {
      return NextResponse.json({ success: false, error: 'Solo se pueden editar comprobantes externos' }, { status: 403 });
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
        !subtotalRaw || !igvMontoRaw || !totalRaw) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const correlativo = parseInt(correlativoRaw, 10);
    const subtotal    = parseFloat(subtotalRaw);
    const igvMonto    = parseFloat(igvMontoRaw);
    const total       = parseFloat(totalRaw);

    if (isNaN(correlativo) || isNaN(subtotal) || isNaN(igvMonto) || isNaN(total)) {
      return NextResponse.json({ success: false, error: 'Valores numéricos inválidos' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const serieNumero = `${serie}-${String(correlativo).padStart(8, '0')}`;
    const fileId = serieNumero;

    let enlacePdf: string | null = existing.enlace_pdf ?? null;
    let enlaceXml: string | null = existing.enlace_xml ?? null;

    // ── Upload condicional PDF ────────────────────────────────
    if (pdfFile) {
      const pdfPath = `${fileId}/comprobante.pdf`;
      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      const { error: pdfErr } = await supabaseAdmin.storage
        .from('comprobantes_externos')
        .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });

      if (pdfErr) {
        return NextResponse.json({ success: false, error: `Error subiendo PDF: ${pdfErr.message}` }, { status: 500 });
      }
      const { data: pdfSigned } = await supabaseAdmin.storage
        .from('comprobantes_externos')
        .createSignedUrl(pdfPath, 31536000 * 100);
      enlacePdf = pdfSigned?.signedUrl ?? enlacePdf;
    }

    // ── Upload condicional XML ────────────────────────────────
    if (xmlFile) {
      const xmlPath = `${fileId}/comprobante.xml`;
      const xmlBuffer = Buffer.from(await xmlFile.arrayBuffer());
      const { error: xmlErr } = await supabaseAdmin.storage
        .from('comprobantes_externos')
        .upload(xmlPath, xmlBuffer, { upsert: true, contentType: 'application/xml' });

      if (xmlErr) {
        return NextResponse.json({ success: false, error: `Error subiendo XML: ${xmlErr.message}` }, { status: 500 });
      }
      const { data: xmlSigned } = await supabaseAdmin.storage
        .from('comprobantes_externos')
        .createSignedUrl(xmlPath, 31536000 * 100);
      enlaceXml = xmlSigned?.signedUrl ?? enlaceXml;
    }

    // ── UPDATE comprobantes ───────────────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from('comprobantes')
      .update({
        cliente_id:        clienteId,
        tipo_doc_codigo:   tipoDocCodigo,
        serie,
        correlativo,
        serie_numero:      serieNumero,
        fecha_emision:     fechaEmision,
        mto_oper_gravadas: subtotal,
        mto_igv:           igvMonto,
        total_impuestos:   igvMonto,
        valor_venta:       subtotal,
        subtotal:          subtotal,
        mto_imp_venta:     total,
        pedido_id:         pedidoId || null,
        enlace_pdf:        enlacePdf,
        enlace_xml:        enlaceXml,
      })
      .eq('id', id);

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json({ success: false, error: 'Ya existe un comprobante con esa serie y número' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: `Error al guardar: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
