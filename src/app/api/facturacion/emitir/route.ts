import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildInvoicePayload,
  sendInvoiceToApisPeru,
  getPdfFromApisPeru,
  type ApisPeruResponse,
  type ComprobanteData,
  type ComprobanteDetalle,
  type ComprobanteReferenciadoData,
  type ClienteData,
  type EmpresaData,
} from '@/lib/apisperuFacturacion';

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

    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (!perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
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
    const { data: cuotasRaw } = await supabase
      .from('comprobantes_cuotas')
      .select('monto, fecha_pago')
      .eq('comprobante_id', comprobante_id)
      .order('numero_cuota', { ascending: true });

    if (!detalles?.length || !cliente || !empresa) {
      return NextResponse.json({ success: false, error: 'Datos incompletos para facturación' }, { status: 400 });
    }

    // ─── Nota de Crédito: cargar comprobante referenciado ────────
    let comprobanteReferenciado: ComprobanteReferenciadoData | null = null;
    if (comprobante.tipo_doc_codigo === '07') {
      if (!comprobante.comprobante_referencia_id) {
        return NextResponse.json({ success: false, error: 'Nota de crédito sin comprobante de referencia asociado' }, { status: 422 });
      }
      const { data: ref, error: refError } = await supabase
        .from('comprobantes')
        .select('tipo_doc_codigo, serie_numero, fecha_emision')
        .eq('id', comprobante.comprobante_referencia_id)
        .maybeSingle();
      if (refError || !ref) {
        return NextResponse.json({ success: false, error: 'Comprobante referenciado no encontrado' }, { status: 404 });
      }
      comprobanteReferenciado = ref as ComprobanteReferenciadoData;
    }

    const cuotas = (cuotasRaw ?? []).map((c) => ({
      monto: Number(c.monto),
      fecha: String(c.fecha_pago).replace(' ', 'T').split('T')[0],
    }));

    const comprobanteConCuotas: ComprobanteData = {
      ...(comprobante as ComprobanteData),
      cuotas: cuotas.length > 0 ? cuotas : undefined,
    };

    const payload = buildInvoicePayload(
      comprobanteConCuotas,
      detalles as ComprobanteDetalle[],
      cliente as ClienteData,
      empresa as EmpresaData,
      comprobanteReferenciado,
    );

    const supabaseAdmin = createAdminClient();
    let apisPeruResponse: ApisPeruResponse = (comprobante.apisperu_response ?? {}) as ApisPeruResponse;

    // 1. Enviar a SUNAT (solo si no está aceptado)
    if (!yaAceptado) {
      try {
        apisPeruResponse = await sendInvoiceToApisPeru(payload);
        const sunatRes = apisPeruResponse.sunatResponse;
        const isAccepted = sunatRes?.success === true || sunatRes?.cdrResponse?.code === '0';

        if (!isAccepted) {
          const errorMsg = sunatRes?.error?.message ?? sunatRes?.cdrResponse?.description ?? 'Error de SUNAT';
          await supabaseAdmin.from('comprobantes').update({ 
            estado_sunat: 'rechazada_sunat', 
            apisperu_response: apisPeruResponse 
          }).eq('id', comprobante_id);
          return NextResponse.json({ success: false, error: `SUNAT rechazó: ${errorMsg}`, apisPeruResponse }, { status: 400 });
        }
      } catch (apiError: unknown) {
        const msg = apiError instanceof Error ? apiError.message : String(apiError);
        return NextResponse.json({ success: false, error: `Error de API: ${msg}` }, { status: 502 });
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
          return null;
        }
        return data?.signedUrl || null;
      } catch {
        return null;
      }
    };

    // Start with existing links as fallback; on yaAceptado force re-generation by clearing them
    let enlacePdf: string | null = comprobante.enlace_pdf ?? null;
    let enlaceXml: string | null = comprobante.enlace_xml ?? null;
    let enlaceCdr: string | null = comprobante.enlace_cdr ?? null;

    if (yaAceptado) {
      // Force re-upload of all files for a repair attempt, but keep old values as fallback
      enlacePdf = null;
      enlaceXml = null;
      enlaceCdr = null;
    }

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
          // Preserve the previously valid link if upload fails on re-generation
          if (yaAceptado) enlacePdf = comprobante.enlace_pdf ?? null;
        }
      } catch {
        if (yaAceptado) enlacePdf = comprobante.enlace_pdf ?? null;
      }
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
          if (yaAceptado) enlaceXml = comprobante.enlace_xml ?? null;
        }
      } catch {
        if (yaAceptado) enlaceXml = comprobante.enlace_xml ?? null;
      }
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
          if (yaAceptado) enlaceCdr = comprobante.enlace_cdr ?? null;
        }
      } catch {
        if (yaAceptado) enlaceCdr = comprobante.enlace_cdr ?? null;
      }
    }

    // 3. Actualizar registro final
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
      return NextResponse.json({ success: false, error: `Error al guardar en BD: ${dbErr.message}` }, { status: 500 });
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ success: false, error: 'No se encontró el registro para actualizar en la fase final' }, { status: 404 });
    }

    if (comprobante.tipo_doc_codigo !== '07' && comprobante.pedido_id) {
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

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
