/**
 * ApisPeru Facturación — Helper server-side
 * Mapea datos del comprobante al JSON de ApisPeru y llama a la API.
 * ⚠️  Este archivo solo se importa en API Routes (server-side).
 */

import { numeroALetras } from '../utils/numeroALetras';
import { buildSunatPayloadTotals } from '../utils/calculations';

// ─── Types ───────────────────────────────────────────────────

export interface ApisPeruInvoicePayload {
  ublVersion: string;
  tipoOperacion: string;
  tipoDoc: string;
  serie: string;
  correlativo: string;
  fechaEmision: string;
  tipoMoneda: string;
  formaPago: { moneda: string; tipo: string };
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
): ApisPeruInvoicePayload {
  const clientName = cliente.razon_social?.trim()
    || `${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`.trim()
    || 'CLIENTE GENÉRICO';

  return {
    ublVersion: '2.1',
    tipoOperacion: comprobante.tipo_operacion || '0101',
    tipoDoc: comprobante.tipo_doc_codigo,
    serie: comprobante.serie,
    correlativo: String(comprobante.correlativo),
    fechaEmision: comprobante.fecha_emision.split('T')[0] + 'T00:00:00-05:00',
    tipoMoneda: comprobante.tipo_moneda || 'PEN',
    formaPago: {
      moneda: comprobante.tipo_moneda || 'PEN',
      tipo: comprobante.forma_pago === 'Credito' ? 'Credito' : 'Contado',
    },
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
      const discountAmount = Number((comprobante.descuento_global_monto || 0).toFixed(2));
      const descuentoGlobalCodigo = comprobante.descuento_global_codigo || '03';

      // Map items — data transformation only, no financial accumulation
      const details = detalles.map((d) => {
        const itemBase = Number(d.mto_base_igv.toFixed(2));
        const itemIgv = Number(d.igv.toFixed(2));
        const itemTotalImpuestos = Number(d.total_impuestos.toFixed(2));
        const tipAfe = d.tip_afe_igv_codigo ? String(d.tip_afe_igv_codigo) : '10';
        const porcentajeIgv = Number(d.porcentaje_igv ?? 18);
        const factorImpuesto = (porcentajeIgv / 100) + 1;

        // Detectar descuento de línea: explícito o implícito
        // cuando mtoValorUnitario × cantidad > itemBase (genera cac:AllowanceCharge, evita error 3271)
        const grossValue = Number((d.mto_valor_unitario * d.cantidad).toFixed(2));
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
          mtoValorUnitario: d.mto_valor_unitario,
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
        legends: [{ code: '1000', value: numeroALetras(totals.mtoImpVenta) }],
      };
    })(),
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
  const url = `${baseUrl.replace(/\/+$/, '')}/invoice/send`;

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

  const url = `${baseUrl.replace(/\/+$/, '')}/invoice/pdf`;

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
