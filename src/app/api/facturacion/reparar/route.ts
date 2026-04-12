import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildInvoicePayload,
  getPdfFromApisPeru,
  type ApisPeruResponse,
  type ComprobanteData,
  type ComprobanteDetalle,
  type ClienteData,
  type EmpresaData,
} from '@/lib/apisperuFacturacion';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { comprobante_id } = await request.json();
    if (!comprobante_id) return NextResponse.json({ error: 'Falta comprobante_id' }, { status: 400 });

    const supabaseAdmin = createAdminClient();

    // 1. Obtener datos
    const { data: comprobante } = await supabaseAdmin.from('comprobantes').select('*').eq('id', comprobante_id).single();
    if (!comprobante) return NextResponse.json({ error: 'No existe' }, { status: 404 });

    const { data: detalles } = await supabaseAdmin.from('comprobantes_detalles').select('*').eq('comprobante_id', comprobante_id);
    const { data: cliente } = await supabaseAdmin.from('clientes').select('*').eq('id', comprobante.cliente_id).single();
    const { data: empresa } = await supabaseAdmin.from('empresa_configuracion').select('*').limit(1).single();

    if (!detalles || !cliente || !empresa) return NextResponse.json({ error: 'Datos incompletos para reparar' }, { status: 400 });

    // 2. Build payload
    const payload = buildInvoicePayload(
      comprobante as ComprobanteData,
      detalles as ComprobanteDetalle[],
      cliente as ClienteData,
      empresa as EmpresaData
    );

    const serieNumero = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const fileBaseName = `${serieNumero}_${empresa.ruc}`;

    let enlacePdf = null;
    let enlaceXml = null;

    // 3. Reparar PDF
    try {
      const pdfBuffer = await getPdfFromApisPeru(payload);
      const pdfPath = `${fileBaseName}.pdf`;
      await supabaseAdmin.storage.from('facturas_emitidas').upload(pdfPath, pdfBuffer, { upsert: true });
      const { data: pdfUrl } = await supabaseAdmin.storage.from('facturas_emitidas').createSignedUrl(pdfPath, 365 * 24 * 60 * 60);
      enlacePdf = pdfUrl?.signedUrl || pdfPath;
    } catch (e: unknown) {
      console.error('Error reparando PDF:', e);
    }

    // 4. Reparar XML (desde la respuesta guardada si existe)
    const resp = (comprobante.apisperu_response ?? {}) as ApisPeruResponse;
    if (resp.xml) {
      const xmlBuffer = Buffer.from(resp.xml, 'utf-8');
      const xmlPath = `${fileBaseName}.xml`;
      await supabaseAdmin.storage.from('facturas_emitidas').upload(xmlPath, xmlBuffer, { upsert: true });
      const { data: xmlUrl } = await supabaseAdmin.storage.from('facturas_emitidas').createSignedUrl(xmlPath, 365 * 24 * 60 * 60);
      enlaceXml = xmlUrl?.signedUrl || xmlPath;
    }

    // 5. Update database
    await supabaseAdmin.from('comprobantes').update({
      enlace_pdf: enlacePdf,
      enlace_xml: enlaceXml
    }).eq('id', comprobante_id);

    return NextResponse.json({ success: true, pdf: enlacePdf, xml: enlaceXml });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
