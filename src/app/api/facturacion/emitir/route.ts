import React from 'react';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildInvoicePayload,
  sendInvoiceToApisunat,
  getInvoicePdfFromApisunat,
  type ApisunatResponse,
  type ComprobanteData,
  type ComprobanteDetalle,
  type ComprobanteReferenciadoData,
  type ClienteData,
  type EmpresaData,
} from '@/lib/apisunatFacturacion';
import { renderToBuffer } from '@react-pdf/renderer';
import { NotaVentaDocument, type NotaVentaPDFData } from '@/lib/pdf/notaVentaPDF';
import { getClientDisplayName } from '@/utils/formatters';

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

    // Nota de Venta (código '80'): comprobante interno — no viaja a ApisPeru
    if (comprobante.tipo_doc_codigo === '80') {
      const supabaseAdmin = createAdminClient();
      const serieNumero = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;

      const [{ data: detallesNV }, { data: clienteNV }, { data: empresaNV }] = await Promise.all([
        supabase.from('comprobantes_detalles').select('*').eq('comprobante_id', comprobante_id),
        supabase.from('clientes').select('*').eq('id', comprobante.cliente_id).single(),
        supabase.from('empresa_configuracion').select('*').limit(1).single(),
      ]);

      let enlacePdfNV: string | null = null;

      if (detallesNV && clienteNV && empresaNV) {
        try {
          const pdfData: NotaVentaPDFData = {
            serie_numero: serieNumero,
            fecha_emision: comprobante.fecha_emision,
            empresa_razon_social: (empresaNV as { razon_social: string }).razon_social,
            empresa_ruc: (empresaNV as { ruc: string }).ruc,
            empresa_direccion: (empresaNV as { direccion: string | null }).direccion,
            empresa_logo_url: (empresaNV as { logo_url: string | null }).logo_url,
            cliente_nombre: getClientDisplayName(clienteNV as Parameters<typeof getClientDisplayName>[0]),
            cliente_tipo_doc: (clienteNV as { tipo_documento: string | null }).tipo_documento,
            cliente_numero_doc: (clienteNV as { numero_documento: string | null }).numero_documento,
            cliente_direccion: (clienteNV as { direccion: string | null }).direccion,
            detalles: detallesNV.map((d: Record<string, unknown>) => ({
              descripcion: d.descripcion as string,
              cod_producto: d.cod_producto as string | null,
              cantidad: d.cantidad as number,
              mto_precio_unitario: d.mto_precio_unitario as number,
              mto_valor_venta: d.mto_valor_venta as number,
              unidad_codigo: d.unidad_codigo as string,
              descuento: d.descuento as number | null,
            })),
            subtotal: comprobante.valor_venta ?? comprobante.subtotal ?? 0,
            igv: comprobante.mto_igv ?? 0,
            total: comprobante.mto_imp_venta ?? 0,
            descuento_global: comprobante.descuento_global_monto ?? 0,
            aplica_igv: (comprobante.mto_igv ?? 0) > 0,
            terminos_condiciones: (empresaNV as { terminos_condiciones: string | null }).terminos_condiciones,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfBuffer = await renderToBuffer(
            React.createElement(NotaVentaDocument, { data: pdfData }) as any
          );
          const pdfPath = `pdf/NV-${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}_${(empresaNV as { ruc: string }).ruc}.pdf`;
          const { error: upErr } = await supabaseAdmin.storage
            .from('facturas_emitidas')
            .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });

          if (!upErr) {
            const { data: signedData } = await supabaseAdmin.storage
              .from('facturas_emitidas')
              .createSignedUrl(pdfPath, 31536000 * 100);
            enlacePdfNV = signedData?.signedUrl ?? null;
          }
        } catch {
          // PDF generation is non-fatal — the comprobante is still registered
        }
      }

      await supabaseAdmin
        .from('comprobantes')
        .update({ estado_sunat: 'interno', enlace_pdf: enlacePdfNV })
        .eq('id', comprobante_id);

      return NextResponse.json({
        success: true,
        message: 'Nota de Venta registrada',
        serie_numero: serieNumero,
        enlacePdf: enlacePdfNV,
        enlaceXml: null,
        enlaceCdr: null,
      });
    }

    const { data: detalles } = await supabase.from('comprobantes_detalles').select('*').eq('comprobante_id', comprobante_id);
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', comprobante.cliente_id).single();
    const { data: empresa } = await supabase.from('empresa_configuracion').select('*, apisunat_persona_id, apisunat_persona_token').limit(1).single();
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

    let detraccionDescBien: string | null = null;
    if (comprobante.detraccion_cod_bien) {
      const { data: bienData } = await supabase
        .from('cat_bien_servicio_detraccion')
        .select('descripcion')
        .eq('codigo', comprobante.detraccion_cod_bien)
        .maybeSingle();
      detraccionDescBien = bienData?.descripcion ?? null;
    }

    const comprobanteConCuotas: ComprobanteData = {
      ...(comprobante as ComprobanteData),
      detraccion_desc_bien: detraccionDescBien,
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
    let apisunatResponse: ApisunatResponse = (comprobante.apisperu_response ?? {}) as ApisunatResponse;

    // 1. Enviar a SUNAT (solo si no está aceptado)
    if (!yaAceptado) {
      try {
        apisunatResponse = await sendInvoiceToApisunat(payload);
        const sunatRes = apisunatResponse.sunatResponse;
        const isAccepted =
          sunatRes?.success === true ||
          sunatRes?.cdrResponse?.code === '0' ||
          apisunatResponse.status === 'PENDIENTE' ||
          (!sunatRes && !!apisunatResponse.documentId);

        if (!isAccepted) {
          const errorMsg = sunatRes?.error?.message ?? sunatRes?.cdrResponse?.description ?? 'Error de SUNAT';
          await supabaseAdmin.from('comprobantes').update({
            estado_sunat: 'rechazada_sunat',
            apisperu_response: apisunatResponse,
          }).eq('id', comprobante_id);
          return NextResponse.json({ success: false, error: `SUNAT rechazó: ${errorMsg}`, apisunatResponse }, { status: 400 });
        }
      } catch (apiError: unknown) {
        const msg = apiError instanceof Error ? apiError.message : String(apiError);
        return NextResponse.json({ success: false, error: `Error de API: ${msg}` }, { status: 502 });
      }
    }

    // 2. Persistir documentId ANTES de descargar PDF (recovery boundary)
    const documentId = apisunatResponse.documentId;
    const fileName = `${empresa.ruc}-${comprobante.tipo_doc_codigo}-${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;

    if (!yaAceptado) {
      await supabaseAdmin.from('comprobantes').update({
        estado_sunat: 'aceptada_sunat',
        apisperu_response: apisunatResponse,
        apisunat_document_id: documentId ?? null,
      }).eq('id', comprobante_id);
    }

    // 3. Generar/Subir archivos
    const serieNumero = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const fileBaseName = `${serieNumero}_${empresa.ruc}`;

    const getFileUrl = async (path: string) => {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .createSignedUrl(path, 31536000 * 100);
        if (error) return null;
        return data?.signedUrl || null;
      } catch {
        return null;
      }
    };

    let enlacePdf: string | null = comprobante.enlace_pdf ?? null;
    let enlaceXml: string | null = comprobante.enlace_xml ?? null;
    let enlaceCdr: string | null = comprobante.enlace_cdr ?? null;

    if (yaAceptado) {
      enlacePdf = null;
      enlaceXml = null;
      enlaceCdr = null;
    }

    // PDF — descargar desde ApiSunat usando documentId
    if (!enlacePdf && documentId) {
      try {
        const { buffer: pdfBuffer } = await getInvoicePdfFromApisunat(documentId, fileName, {
          personaId: empresa.apisunat_persona_id,
          personaToken: empresa.apisunat_persona_token,
        });
        const pdfPath = `pdf/${fileBaseName}.pdf`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('facturas_emitidas')
          .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });

        if (!upErr) {
          enlacePdf = await getFileUrl(pdfPath);
        } else if (yaAceptado) {
          enlacePdf = comprobante.enlace_pdf ?? null;
        }
      } catch {
        // PDF falla no bloquea — documentId ya está guardado, reparar puede reintentarlo
        if (yaAceptado) enlacePdf = comprobante.enlace_pdf ?? null;
      }
    }

    // CDR ZIP — ApiSunat DEV devuelve la URL del ZIP en el campo `xml`
    // ApiSunat PROD devuelve el ZIP en base64 dentro de sunatResponse.cdrZip
    const cdrZipBase64 = apisunatResponse.sunatResponse?.cdrZip;
    const cdrZipUrl = apisunatResponse.xml; // URL a Azure Blob (DEV)

    if (!enlaceCdr) {
      try {
        let cdrBuffer: Buffer | null = null;

        if (cdrZipBase64) {
          cdrBuffer = Buffer.from(cdrZipBase64, 'base64');
        } else if (cdrZipUrl?.startsWith('http')) {
          const cdrRes = await fetch(cdrZipUrl);
          if (cdrRes.ok) cdrBuffer = Buffer.from(await cdrRes.arrayBuffer());
        }

        if (cdrBuffer) {
          const cdrPath = `cdr/R-${fileBaseName}.zip`;
          const { error: upErr } = await supabaseAdmin.storage
            .from('facturas_emitidas')
            .upload(cdrPath, cdrBuffer, { upsert: true, contentType: 'application/zip' });

          if (!upErr) {
            enlaceCdr = await getFileUrl(cdrPath);
          } else if (yaAceptado) {
            enlaceCdr = comprobante.enlace_cdr ?? null;
          }
        } else if (yaAceptado) {
          enlaceCdr = comprobante.enlace_cdr ?? null;
        }
      } catch {
        if (yaAceptado) enlaceCdr = comprobante.enlace_cdr ?? null;
      }
    }

    // 4. Actualizar registro final con URLs de archivos
    const { data: updateData, error: dbErr } = await supabaseAdmin
      .from('comprobantes')
      .update({
        estado_sunat: 'aceptada_sunat',
        enlace_pdf: enlacePdf,
        enlace_xml: enlaceXml,
        enlace_cdr: enlaceCdr,
        apisperu_response: apisunatResponse,
        apisunat_document_id: documentId ?? null,
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
      documentId: documentId ?? null,
      enlacePdf,
      enlaceXml,
      enlaceCdr,
      comprobante: updateData[0],
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
