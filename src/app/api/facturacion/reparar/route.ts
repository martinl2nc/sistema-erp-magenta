import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInvoicePdfFromApisunat, getDocumentFromApisunat } from '@/lib/apisunatFacturacion';

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

    // 1. Obtener comprobante y empresa
    const { data: comprobante } = await supabaseAdmin
      .from('comprobantes')
      .select('id, apisunat_document_id, tipo_doc_codigo, serie, correlativo, cliente_id, enlace_pdf, enlace_xml, apisperu_response')
      .eq('id', comprobante_id)
      .single();
    if (!comprobante) return NextResponse.json({ error: 'No existe' }, { status: 404 });

    // 2. Legacy check — comprobantes emitidos con ApisPeru no tienen documentId
    if (!comprobante.apisunat_document_id) {
      return NextResponse.json(
        { error: 'Este comprobante fue emitido con el proveedor anterior (ApisPeru) y no puede re-descargarse desde aquí.' },
        { status: 409 },
      );
    }

    const { data: empresa } = await supabaseAdmin
      .from('empresa_configuracion')
      .select('ruc, apisunat_persona_id, apisunat_persona_token')
      .limit(1)
      .single();
    if (!empresa) return NextResponse.json({ error: 'Configuración de empresa no encontrada' }, { status: 400 });

    const fileName = `${empresa.ruc}-${comprobante.tipo_doc_codigo}-${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const serieNumero = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const fileBaseName = `${serieNumero}_${empresa.ruc}`;

    // 3. Descargar PDF desde ApiSunat usando documentId persistido
    const { buffer: pdfBuffer } = await getInvoicePdfFromApisunat(
      comprobante.apisunat_document_id,
      fileName,
      {
        personaId: empresa.apisunat_persona_id,
        personaToken: empresa.apisunat_persona_token,
      },
    );

    const pdfPath = `pdf/${fileBaseName}.pdf`;
    await supabaseAdmin.storage
      .from('facturas_emitidas')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });

    const { data: pdfUrl } = await supabaseAdmin.storage
      .from('facturas_emitidas')
      .createSignedUrl(pdfPath, 31536000 * 100);
    const enlacePdf = pdfUrl?.signedUrl ?? null;

    // 4. Reparar XML + CDR desde ApiSunat getById
    let enlaceXml: string | null = null;
    let enlaceCdr: string | null = null;

    const auth = {
      personaId: empresa.apisunat_persona_id.trim(),
      personaToken: empresa.apisunat_persona_token.trim(),
    };

    const getFileUrl = async (path: string): Promise<string | null> => {
      const { data, error } = await supabaseAdmin.storage
        .from('facturas_emitidas')
        .createSignedUrl(path, 31536000 * 100);
      return error ? null : (data?.signedUrl ?? null);
    };

    // Usa magic bytes para detectar ZIPs que Azure Blob sirve con content-type incorrecto
    const downloadAndUpload = async (url: string, path: string, fallbackContentType: string): Promise<string | null> => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      const isZipMagic = buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
      const actualContentType = isZipMagic ? 'application/zip' : (res.headers.get('content-type') ?? fallbackContentType);
      const actualPath = isZipMagic && path.endsWith('.xml') ? path.replace('.xml', '.zip') : path;
      const { error: upErr } = await supabaseAdmin.storage
        .from('facturas_emitidas')
        .upload(actualPath, buffer, { upsert: true, contentType: actualContentType });
      return upErr ? null : getFileUrl(actualPath);
    };

    try {
      const docInfo = await getDocumentFromApisunat(comprobante.apisunat_document_id, auth);

      if (docInfo?.xml?.startsWith('http')) {
        try {
          const result = await downloadAndUpload(docInfo.xml, `xml/${fileBaseName}.xml`, 'application/xml');
          if (result) enlaceXml = result;
        } catch { /* no bloquea */ }
      }

      if (docInfo?.cdr?.startsWith('http')) {
        try {
          const result = await downloadAndUpload(docInfo.cdr, `cdr/R-${fileBaseName}.zip`, 'application/zip');
          if (result) enlaceCdr = result;
        } catch { /* no bloquea */ }
      }
    } catch { /* getById no bloquea */ }

    // 5. Actualizar BD
    await supabaseAdmin.from('comprobantes').update({
      enlace_pdf: enlacePdf,
      enlace_xml: enlaceXml,
      enlace_cdr: enlaceCdr,
    }).eq('id', comprobante_id);

    return NextResponse.json({ success: true, pdf: enlacePdf, xml: enlaceXml, cdr: enlaceCdr });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
