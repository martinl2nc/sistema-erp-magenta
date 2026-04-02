import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildInvoicePayload,
  sendInvoiceToApisPeru,
  getPdfFromApisPeru,
  type ComprobanteData,
  type ComprobanteDetalle,
  type ClienteData,
  type EmpresaData,
} from '@/lib/apisperu-facturacion';

// ─── POST /api/facturacion/emitir ────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comprobante_id } = body as { comprobante_id?: string };

    if (!comprobante_id) {
      return NextResponse.json({ success: false, error: 'comprobante_id es requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: comprobante, error: compErr } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('id', comprobante_id)
      .single();

    if (compErr || !comprobante) {
      return NextResponse.json({ success: false, error: `Comprobante no encontrado: ${compErr?.message}` }, { status: 404 });
    }

    // Permitir re-intento si faltan los archivos, incluso si está aceptada
    const yaAceptado = comprobante.estado_sunat === 'aceptada_sunat';

    const { data: detalles } = await supabase.from('comprobantes_detalles').select('*').eq('comprobante_id', comprobante_id);
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', comprobante.cliente_id).single();
    const { data: empresa } = await supabase.from('empresa_configuracion').select('*').limit(1).single();

    if (!detalles?.length || !cliente || !empresa) {
      return NextResponse.json({ success: false, error: 'Datos incompletos para facturación' }, { status: 400 });
    }

    const payload = buildInvoicePayload(
      comprobante as ComprobanteData,
      detalles as ComprobanteDetalle[],
      cliente as ClienteData,
      empresa as EmpresaData
    );

    const supabaseAdmin = createAdminClient();
    let apisPeruResponse = comprobante.apisperu_response as any;

    // 1. Enviar a SUNAT (solo si no está aceptado)
    if (!yaAceptado) {
      try {
        apisPeruResponse = await sendInvoiceToApisPeru(payload);
        const sunatRes = apisPeruResponse.sunatResponse;
        const isAccepted = sunatRes?.success === true || sunatRes?.cdrResponse?.code === '0';

        if (!isAccepted) {
          const errorMsg = sunatRes?.error?.message || sunatRes?.cdrResponse?.description || 'Error de SUNAT';
          await supabaseAdmin.from('comprobantes').update({ 
            estado_sunat: 'rechazada_sunat', 
            apisperu_response: apisPeruResponse 
          }).eq('id', comprobante_id);
          return NextResponse.json({ success: false, error: `SUNAT rechazó: ${errorMsg}`, apisPeruResponse }, { status: 400 });
        }
      } catch (apiError: any) {
        return NextResponse.json({ success: false, error: `Error de API: ${apiError.message}` }, { status: 502 });
      }
    }

    // 2. Generar/Subir archivos
    const serieNumero = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const fileBaseName = `${serieNumero}_${empresa.ruc}`;
    
    // Función para obtener URL firmada de larga duración (evita problemas de bucket privado)
    const getFileUrl = async (path: string) => {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .createSignedUrl(path, 31536000 * 100); // 100 años
        if (error) {
          console.error(`Error generando signed URL para ${path}:`, error.message);
          return null;
        }
        return data?.signedUrl || null;
      } catch (err) {
        console.error('Excepción en getFileUrl:', err);
        return null;
      }
    };

    let enlacePdf: string | null = yaAceptado ? null : comprobante.enlace_pdf;
    let enlaceXml: string | null = yaAceptado ? null : comprobante.enlace_xml;
    let enlaceCdr: string | null = yaAceptado ? null : comprobante.enlace_cdr;

    // PDF
    if (!enlacePdf) {
      try {
        const pdfBuffer = await getPdfFromApisPeru(payload);
        const pdfPath = `pdf/${fileBaseName}.pdf`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });
        
        if (!upErr) {
          enlacePdf = await getFileUrl(pdfPath);
        } else {
          console.error('Error subiendo PDF:', upErr.message);
        }
      } catch (e: any) { console.error('Error proceso PDF:', e.message); }
    }

    // XML
    if (!enlaceXml && apisPeruResponse.xml) {
      try {
        const xmlBuffer = Buffer.from(apisPeruResponse.xml, 'utf-8');
        const xmlPath = `xml/${fileBaseName}.xml`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .upload(xmlPath, xmlBuffer, { upsert: true, contentType: 'application/xml' });
        
        if (!upErr) {
          enlaceXml = await getFileUrl(xmlPath);
        } else {
          console.error('Error subiendo XML:', upErr.message);
        }
      } catch (e: any) { console.error('Error proceso XML:', e.message); }
    }

    // CDR (Constancia de Recepción de SUNAT)
    const cdrZip = apisPeruResponse.sunatResponse?.cdrZip;
    if (!enlaceCdr && cdrZip) {
      try {
        const cdrBuffer = Buffer.from(cdrZip, 'base64');
        const cdrPath = `cdr/R-${fileBaseName}.zip`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .upload(cdrPath, cdrBuffer, { upsert: true, contentType: 'application/zip' });
        
        if (!upErr) {
          enlaceCdr = await getFileUrl(cdrPath);
        } else {
          console.error('Error subiendo CDR:', upErr.message);
        }
      } catch (e: any) { console.error('Error proceso CDR:', e.message); }
    }

    // 3. Actualizar registro final
    console.log('Intentando actualizar comprobante:', comprobante_id);
    const { data: updateData, error: dbErr } = await supabaseAdmin
      .from('comprobantes')
      .update({
        estado_sunat: 'aceptada_sunat',
        enlace_pdf: enlacePdf,
        enlace_xml: enlaceXml,
        enlace_cdr: enlaceCdr,
        apisperu_response: apisPeruResponse
      })
      .eq('id', comprobante_id)
      .select();

    if (dbErr) {
      console.error('Error final DB:', dbErr.message);
      return NextResponse.json({ success: false, error: `Error al guardar en BD: ${dbErr.message}` }, { status: 500 });
    }

    if (!updateData || updateData.length === 0) {
      console.error('No se actualizó ninguna fila para id:', comprobante_id);
      return NextResponse.json({ success: false, error: 'No se encontró el registro para actualizar en la fase final' }, { status: 404 });
    }

    console.log('Actualización exitosa:', updateData[0].serie_numero);

    if (comprobante.pedido_id) {
      await supabaseAdmin.from('pedidos').update({ estado: 'facturado' }).eq('id', comprobante.pedido_id);
    }

    return NextResponse.json({
      success: true,
      message: yaAceptado ? 'Comprobante reparado con éxito' : 'Comprobante emitido',
      serie_numero: serieNumero,
      enlacePdf,
      enlaceXml,
      enlaceCdr,
      comprobante: updateData[0]
    });

  } catch (error: any) {
    console.error('Fatal error emitir:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
