/**
 * ApisPeru Facturación — Helper server-side
 * Mapea datos del comprobante al JSON de ApisPeru y llama a la API.
 * ⚠️  Este archivo solo se importa en API Routes (server-side).
 */

import { numeroALetras } from '../utils/numeroALetras';
import { buildSunatPayloadTotals } from '../utils/calculations';
import { TAX_RATES } from '@/constants';

// ─── Types ───────────────────────────────────────────────────

export interface ApisPeruDetraccion {
  codBienDetraccion: string; // Cat. 54 — campo REAL en ApisPerú (NO codBienServicio)
  codMedioPago: string;       // '001'=Depósito en cta, '002'=Giro, '003'=Transferencia
  ctaBanco: string;
  percent: number;
  mount: number;
  valueRef?: number;          // mtoImpVenta (opcional)
}

export interface ApisPeruInvoicePayload {
  ublVersion: string;
  tipoOperacion?: string; // omitido para NC (tipo '07') — no está en el schema de Note de ApisPeru
  tipoDoc: string;
  serie: string;
  correlativo: string;
  fechaEmision: string;
  tipoMoneda: string;
  formaPago?: {
    moneda: string;
    tipo: 'Contado' | 'Credito';
    monto?: number;
  }; // omitido para NC (tipo '07')
  cuotas?: { moneda: string; monto: number; fechaPago: string }[];
  client: {
    tipoDoc: string;
    numDoc: string;
    rznSocial: string;
    address: { direccion: string; ubigueo?: string };
  };
  company: {
    ruc: string;
    razonSocial: string;
    address: { direccion: string; ubigueo?: string };
  };
  details: ApisPeruDetail[];
  legends: { code: string; value: string }[];
  mtoOperGravadas: number;
  mtoOperExoneradas: number;
  mtoOperInafectas: number;
  mtoIGV: number;
  totalImpuestos: number;
  valorVenta: number;
  subTotal: number;
  mtoImpVenta: number;
  mtoDescuentoGlobal?: number;
  totalDescuentos?: number;
  sumDsctoGlobal?: number;
  sumOtrosDescuentos?: number;
  descuentos?: {
    codTipo: string;
    factor: number;
    monto: number;
    montoBase: number;
    base: number;
  }[];
  detraccion?: ApisPeruDetraccion;
  // ─── Nota de Crédito (solo cuando tipoDoc === '07') ───────
  codMotivo?: string;          // Cat. 09 SUNAT, ej: '01' = Anulación total
  desMotivo?: string;          // texto libre del motivo (campo ApisPeru: desMotivo)
  tipDocAfectado?: string;     // '01' | '03' (tipo del comprobante original)
  numDocfectado?: string;      // serie_numero del original, ej: 'F001-00000001' (campo ApisPeru: numDocfectado)
}

export interface ApisPeruDetail {
  codProducto: string;
  unidad: string;
  descripcion: string;
  cantidad: number;
  mtoValorUnitario: number;
  mtoValorVenta: number;
  mtoBaseIgv: number;
  porcentajeIgv: number;
  igv: number;
  tipAfeIgv: string;
  totalImpuestos: number;
  mtoPrecioUnitario: number;
  descuentos?: {
    codTipo: string;
    montoBase: number;
    factor: number;
    monto: number;
  }[];
}

export interface ApisPeruResponse {
  success?: boolean;
  error?: string | unknown;
  xml?: string;
  hash?: string;
  sunatResponse?: {
    success?: boolean;
    error?: {
      code?: string;
      message?: string;
    };
    cdrZip?: string;
    cdrResponse?: {
      id?: string;
      code?: string;
      description?: string;
      notes?: string[];
    };
  };
}

// ─── Data mapping types ──────────────────────────────────────

export interface ComprobanteData {
  id: string;
  tipo_operacion: string;
  tipo_doc_codigo: string;
  serie: string;
  correlativo: number;
  fecha_emision: string;
  tipo_moneda: string;
  forma_pago: string;
  mto_oper_gravadas: number;
  mto_oper_exoneradas: number;
  mto_oper_inafectas: number;
  mto_igv: number;
  total_impuestos: number;
  valor_venta: number;
  subtotal: number;
  mto_imp_venta: number;
  leyendas: { code: string; value: string }[] | null;
  descuento_global_monto?: number;
  descuento_global_codigo?: string;
  // Detracción
  detraccion_cod_bien: string | null;
  detraccion_desc_bien?: string | null;
  detraccion_cod_medio_pago: string | null;
  detraccion_porcentaje: number | null;
  detraccion_monto: number | null;
  detraccion_cuenta_bn: string | null;
  // Nota de Crédito (presentes cuando tipo_doc_codigo === '07')
  comprobante_referencia_id?: string | null;
  motivo_nota?: string | null;
  tipo_nota_codigo?: string | null;
  // Cuotas (presentes cuando forma_pago === 'Credito')
  cuotas?: { monto: number; fecha: string }[];
}

