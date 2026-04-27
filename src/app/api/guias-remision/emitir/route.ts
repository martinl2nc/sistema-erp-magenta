import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildDespatchPayload,
  sendDespatchToApisunat,
  getDespatchPdfFromApisunat,
  type ApisunatDespatchResponse,
} from '@/lib/apisunatGuiasRemision';
import type { EmitirGuiaRemisionPayload } from '@/services/guiasRemision.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    const body: EmitirGuiaRemisionPayload = await request.json();

    // Validate required
    if (
      !body.cliente_id ||
      !body.dir_llegada_ubigueo ||
      !body.dir_partida_ubigueo ||
      !body.motivo_traslado_codigo ||
      !body.modalidad_traslado ||
      !body.fecha_inicio_traslado ||
      !body.peso_bruto_total ||
      !body.lineas?.length
    ) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios para emitir la guía' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // Load empresa config
    const { data: empresa, error: empErr } = await supabaseAdmin
      .from('empresa_configuracion')
      .select('ruc, razon_social, nombre_comercial, direccion, departamento, provincia, distrito, ubigueo, apisunat_persona_id, apisunat_persona_token')
      .limit(1)
      .single();

    if (empErr || !empresa) {
      return NextResponse.json(
        { success: false, error: 'No se pudo cargar la configuración de empresa' },
        { status: 400 },
      );
    }

    if (!empresa.departamento || !empresa.provincia || !empresa.distrito || !empresa.ubigueo) {
      return NextResponse.json(
        {
          success: false,
          error:
            'La empresa no tiene ubigeo configurado. Completá el ubigeo en Administración → Empresa antes de emitir guías.',
        },
        { status: 422 },
      );
    }

    // Load motivo label
    const { data: motivoData } = await supabaseAdmin
      .from('cat_motivo_traslado')
      .select('descripcion')
      .eq('codigo', body.motivo_traslado_codigo)
      .single();
    const motivoLabel = motivoData?.descripcion ?? body.motivo_traslado_codigo;

    const today = new Date().toISOString().split('T')[0];

    // 1. Atomic create via RPC
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'emitir_guia_remision',
      {
        p_pedido_id:              body.pedido_id,
        p_comprobante_id:         body.comprobante_id,
        p_nro_doc_relacionado:    body.nro_doc_relacionado,
        p_tipo_doc_relacionado:   body.tipo_doc_relacionado,
        p_cliente_id:             body.cliente_id,
        p_destinatario_tipo_doc:  body.destinatario_tipo_doc,
        p_destinatario_num_doc:   body.destinatario_num_doc,
        p_destinatario_razon_social: body.destinatario_razon_social,
        p_dir_llegada_ubigueo:    body.dir_llegada_ubigueo,
        p_dir_llegada_dpto:       body.dir_llegada_departamento,
        p_dir_llegada_prov:       body.dir_llegada_provincia,
        p_dir_llegada_dist:       body.dir_llegada_distrito,
        p_dir_llegada_dir:        body.dir_llegada_direccion,
        p_dir_partida_ubigueo:    body.dir_partida_ubigueo,
        p_dir_partida_dpto:       body.dir_partida_departamento,
        p_dir_partida_prov:       body.dir_partida_provincia,
        p_dir_partida_dist:       body.dir_partida_distrito,
        p_dir_partida_dir:        body.dir_partida_direccion,
        p_motivo_traslado_codigo: body.motivo_traslado_codigo,
        p_motivo_traslado_desc:   body.motivo_traslado_desc,
        p_modalidad_traslado:     body.modalidad_traslado,
        p_fecha_emision:          body.fecha_emision ?? today,
        p_fecha_inicio_traslado:  body.fecha_inicio_traslado,
        p_peso_bruto_total:       body.peso_bruto_total,
        p_unidad_peso:            body.unidad_peso ?? 'KGM',
        p_numero_bultos:          body.numero_bultos,
        p_observacion:            body.observacion,
        p_transp_tipo_doc:        body.transportista_tipo_doc,
        p_transp_num_doc:         body.transportista_num_doc,
        p_transp_razon_social:    body.transportista_razon_social,
        p_transp_placa:           body.transportista_placa,
        p_conductor_tipo_doc:     body.conductor_tipo_doc,
        p_conductor_num_doc:      body.conductor_num_doc,
        p_vehiculo_placa:         body.vehiculo_propio_placa,
        p_vehiculo_conductor_doc: body.vehiculo_propio_conductor_doc,
        p_creado_por:             user.id,
        p_lineas:                 body.lineas,
      },
    );

    if (rpcError || !rpcResult) {
      return NextResponse.json(
        { success: false, error: rpcError?.message ?? 'Error al crear la guía en BD' },
        { status: 500 },
      );
    }

    const { guia_id, serie_numero, serie, correlativo } = rpcResult as {
      guia_id: string;
      serie_numero: string;
      serie: string;
      correlativo: number;
    };

    // 2. Build ApiSunat payload
    const despatchPayload = buildDespatchPayload({
      guia: {
        serie,
        correlativo,
        fecha_emision: body.fecha_emision ?? today,
        fecha_inicio_traslado: body.fecha_inicio_traslado,
        observacion: body.observacion,
        tipo_doc_relacionado: body.tipo_doc_relacionado,
        nro_doc_relacionado: body.nro_doc_relacionado,
        destinatario_tipo_doc: body.destinatario_tipo_doc,
        destinatario_num_doc: body.destinatario_num_doc,
        destinatario_razon_social: body.destinatario_razon_social,
        dir_llegada_ubigueo: body.dir_llegada_ubigueo,
        dir_llegada_direccion: body.dir_llegada_direccion,
        dir_partida_ubigueo: body.dir_partida_ubigueo,
        dir_partida_direccion: body.dir_partida_direccion,
        motivo_traslado_codigo: body.motivo_traslado_codigo,
        motivo_traslado_desc: body.motivo_traslado_desc,
        modalidad_traslado: body.modalidad_traslado,
        peso_bruto_total: body.peso_bruto_total,
        unidad_peso: body.unidad_peso ?? 'KGM',
        transportista_tipo_doc: body.transportista_tipo_doc,
        transportista_num_doc: body.transportista_num_doc,
        transportista_razon_social: body.transportista_razon_social,
        transportista_placa: body.transportista_placa,
        conductor_tipo_doc: body.conductor_tipo_doc,
        conductor_num_doc: body.conductor_num_doc,
        conductor_nombres: body.conductor_nombres,
        vehiculo_propio_placa: body.vehiculo_propio_placa,
        vehiculo_propio_conductor_doc: body.vehiculo_propio_conductor_doc,
        vehiculo_propio_conductor_nombres: body.vehiculo_propio_conductor_nombres,
      },
      empresa,
      lineas: body.lineas,
      motivoLabel,
    });



    // 3. Send to ApiSunat
    let apisunatResponse: ApisunatDespatchResponse = {};
    try {
      apisunatResponse = await sendDespatchToApisunat(despatchPayload);
    } catch (apiError: unknown) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      await supabaseAdmin
        .from('guias_remision')
        .update({ estado_sunat: 'rechazada_sunat', apisperu_response: { error: msg } })
        .eq('id', guia_id);
      return NextResponse.json({ success: false, error: `Error ApiSunat: ${msg}` }, { status: 502 });
    }

    const sunatRes = apisunatResponse.sunatResponse;
    const isAccepted =
      sunatRes?.success === true || sunatRes?.cdrResponse?.code === '0';

    if (!isAccepted) {
      const errorMsg =
        sunatRes?.error?.message ??
        sunatRes?.cdrResponse?.description ??
        'SUNAT rechazó la guía';
      await supabaseAdmin
        .from('guias_remision')
        .update({ estado_sunat: 'rechazada_sunat', apisperu_response: apisunatResponse })
        .eq('id', guia_id);
      return NextResponse.json(
        { success: false, error: `SUNAT rechazó: ${errorMsg}` },
        { status: 400 },
      );
    }

    // 4. Persistir documentId ANTES de descargar PDF (recovery boundary)
    const documentId = apisunatResponse.documentId;
    const fileName = `${empresa.ruc}-09-${serie}-${String(correlativo).padStart(8, '0')}`;

    await supabaseAdmin
      .from('guias_remision')
      .update({
        estado_sunat: 'aceptada_sunat',
        apisperu_response: apisunatResponse,
        apisunat_document_id: documentId ?? null,
      })
      .eq('id', guia_id);

    // 5. Upload files to storage
    const fileBase = `${guia_id}/${serie_numero}`;
    let enlacePdf: string | null = null;
    let enlaceXml: string | null = null;
    let enlaceCdr: string | null = null;

    const getSignedUrl = async (path: string) => {
      try {
        const { data } = await supabaseAdmin.storage
          .from('guias_remision')
          .createSignedUrl(path, 31536000 * 100);
        return data?.signedUrl ?? null;
      } catch {
        return null;
      }
    };

    // PDF — usar documentId de ApiSunat
    if (documentId) {
      try {
        const { buffer: pdfBuffer } = await getDespatchPdfFromApisunat(documentId, fileName, {
          personaId: empresa.apisunat_persona_id,
          personaToken: empresa.apisunat_persona_token,
        });
        const pdfPath = `${fileBase}.pdf`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('guias_remision')
          .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });
        if (!upErr) enlacePdf = await getSignedUrl(pdfPath);
      } catch {
        // PDF is non-fatal — documentId ya persistido, se puede recuperar después
      }
    }

    // XML
    if (apisunatResponse.xml) {
      try {
        const xmlBuffer = Buffer.from(apisunatResponse.xml, 'utf-8');
        const xmlPath = `${fileBase}.xml`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('guias_remision')
          .upload(xmlPath, xmlBuffer, { upsert: true, contentType: 'application/xml' });
        if (!upErr) enlaceXml = await getSignedUrl(xmlPath);
      } catch {
        // XML is non-fatal
      }
    }

    // CDR
    if (sunatRes?.cdrZip) {
      try {
        const cdrBuffer = Buffer.from(sunatRes.cdrZip, 'base64');
        const cdrPath = `${fileBase}_CDR.zip`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('guias_remision')
          .upload(cdrPath, cdrBuffer, { upsert: true, contentType: 'application/zip' });
        if (!upErr) enlaceCdr = await getSignedUrl(cdrPath);
      } catch {
        // CDR is non-fatal
      }
    }

    // 6. Actualizar con URLs de archivos
    await supabaseAdmin
      .from('guias_remision')
      .update({
        enlace_pdf: enlacePdf,
        enlace_xml: enlaceXml,
        enlace_cdr: enlaceCdr,
      })
      .eq('id', guia_id);

    return NextResponse.json({
      success: true,
      serie_numero,
      documentId: documentId ?? null,
      enlace_pdf: enlacePdf,
      enlace_xml: enlaceXml,
      enlace_cdr: enlaceCdr,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
