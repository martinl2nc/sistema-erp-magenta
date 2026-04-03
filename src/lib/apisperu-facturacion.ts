/**
 * ApisPeru Facturación — Helper server-side
 * Mapea datos del comprobante al JSON de ApisPeru y llama a la API.
 * ⚠️  Este archivo solo se importa en API Routes (server-side).
 */

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
}

export interface ApisPeruResponse {
  success?: boolean;
  error?: string | any;
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

import { numeroALetras } from '../utils/numeroALetras';

export function buildInvoicePayload(
  comprobante: ComprobanteData,
  detalles: ComprobanteDetalle[],
  cliente: ClienteData,
  empresa: EmpresaData,
): ApisPeruInvoicePayload {
  const clientName = cliente.razon_social?.trim()
    || `${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`.trim()
    || 'CLIENTE GENÉRICO';

  // Usar leyendas configuradas o generar la leyenda 1000 por defecto
  const amountInWords = numeroALetras(comprobante.mto_imp_venta);
  const legends = comprobante.leyendas || [
    { code: "1000", value: amountInWords }
  ];

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
    // ─── RECALCULACIÓN DEFENSIVA PARA EVITAR ERROR SUNAT 3277 ─────
    // Sumamos los totales directamente desde el detalle para garantizar consistencia.
    ...(() => {
      let mtoOperGravadas = 0;
      let mtoOperExoneradas = 0;
      let mtoOperInafectas = 0;
      let mtoIGV = 0;
      let totalImpuestos = 0;
      let valorVentaTotal = 0;

      const items = detalles.map((d) => {
        const itemIgv = Number(d.igv.toFixed(2));
        const itemBase = Number(d.mto_base_igv.toFixed(2));
        const itemTotalImpuestos = Number(d.total_impuestos.toFixed(2));

        // Acumular según afectación (Catálogo 07)
        const tipAfe = d.tip_afe_igv_codigo ? String(d.tip_afe_igv_codigo) : '10';
        if (tipAfe === '10' || tipAfe === '11' || tipAfe === '12' || tipAfe === '17') {
          mtoOperGravadas = Number((mtoOperGravadas + itemBase).toFixed(2));
        } else if (tipAfe === '20' || tipAfe === '21') {
          mtoOperExoneradas = Number((mtoOperExoneradas + itemBase).toFixed(2));
        } else {
          mtoOperInafectas = Number((mtoOperInafectas + itemBase).toFixed(2));
        }

        mtoIGV = Number((mtoIGV + itemIgv).toFixed(2));
        totalImpuestos = Number((totalImpuestos + itemTotalImpuestos).toFixed(2));
        valorVentaTotal = Number((valorVentaTotal + itemBase).toFixed(2)); // SUNAT: LineExtensionAmount sum

        const porcentajeIgv = Number(d.porcentaje_igv ?? 18);
        const factorImpuesto = (porcentajeIgv / 100) + 1;

        return {
          codProducto: d.cod_producto || '-',
          unidad: d.unidad_codigo || 'NIU',
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          mtoValorUnitario: d.mto_valor_unitario,
          mtoValorVenta: itemBase, // SUNAT espera Base en valorVenta de línea
          mtoBaseIgv: itemBase,
          porcentajeIgv: porcentajeIgv,
          igv: itemIgv,
          tipAfeIgv: tipAfe,
          totalImpuestos: itemTotalImpuestos,
          mtoPrecioUnitario: Number((d.mto_valor_unitario * factorImpuesto).toFixed(10)),
        };
      });

      const subtotalConImpuestos = Number((valorVentaTotal + mtoIGV).toFixed(2));
      const discountAmount = Number((comprobante.descuento_global_monto || 0).toFixed(2));
      const descuentoGlobalCodigo = comprobante.descuento_global_codigo || '03';
      const totalFinal = Number((subtotalConImpuestos - discountAmount).toFixed(2));

      return {
        details: items,
        mtoOperGravadas,
        mtoOperExoneradas,
        mtoOperInafectas,
        mtoIGV,
        totalImpuestos,
        valorVenta: valorVentaTotal,
        subTotal: subtotalConImpuestos,
        mtoImpVenta: totalFinal,
        mtoDescuentoGlobal: discountAmount > 0 ? discountAmount : undefined,
        totalDescuentos: discountAmount > 0 ? discountAmount : undefined,
        sumDsctoGlobal: discountAmount > 0 ? discountAmount : undefined,
        sumOtrosDescuentos: discountAmount > 0 ? discountAmount : undefined, // Suma de todos los descuentos (ítem + global)
        descuentos: discountAmount > 0 
          ? [{
              codTipo: descuentoGlobalCodigo, // '02' o '03' según la BD
              factor: Number((discountAmount / subtotalConImpuestos).toFixed(10)),
              monto: discountAmount,
              montoBase: subtotalConImpuestos,
              base: subtotalConImpuestos,
            }]
          : undefined,
      };
    })(),
    legends: [
      {
        code: '1000',
        value: numeroALetras((() => {
          const mtoIGV = detalles.reduce((acc, d) => acc + d.igv, 0);
          const valorVentaTotal = detalles.reduce((acc, d) => acc + d.mto_base_igv, 0);
          const subtotalConImpuestos = Number((valorVentaTotal + mtoIGV).toFixed(2));
          return Number((subtotalConImpuestos - (comprobante.descuento_global_monto || 0)).toFixed(2));
        })())
      },
    ],
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