export interface ComprobanteDetalle {
  cod_producto: string | null;
  unidad_codigo: string;
  descripcion: string;
  cantidad: number;
  mto_valor_unitario: number;
  mto_valor_venta: number;
  mto_base_igv: number;
  porcentaje_igv: number;
  igv: number;
  tip_afe_igv_codigo: string;
  total_impuestos: number;
  mto_precio_unitario: number;
  descuento?: number | null;
}

export interface ClienteData {
  tipo_documento: string | null;
  numero_documento: string | null;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  direccion: string | null;
  ubigueo: string;
}

export interface EmpresaData {
  ruc: string;
  razon_social: string;
  direccion: string | null;
}

export interface ComprobanteReferenciadoData {
  tipo_doc_codigo: string; // '01' | '03'
  serie_numero: string;    // ej: 'F001-00000123'
  fecha_emision: string;   // 'YYYY-MM-DD' o ISO
}

// ─── Mapeo código medio de pago detracción → descripción ────
const MEDIO_PAGO_DESC: Record<string, string> = {
  '001': 'Depósito en cuenta',
  '002': 'Giro',
  '003': 'Transferencia de fondos',
  '004': 'Orden de pago',
  '005': 'Tarjeta de débito',
};

// ─── Mapeo tipo_documento local → tipoDoc SUNAT ─────────────

function mapTipoDocCliente(tipo: string | null): string {
  if (!tipo) return '0'; // Sin documento
  switch (tipo.toUpperCase()) {
    case 'RUC': return '6';
    case 'DNI': return '1';
    case 'CE': return '4';
    case 'PASAPORTE': return '7';
    default: return '0';
  }
}

// ─── Build payload ───────────────────────────────────────────

