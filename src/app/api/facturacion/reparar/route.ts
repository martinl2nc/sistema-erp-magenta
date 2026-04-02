import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildInvoicePayload,
  getPdfFromApisPeru,
  type ComprobanteData,
  type ComprobanteDetalle,
  type ClienteData,
  type EmpresaData,
} from '@/lib/apisperu-facturacion';

export async function POST(request: Request) {
  try {
    const { comprobante_id } = await request.json();
    if (!comprobante_id) return NextResponse.json({ error: 'Falta comprobante_id' }, { status: 400 });

    const supabase = createAdminClient();

    // 1. Obtener datos
    const { data: comprobante } = await supabase.from('comprobantes').select('*').eq('id', comprobante_id).single();
    if (!comprobante) return NextResponse.json({ error: 'No existe' }, { status: 404 });

    const { data: detalles } = await supabase.from('comprobantes_detalles').select('*').eq('comprobante_id', comprobante_id);
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', comprobante.cliente_id).single();
    const { data: empresa } = await supabase.from('empresa_configuracion').select('*').limit(1).single();

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
      await supabase.storage.from('facturas_emitidas').upload(pdfPath, pdfBuffer, { upsert: true });
      const { data: pdfUrl } = await supabase.storage.from('facturas_emitidas').createSignedUrl(pdfPath, 365 * 24 * 60 * 60);
      enlacePdf = pdfUrl?.signedUrl || pdfPath;
    } catch (e) {
      console.error('Error reparando PDF:', e);
    }

    // 4. Reparar XML (desde la respuesta guardada si existe)
    const resp = comprobante.apisperu_response as any;
    if (resp?.xml) {
      const xmlBuffer = Buffer.from(resp.xml, 'utf-8');
      const xmlPath = `${fileBaseName}.xml`;
      await supabase.storage.from('facturas_emitidas').upload(xmlPath, xmlBuffer, { upsert: true });
      const { data: xmlUrl } = await supabase.storage.from('facturas_emitidas').createSignedUrl(xmlPath, 365 * 24 * 60 * 60);
      enlaceXml = xmlUrl?.signedUrl || xmlPath;
    }

    // 5. Update database
    await supabase.from('comprobantes').update({
      enlace_pdf: enlacePdf,
      enlace_xml: enlaceXml
    }).eq('id', comprobante_id);

    return NextResponse.json({ success: true, pdf: enlacePdf, xml: enlaceXml });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