export function buildInvoicePayload(
  comprobante: ComprobanteData,
  detalles: ComprobanteDetalle[],
  cliente: ClienteData,
  empresa: EmpresaData,
  comprobanteReferenciado?: ComprobanteReferenciadoData | null,
): ApisPeruInvoicePayload {
  if (comprobante.tipo_doc_codigo === '07') {
    if (!comprobanteReferenciado) throw new Error('Nota de crédito sin comprobante de referencia');
    if (!comprobante.motivo_nota || !comprobante.tipo_nota_codigo) throw new Error('NC sin motivo o tipo_nota_codigo');
  }

  const clientName = cliente.razon_social?.trim()
    || `${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`.trim()
    || 'CLIENTE GENÉRICO';

  return {
    ublVersion: '2.1',
    // tipoOperacion no aplica para NC — no está en el schema de Note de ApisPeru
    ...(comprobante.tipo_doc_codigo !== '07' ? { tipoOperacion: comprobante.tipo_operacion || '0101' } : {}),
    tipoDoc: comprobante.tipo_doc_codigo,
    serie: comprobante.serie,
    correlativo: String(comprobante.correlativo),
    fechaEmision: comprobante.fecha_emision.split('T')[0] + 'T00:00:00-05:00',
    tipoMoneda: comprobante.tipo_moneda || 'PEN',
    // formaPago no aplica para NC (tipo_doc '07') — SUNAT error 3246 si se incluye
    ...(comprobante.tipo_doc_codigo !== '07' ? {
      formaPago: comprobante.forma_pago === 'Credito' && comprobante.cuotas?.length
        ? {
            moneda: comprobante.tipo_moneda || 'PEN',
            tipo: 'Credito' as const,
            monto: Number(
              (comprobante.mto_imp_venta - (comprobante.detraccion_monto ?? 0)).toFixed(2)
            ),
          }
        : {
            moneda: comprobante.tipo_moneda || 'PEN',
            tipo: 'Contado' as const,
          },
    } : {}),
    // cuotas va al nivel superior del payload (no dentro de formaPago) — spec ApisPeru
    ...(comprobante.tipo_doc_codigo !== '07' && comprobante.forma_pago === 'Credito' && comprobante.cuotas?.length
      ? {
          cuotas: comprobante.cuotas.map((c) => ({
            moneda: comprobante.tipo_moneda || 'PEN',
            monto: c.monto,
            fechaPago: c.fecha + 'T00:00:00-05:00',
          })),
        }
      : {}),
    client: {
      tipoDoc: mapTipoDocCliente(cliente.tipo_documento),
      numDoc: cliente.numero_documento || '00000000',
      rznSocial: clientName,
      address: {
        direccion: cliente.direccion || '-',
        ubigueo: cliente.ubigueo || '150101',
      },
    },
    company: {
      ruc: empresa.ruc,
      razonSocial: empresa.razon_social,
      address: {
        direccion: empresa.direccion || '-',
        ubigueo: '150101', // Lima default — puede ajustarse en empresa_configuracion
      },
    },
    // ─── Line items (data mapping) ────────────────────────────
    ...(() => {
      // Para NCs (tipo '07'): SUNAT no soporta descuentos globales a nivel documento (error 3280).
      // mtoImpVenta debe ser = mtoOperGravadas + mtoIGV. Se ignora el descuento del header.
      const discountAmount = comprobante.tipo_doc_codigo === '07'
        ? 0
        : Number((comprobante.descuento_global_monto || 0).toFixed(2));
      const descuentoGlobalCodigo = comprobante.descuento_global_codigo || '03';

      // Map items — data transformation only, no financial accumulation
      const isNC = comprobante.tipo_doc_codigo === '07';
      const details = detalles.map((d) => {
        const itemBase = Number(d.mto_base_igv.toFixed(2));
        const itemIgv = Number(d.igv.toFixed(2));
        const itemTotalImpuestos = Number(d.total_impuestos.toFixed(2));
        const tipAfe = d.tip_afe_igv_codigo ? String(d.tip_afe_igv_codigo) : '10';
        const porcentajeIgv = Number(d.porcentaje_igv ?? (TAX_RATES.IGV * 100));
        const factorImpuesto = (porcentajeIgv / 100) + 1;

        // Para NCs: normalizar mtoValorUnitario a itemBase/cantidad para eliminar descuentos
        // implícitos de línea. SUNAT valida CreditNoteLine sin aplicar AllowanceCharge
        // → LineExtensionAmount debe = PriceAmount × Quantity exacto (error 3271 si no).
        const mtoValorUnitario = isNC
          ? Number((itemBase / d.cantidad).toFixed(10))
          : d.mto_valor_unitario;

        // Detectar descuento de línea: explícito o implícito
        // cuando mtoValorUnitario × cantidad > itemBase (genera cac:AllowanceCharge, evita error 3271)
        const grossValue = Number((mtoValorUnitario * d.cantidad).toFixed(2));
        const explicitDiscount = d.descuento && d.descuento > 0 ? Number(d.descuento.toFixed(2)) : 0;
        const impliedDiscount = Number((grossValue - itemBase).toFixed(2));
        const descuentoLinea = explicitDiscount > 0 ? explicitDiscount : (impliedDiscount > 0.005 ? impliedDiscount : null);
        const montoBaseDescuento = descuentoLinea ? grossValue : null;

        // AlternativeConditionPrice = LineExtensionAmount / Quantity × (1 + tasa) — evita error 3270
        const mtoPrecioUnitario = Number(((itemBase / d.cantidad) * factorImpuesto).toFixed(10));

        return {
          codProducto: d.cod_producto || '-',
          unidad: d.unidad_codigo || 'NIU',
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          mtoValorUnitario,
          mtoValorVenta: itemBase,
          mtoBaseIgv: itemBase,
          porcentajeIgv,
          igv: itemIgv,
          tipAfeIgv: tipAfe,
          totalImpuestos: itemTotalImpuestos,
          mtoPrecioUnitario,
          ...(descuentoLinea ? {
            descuentos: [{
              codTipo: '00',
              montoBase: montoBaseDescuento!,
              factor: Number((descuentoLinea / montoBaseDescuento!).toFixed(10)),
              monto: descuentoLinea,
            }],
          } : {}),
        };
      });

      // Totales acumulados desde calculations.ts (recalculación defensiva SUNAT 3277)
      const totals = buildSunatPayloadTotals(detalles, discountAmount);

      return {
        details,
        mtoOperGravadas: totals.mtoOperGravadas,
        mtoOperExoneradas: totals.mtoOperExoneradas,
        mtoOperInafectas: totals.mtoOperInafectas,
        mtoIGV: totals.mtoIGV,
        totalImpuestos: totals.totalImpuestos,
        valorVenta: totals.valorVenta,
        subTotal: totals.subTotal,
        mtoImpVenta: totals.mtoImpVenta,
        mtoDescuentoGlobal: discountAmount > 0 ? discountAmount : undefined,
        totalDescuentos: discountAmount > 0 ? discountAmount : undefined,
        sumDsctoGlobal: discountAmount > 0 ? discountAmount : undefined,
        sumOtrosDescuentos: discountAmount > 0 ? discountAmount : undefined,
        descuentos: discountAmount > 0
          ? [{
              codTipo: descuentoGlobalCodigo,
              factor: Number((discountAmount / totals.subTotal).toFixed(10)),
              monto: discountAmount,
              montoBase: totals.subTotal,
              base: totals.subTotal,
            }]
          : undefined,
        legends: [
          { code: '1000', value: numeroALetras(totals.mtoImpVenta) },
          ...(comprobante.tipo_doc_codigo !== '07' && comprobante.detraccion_cod_bien ? [
            { code: '2006', value: 'Operación sujeta al Sistema de Pago de Obligaciones Tributarias con el Gobierno Central' },
            { code: '2006', value: `Bien o Servicio: ${comprobante.detraccion_cod_bien}${comprobante.detraccion_desc_bien ? '  ' + comprobante.detraccion_desc_bien : ''}` },
            { code: '2006', value: `Medio de pago: ${comprobante.detraccion_cod_medio_pago ?? '001'}  ${MEDIO_PAGO_DESC[comprobante.detraccion_cod_medio_pago ?? '001'] ?? ''}` },
            { code: '2006', value: `Nro. Cta. Banco de la Nación: ${comprobante.detraccion_cuenta_bn ?? ''}   Porcentaje de detracción: ${Number(comprobante.detraccion_porcentaje ?? 0).toFixed(2)}   Monto detracción: S/ ${Number(comprobante.detraccion_monto ?? 0).toFixed(2)}` },
          ] : []),
        ],
      };
    })(),
    // Detracción — solo se incluye cuando la operación está sujeta a detracción (nunca en NC)
    ...(comprobante.tipo_doc_codigo !== '07' && comprobante.detraccion_cod_bien ? {
      detraccion: {
        codBienDetraccion: comprobante.detraccion_cod_bien,
        codMedioPago: comprobante.detraccion_cod_medio_pago ?? '001',
        ctaBanco: comprobante.detraccion_cuenta_bn ?? '',
        percent: comprobante.detraccion_porcentaje ?? 0,
        mount: comprobante.detraccion_monto ?? 0,
        valueRef: comprobante.mto_imp_venta,
      } satisfies ApisPeruDetraccion,
    } : {}),
    // ─── Nota de Crédito — campos requeridos por SUNAT/ApisPeru ──
    ...(comprobante.tipo_doc_codigo === '07' && comprobanteReferenciado ? {
      codMotivo:      comprobante.tipo_nota_codigo!,
      desMotivo:      comprobante.motivo_nota!,
      tipDocAfectado: comprobanteReferenciado.tipo_doc_codigo,
      numDocfectado:  comprobanteReferenciado.serie_numero,
    } : {}),
  } as ApisPeruInvoicePayload;
}

// ─── Send to ApisPeru ────────────────────────────────────────

export async function sendInvoiceToApisPeru(
  payload: ApisPeruInvoicePayload,
): Promise<ApisPeruResponse> {
  const baseUrl = process.env.APISPERU_FACTURACION_URL;
  const token = process.env.APISPERU_FACTURACION_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Faltan variables APISPERU_FACTURACION_URL o APISPERU_FACTURACION_TOKEN');
  }

  // Normalizar URL base (quitar trailing slash)
  // NCs y NDs usan /note/send; facturas y boletas usan /invoice/send
  const path = ['07', '08'].includes(payload.tipoDoc) ? 'note/send' : 'invoice/send';
  const url = `${baseUrl.replace(/\/+$/, '')}/${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    // ApisPeru returns 400 for validation errors as an array
    if (response.status === 400 && Array.isArray(parsed)) {
      throw new Error(`Error de validación ApisPeru: ${parsed.map((e: { message?: string }) => e.message).join(', ')}`);
    }

    throw new Error(`ApisPeru respondió con status ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }

  return response.json();
}

// ─── Fetch PDF from ApisPeru ──────────────────────────────────

export async function getPdfFromApisPeru(payload: ApisPeruInvoicePayload): Promise<Buffer> {
  const baseUrl = process.env.APISPERU_FACTURACION_URL;
  const token = process.env.APISPERU_FACTURACION_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Faltan variables APISPERU_FACTURACION_URL o APISPERU_FACTURACION_TOKEN');
  }

  // NCs y NDs usan /note/pdf; facturas y boletas usan /invoice/pdf
  const pdfPath = ['07', '08'].includes(payload.tipoDoc) ? 'note/pdf' : 'invoice/pdf';
  const url = `${baseUrl.replace(/\/+$/, '')}/${pdfPath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error descargando PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
