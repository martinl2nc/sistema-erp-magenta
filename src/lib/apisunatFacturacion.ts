/**
 * ApiSunat Facturación — Helper server-side
 * Mapea datos del comprobante al UBL JSON de ApiSunat y llama a la API.
 * ⚠️  Este archivo solo se importa en API Routes (server-side).
 */

import { numeroALetras } from '../utils/numeroALetras';
import { buildSunatPayloadTotals } from '../utils/calculations';
import { TAX_RATES } from '@/constants';

// ─── Constants ───────────────────────────────────────────────
const APISUNAT_BASE = 'https://back.apisunat.com';

// ─── Input Types ─────────────────────────────────────────────

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
  apisunat_persona_id: string;
  apisunat_persona_token: string;
}

export interface ComprobanteReferenciadoData {
  tipo_doc_codigo: string; // '01' | '03'
  serie_numero: string;    // ej: 'F001-00000123'
  fecha_emision: string;
}

export interface ApisunatDetraccion {
  codBienDetraccion: string;
  codMedioPago: string;
  ctaBanco: string;
  percent: number;
  mount: number;
  valueRef?: number;
}

// ─── ApiSunat Wire Types ──────────────────────────────────────

export interface ApisunatRequest {
  personaId: string;
  personaToken: string;
  fileName: string;
  documentBody: ApisunatInvoiceBody;
}

export interface ApisunatInvoiceBody {
  'cbc:UBLVersionID': { _text: string };
  'cbc:CustomizationID': { _text: string };
  'cbc:ID': { _text: string };
  'cbc:IssueDate': { _text: string };
  'cbc:IssueTime'?: { _text: string };
  'cbc:InvoiceTypeCode'?: {
    _attributes: { listID: string; listAgencyName: string; listName: string; listURI: string };
    _text: string;
  };
  'cbc:Note'?: Array<{ _attributes: { languageLocaleID: string }; _text: string }>;
  'cbc:DocumentCurrencyCode': { _text: string };
  'cac:DiscrepancyResponse'?: {
    'cbc:ReferenceID': { _text: string };
    'cbc:ResponseCode': { _text: string };
    'cbc:Description': { _text: string };
  };
  'cac:BillingReference'?: {
    'cac:InvoiceDocumentReference': {
      'cbc:ID': { _text: string };
      'cbc:DocumentTypeCode': { _text: string };
    };
  };
  'cac:Signature': ApisunatSignature;
  'cac:AccountingSupplierParty': ApisunatSupplierParty;
  'cac:AccountingCustomerParty': ApisunatCustomerParty;
  'cac:PaymentMeans'?: ApisunatPaymentMeans;
  'cac:PaymentTerms'?: ApisunatPaymentTerm[];
  'cac:AllowanceCharge'?: ApisunatHeaderAllowanceCharge[];
  'cac:TaxTotal': ApisunatTaxTotalHeader;
  'cac:LegalMonetaryTotal': ApisunatLegalMonetaryTotal;
  'cac:InvoiceLine': ApisunatInvoiceLine[];
}

export interface ApisunatSignature {
  'cbc:ID': { _text: string };
  'cac:SignatoryParty': {
    'cac:PartyIdentification': { 'cbc:ID': { _text: string } };
    'cac:PartyName': { 'cbc:Name': { _text: string } };
  };
  'cac:DigitalSignatureAttachment': {
    'cac:ExternalReference': { 'cbc:URI': { _text: string } };
  };
}

export interface ApisunatSupplierParty {
  'cac:Party': {
    'cac:PartyIdentification': {
      'cbc:ID': { _attributes: { schemeID: string }; _text: string };
    };
    'cac:PartyLegalEntity': {
      'cbc:RegistrationName': { _text: string };
      'cac:RegistrationAddress': {
        'cbc:AddressTypeCode': { _text: '0000' };
        'cac:AddressLine': { 'cbc:Line': { _text: string } };
      };
    };
  };
}

export interface ApisunatCustomerParty {
  'cac:Party': {
    'cac:PartyIdentification': {
      'cbc:ID': { _attributes: { schemeID: string }; _text: string };
    };
    'cac:PartyLegalEntity': {
      'cbc:RegistrationName': { _text: string };
      'cac:RegistrationAddress'?: {
        'cac:AddressLine': { 'cbc:Line': { _text: string } };
      };
    };
  };
}

export interface ApisunatPaymentMeans {
  'cbc:ID': { _text: string };
  'cbc:PaymentMeansCode': { _text: string };
  'cac:PayeeFinancialAccount': { 'cbc:ID': { _text: string } };
}

export interface ApisunatPaymentTerm {
  'cbc:ID': { _text: string };
  'cbc:PaymentMeansID'?: { _text: string };
  'cbc:PaymentPercent'?: { _text: number };
  'cbc:Amount'?: { _attributes: { currencyID: string }; _text: number };
  'cbc:PaymentDueDate'?: { _text: string };
}

export interface ApisunatHeaderAllowanceCharge {
  'cbc:ChargeIndicator': { _text: boolean };
  'cbc:AllowanceChargeReasonCode': { _text: string };
  'cbc:Amount': { _attributes: { currencyID: string }; _text: number };
  'cbc:BaseAmount': { _attributes: { currencyID: string }; _text: number };
}

export interface ApisunatLineAllowanceCharge {
  'cbc:ChargeIndicator': { _text: boolean };
  'cbc:AllowanceChargeReasonCode': { _text: string };
  'cbc:Amount': { _attributes: { currencyID: string }; _text: number };
}

export interface ApisunatTaxTotalHeader {
  'cbc:TaxAmount': { _attributes: { currencyID: string }; _text: number };
  'cac:TaxSubtotal': Array<{
    'cbc:TaxableAmount': { _attributes: { currencyID: string }; _text: number };
    'cbc:TaxAmount': { _attributes: { currencyID: string }; _text: number };
    'cac:TaxCategory': {
      'cac:TaxScheme': {
        'cbc:ID': { _text: string };
        'cbc:Name': { _text: string };
        'cbc:TaxTypeCode': { _text: string };
      };
    };
  }>;
}

export interface ApisunatTaxTotalLine {
  'cbc:TaxAmount': { _attributes: { currencyID: string }; _text: number };
  'cac:TaxSubtotal': {
    'cbc:TaxableAmount': { _attributes: { currencyID: string }; _text: number };
    'cbc:TaxAmount': { _attributes: { currencyID: string }; _text: number };
    'cac:TaxCategory': {
      'cbc:Percent': { _text: number };
      'cbc:TaxExemptionReasonCode': { _text: string };
      'cac:TaxScheme': {
        'cbc:ID': { _text: string };
        'cbc:Name': { _text: string };
        'cbc:TaxTypeCode': { _text: string };
      };
    };
  };
}

export interface ApisunatLegalMonetaryTotal {
  'cbc:LineExtensionAmount': { _attributes: { currencyID: string }; _text: number };
  'cbc:TaxInclusiveAmount': { _attributes: { currencyID: string }; _text: number };
  'cbc:AllowanceTotalAmount'?: { _attributes: { currencyID: string }; _text: number };
  'cbc:PayableAmount': { _attributes: { currencyID: string }; _text: number };
}

export interface ApisunatInvoiceLine {
  'cbc:ID': { _text: string };
  'cbc:InvoicedQuantity': {
    _attributes: { unitCode: string };
    _text: number;
  };
  'cbc:LineExtensionAmount': { _attributes: { currencyID: string }; _text: number };
  'cac:PricingReference': {
    'cac:AlternativeConditionPrice': {
      'cbc:PriceAmount': { _attributes: { currencyID: string }; _text: number };
      'cbc:PriceTypeCode': { _text: string };
    };
  };
  'cac:AllowanceCharge'?: ApisunatLineAllowanceCharge[];
  'cac:TaxTotal': ApisunatTaxTotalLine;
  'cac:Item': {
    'cbc:Description': { _text: string };
    'cac:SellersItemIdentification'?: { 'cbc:ID': { _text: string } };
  };
  'cac:Price': {
    'cbc:PriceAmount': { _attributes: { currencyID: string }; _text: number };
  };
}

export interface ApisunatResponse {
  documentId?: string;
  status?: string; // 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO'
  xml?: string;    // CDR zip URL (Azure Blob)
  sunatResponse?: {
    success?: boolean;
    cdrZip?: string;
    cdrResponse?: { code?: string; description?: string; notes?: string[] };
    error?: { code?: string; message?: string };
  };
}

export interface ApisunatPdfResult {
  buffer: Buffer;
  contentType: 'application/pdf';
}

// ─── Mapeo tipo_documento local → schemeID SUNAT ─────────────

function mapTipoDocCliente(tipo: string | null): string {
  if (!tipo) return '0';
  switch (tipo.toUpperCase()) {
    case 'RUC': return '6';
    case 'DNI': return '1';
    case 'CE': return '4';
    case 'PASAPORTE': return '7';
    default: return '0';
  }
}

// ─── Builders privados ───────────────────────────────────────

function buildFileName(
  ruc: string,
  tipoDoc: string,
  serie: string,
  numero: number,
): string {
  return `${ruc}-${tipoDoc}-${serie}-${String(numero).padStart(8, '0')}`;
}

function buildSignature(empresa: EmpresaData): ApisunatSignature {
  return {
    'cbc:ID': { _text: empresa.ruc },
    'cac:SignatoryParty': {
      'cac:PartyIdentification': { 'cbc:ID': { _text: empresa.ruc } },
      'cac:PartyName': { 'cbc:Name': { _text: empresa.razon_social } },
    },
    'cac:DigitalSignatureAttachment': {
      'cac:ExternalReference': { 'cbc:URI': { _text: `#SignatureKG${empresa.ruc}` } },
    },
  };
}

function buildSupplierParty(empresa: EmpresaData): ApisunatSupplierParty {
  return {
    'cac:Party': {
      'cac:PartyIdentification': {
        'cbc:ID': { _attributes: { schemeID: '6' }, _text: empresa.ruc },
      },
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': { _text: empresa.razon_social },
        'cac:RegistrationAddress': {
          'cbc:AddressTypeCode': { _text: '0000' },
          'cac:AddressLine': { 'cbc:Line': { _text: empresa.direccion ?? '-' } },
        },
      },
    },
  };
}

function buildCustomerParty(cliente: ClienteData): ApisunatCustomerParty {
  const schemeID = mapTipoDocCliente(cliente.tipo_documento);
  const numDoc = cliente.numero_documento ?? '00000000';
  const nombre = cliente.razon_social?.trim()
    || `${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`.trim()
    || 'CLIENTE GENÉRICO';

  const party: ApisunatCustomerParty = {
    'cac:Party': {
      'cac:PartyIdentification': {
        'cbc:ID': { _attributes: { schemeID }, _text: numDoc },
      },
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': { _text: nombre },
      },
    },
  };

  if (cliente.direccion) {
    party['cac:Party']['cac:PartyLegalEntity']['cac:RegistrationAddress'] = {
      'cac:AddressLine': { 'cbc:Line': { _text: cliente.direccion } },
    };
  }

  return party;
}

function buildHeaderTaxTotal(
  detalles: ComprobanteDetalle[],
  moneda: string,
): ApisunatTaxTotalHeader {
  // Sum from line-level rounded values to match exactly what SUNAT sees in each line
  const igvLines = detalles.filter(d => !['20', '21', '30', '31', '32', '33', '34', '35', '36'].includes(String(d.tip_afe_igv_codigo)));
  const totalBase = Number(igvLines.reduce((acc, d) => acc + Number(d.mto_base_igv.toFixed(2)), 0).toFixed(2));
  const totalIgv  = Number(igvLines.reduce((acc, d) => acc + Number(d.igv.toFixed(2)), 0).toFixed(2));

  return {
    'cbc:TaxAmount': { _attributes: { currencyID: moneda }, _text: totalIgv },
    'cac:TaxSubtotal': [
      {
        'cbc:TaxableAmount': { _attributes: { currencyID: moneda }, _text: totalBase },
        'cbc:TaxAmount': { _attributes: { currencyID: moneda }, _text: totalIgv },
        'cac:TaxCategory': {
          'cac:TaxScheme': {
            'cbc:ID': { _text: '1000' },
            'cbc:Name': { _text: 'IGV' },
            'cbc:TaxTypeCode': { _text: 'VAT' },
          },
        },
      },
    ],
  };
}

function buildLineTaxTotal(
  detalle: ComprobanteDetalle,
  moneda: string,
): ApisunatTaxTotalLine {
  const itemBase = Number(detalle.mto_base_igv.toFixed(2));
  const itemIgv = Number(detalle.igv.toFixed(2));
  const porcentajeIgv = Number(detalle.porcentaje_igv ?? (TAX_RATES.IGV * 100));
  const tipAfe = detalle.tip_afe_igv_codigo ? String(detalle.tip_afe_igv_codigo) : '10';

  // Determine tax scheme based on tipAfe
  let schemeId = '1000';
  let schemeName = 'IGV';
  let taxTypeCode = 'VAT';
  if (['20', '21'].includes(tipAfe)) {
    schemeId = '9997';
    schemeName = 'EXO';
    taxTypeCode = 'FRE';
  } else if (['30', '31', '32', '33', '34', '35', '36'].includes(tipAfe)) {
    schemeId = '9998';
    schemeName = 'INA';
    taxTypeCode = 'FRE';
  }

  return {
    'cbc:TaxAmount': { _attributes: { currencyID: moneda }, _text: itemIgv },
    'cac:TaxSubtotal': {
      'cbc:TaxableAmount': { _attributes: { currencyID: moneda }, _text: itemBase },
      'cbc:TaxAmount': { _attributes: { currencyID: moneda }, _text: itemIgv },
      'cac:TaxCategory': {
        'cbc:Percent': { _text: porcentajeIgv },
        'cbc:TaxExemptionReasonCode': { _text: tipAfe },
        'cac:TaxScheme': {
          'cbc:ID': { _text: schemeId },
          'cbc:Name': { _text: schemeName },
          'cbc:TaxTypeCode': { _text: taxTypeCode },
        },
      },
    },
  };
}

function buildLegalMonetaryTotal(
  comprobante: ComprobanteData,
  detalles: ComprobanteDetalle[],
  moneda: string,
  descuentoGlobal: number,
): ApisunatLegalMonetaryTotal {
  // Sum from line-level rounded values to match exactly what SUNAT sees in each InvoiceLine
  const lineExtension = Number(
    detalles.reduce((acc, d) => acc + Number(d.mto_base_igv.toFixed(2)), 0).toFixed(2)
  );
  // UBL 2.1 MonetaryTotalType order: LineExtensionAmount → TaxInclusiveAmount → AllowanceTotalAmount → PayableAmount
  return {
    'cbc:LineExtensionAmount': { _attributes: { currencyID: moneda }, _text: lineExtension },
    'cbc:TaxInclusiveAmount': { _attributes: { currencyID: moneda }, _text: Number(comprobante.mto_imp_venta.toFixed(2)) },
    ...(descuentoGlobal > 0 ? {
      'cbc:AllowanceTotalAmount': { _attributes: { currencyID: moneda }, _text: Number(descuentoGlobal.toFixed(2)) },
    } : {}),
    'cbc:PayableAmount': { _attributes: { currencyID: moneda }, _text: Number(comprobante.mto_imp_venta.toFixed(2)) },
  };
}

function buildPaymentTerms(
  comprobante: ComprobanteData,
  moneda: string,
): ApisunatPaymentTerm[] | undefined {
  // NC no tiene PaymentTerms
  if (comprobante.tipo_doc_codigo === '07') return undefined;

  const terms: ApisunatPaymentTerm[] = [];

  // Detracción va PRIMERO (SUNAT error 3127 si falta)
  if (comprobante.detraccion_cod_bien && comprobante.detraccion_porcentaje && comprobante.detraccion_monto) {
    terms.push({
      'cbc:ID': { _text: 'Detraccion' },
      'cbc:PaymentMeansID': { _text: comprobante.detraccion_cod_medio_pago ?? '001' },
      'cbc:PaymentPercent': { _text: Number(comprobante.detraccion_porcentaje) },
      'cbc:Amount': { _attributes: { currencyID: moneda }, _text: Number(comprobante.detraccion_monto.toFixed(2)) },
    });
  }

  if (comprobante.forma_pago === 'Credito' && comprobante.cuotas?.length) {
    const montoCredito = Number(
      (comprobante.mto_imp_venta - (comprobante.detraccion_monto ?? 0)).toFixed(2)
    );
    terms.push({
      'cbc:ID': { _text: 'FormaPago' },
      'cbc:PaymentMeansID': { _text: 'Credito' },
      'cbc:Amount': { _attributes: { currencyID: moneda }, _text: montoCredito },
    });
    comprobante.cuotas.forEach((cuota, idx) => {
      const cuotaId = `Cuota${String(idx + 1).padStart(3, '0')}`;
      terms.push({
        'cbc:ID': { _text: 'FormaPago' },
        'cbc:PaymentMeansID': { _text: cuotaId },
        'cbc:Amount': { _attributes: { currencyID: moneda }, _text: Number(cuota.monto.toFixed(2)) },
        'cbc:PaymentDueDate': { _text: cuota.fecha },
      });
    });
  } else {
    terms.push({
      'cbc:ID': { _text: 'FormaPago' },
      'cbc:PaymentMeansID': { _text: 'Contado' },
    });
  }

  return terms;
}

function buildPaymentMeans(
  comprobante: ComprobanteData,
): ApisunatPaymentMeans | undefined {
  if (!comprobante.detraccion_cod_bien || !comprobante.detraccion_cuenta_bn) return undefined;

  return {
    'cbc:ID': { _text: '999' },
    'cbc:PaymentMeansCode': { _text: '999' },
    'cac:PayeeFinancialAccount': { 'cbc:ID': { _text: comprobante.detraccion_cuenta_bn } },
  };
}

function buildHeaderAllowanceCharge(
  descuento: number,
  base: number,
  moneda: string,
): ApisunatHeaderAllowanceCharge[] | undefined {
  if (descuento <= 0) return undefined;
  return [
    {
      'cbc:ChargeIndicator': { _text: false },
      'cbc:AllowanceChargeReasonCode': { _text: '00' },
      'cbc:Amount': { _attributes: { currencyID: moneda }, _text: Number(descuento.toFixed(2)) },
      'cbc:BaseAmount': { _attributes: { currencyID: moneda }, _text: Number(base.toFixed(2)) },
    },
  ];
}

function buildLineAllowanceCharge(
  descuento: number,
  moneda: string,
): ApisunatLineAllowanceCharge[] | undefined {
  if (descuento <= 0) return undefined;
  return [
    {
      'cbc:ChargeIndicator': { _text: false },
      'cbc:AllowanceChargeReasonCode': { _text: '00' },
      'cbc:Amount': { _attributes: { currencyID: moneda }, _text: Number(descuento.toFixed(2)) },
    },
  ];
}

function buildNotes(comprobante: ComprobanteData, montoImpVenta: number): Array<{ _attributes: { languageLocaleID: string }; _text: string }> {
  const notes: Array<{ _attributes: { languageLocaleID: string }; _text: string }> = [
    { _attributes: { languageLocaleID: '1000' }, _text: numeroALetras(montoImpVenta) },
  ];

  if (comprobante.detraccion_cod_bien) {
    notes.push({
      _attributes: { languageLocaleID: '2006' },
      _text: 'Operación sujeta al Sistema de Pago de Obligaciones Tributarias con el Gobierno Central',
    });
  }

  return notes;
}

function buildInvoiceLines(
  detalles: ComprobanteDetalle[],
  moneda: string,
  isNC: boolean,
): ApisunatInvoiceLine[] {
  return detalles.map((d, idx) => {
    const itemBase = Number(d.mto_base_igv.toFixed(2));
    const factorImpuesto = (Number(d.porcentaje_igv ?? (TAX_RATES.IGV * 100)) / 100) + 1;

    // Para NCs: normalizar para evitar error 3271
    const mtoValorUnitario = isNC
      ? Number((itemBase / d.cantidad).toFixed(10))
      : d.mto_valor_unitario;

    const grossValue = Number((mtoValorUnitario * d.cantidad).toFixed(2));
    const explicitDiscount = d.descuento && d.descuento > 0 ? Number(d.descuento.toFixed(2)) : 0;
    const impliedDiscount = Number((grossValue - itemBase).toFixed(2));
    const descuentoLinea = explicitDiscount > 0
      ? explicitDiscount
      : (impliedDiscount > 0.005 ? impliedDiscount : 0);

    const mtoPrecioUnitario = Number(((itemBase / d.cantidad) * factorImpuesto).toFixed(10));

    const allowance = buildLineAllowanceCharge(descuentoLinea, moneda);
    const codProducto = d.cod_producto;

    const item: ApisunatInvoiceLine['cac:Item'] = {
      'cbc:Description': { _text: d.descripcion },
    };
    if (codProducto && codProducto !== '-') {
      item['cac:SellersItemIdentification'] = { 'cbc:ID': { _text: codProducto } };
    }

    // UBL 2.1 strict element order: ID → InvoicedQuantity → LineExtensionAmount →
    // PricingReference → AllowanceCharge → TaxTotal → Item → Price
    const line: ApisunatInvoiceLine = {
      'cbc:ID': { _text: String(idx + 1) },
      'cbc:InvoicedQuantity': {
        _attributes: { unitCode: d.unidad_codigo || 'NIU' },
        _text: d.cantidad,
      },
      'cbc:LineExtensionAmount': { _attributes: { currencyID: moneda }, _text: itemBase },
      'cac:PricingReference': {
        'cac:AlternativeConditionPrice': {
          'cbc:PriceAmount': { _attributes: { currencyID: moneda }, _text: Number(mtoPrecioUnitario.toFixed(10)) },
          'cbc:PriceTypeCode': { _text: '01' },
        },
      },
      ...(allowance ? { 'cac:AllowanceCharge': allowance } : {}),
      'cac:TaxTotal': buildLineTaxTotal(d, moneda),
      'cac:Item': item,
      'cac:Price': {
        'cbc:PriceAmount': { _attributes: { currencyID: moneda }, _text: Number(mtoValorUnitario.toFixed(10)) },
      },
    };

    return line;
  });
}

// ─── Build payload (pública, pure function) ──────────────────

export function buildInvoicePayload(
  comprobante: ComprobanteData,
  detalles: ComprobanteDetalle[],
  cliente: ClienteData,
  empresa: EmpresaData,
  comprobanteReferenciado?: ComprobanteReferenciadoData | null,
): ApisunatRequest {
  if (comprobante.tipo_doc_codigo === '07') {
    if (!comprobanteReferenciado) throw new Error('Nota de crédito sin comprobante de referencia');
    if (!comprobante.motivo_nota || !comprobante.tipo_nota_codigo) throw new Error('NC sin motivo o tipo_nota_codigo');
  }

  const moneda = comprobante.tipo_moneda || 'PEN';
  const isNC = comprobante.tipo_doc_codigo === '07';
  const discountAmount = isNC ? 0 : Number((comprobante.descuento_global_monto || 0).toFixed(2));

  const totals = buildSunatPayloadTotals(detalles, discountAmount);
  const fileName = buildFileName(empresa.ruc, comprobante.tipo_doc_codigo, comprobante.serie, comprobante.correlativo);
  const docId = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
  const fechaEmision = comprobante.fecha_emision.split('T')[0];

  const body: ApisunatInvoiceBody = {
    'cbc:UBLVersionID': { _text: '2.1' },
    'cbc:CustomizationID': { _text: '2.0' },
    'cbc:ID': { _text: docId },
    'cbc:IssueDate': { _text: fechaEmision },
    'cbc:IssueTime': { _text: '00:00:00' },
    'cbc:DocumentCurrencyCode': { _text: moneda },
    'cac:Signature': buildSignature(empresa),
    'cac:AccountingSupplierParty': buildSupplierParty(empresa),
    'cac:AccountingCustomerParty': buildCustomerParty(cliente),
    'cac:TaxTotal': buildHeaderTaxTotal(detalles, moneda),
    'cac:LegalMonetaryTotal': buildLegalMonetaryTotal(comprobante, detalles, moneda, discountAmount),
    'cac:InvoiceLine': buildInvoiceLines(detalles, moneda, isNC),
  };

  // InvoiceTypeCode: solo facturas (01) y boletas (03), no NC
  if (!isNC) {
    body['cbc:InvoiceTypeCode'] = {
      _attributes: {
        listID: comprobante.tipo_operacion || '0101',
        listAgencyName: 'PE:SUNAT',
        listName: 'Tipo de Documento',
        listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
      },
      _text: comprobante.tipo_doc_codigo,
    };
  }

  // Notes: monto en letras + detracción
  const notes = buildNotes(comprobante, totals.mtoImpVenta);
  if (notes.length) body['cbc:Note'] = notes;

  // PaymentTerms (no en NC)
  const paymentTerms = buildPaymentTerms(comprobante, moneda);
  if (paymentTerms) body['cac:PaymentTerms'] = paymentTerms;

  // PaymentMeans (solo si hay detracción, no en NC)
  if (!isNC) {
    const paymentMeans = buildPaymentMeans(comprobante);
    if (paymentMeans) body['cac:PaymentMeans'] = paymentMeans;
  }

  // Descuento global header (no en NC)
  if (!isNC && discountAmount > 0) {
    const allowance = buildHeaderAllowanceCharge(discountAmount, totals.subTotal, moneda);
    if (allowance) body['cac:AllowanceCharge'] = allowance;
  }

  // NC fields
  if (isNC && comprobanteReferenciado) {
    body['cac:DiscrepancyResponse'] = {
      'cbc:ReferenceID': { _text: comprobanteReferenciado.serie_numero },
      'cbc:ResponseCode': { _text: comprobante.tipo_nota_codigo! },
      'cbc:Description': { _text: comprobante.motivo_nota! },
    };
    body['cac:BillingReference'] = {
      'cac:InvoiceDocumentReference': {
        'cbc:ID': { _text: comprobanteReferenciado.serie_numero },
        'cbc:DocumentTypeCode': { _text: comprobanteReferenciado.tipo_doc_codigo },
      },
    };
  }

  return {
    personaId: empresa.apisunat_persona_id.trim(),
    personaToken: empresa.apisunat_persona_token.trim(),
    fileName,
    documentBody: body,
  };
}

// ─── Send to ApiSunat ────────────────────────────────────────

export async function sendInvoiceToApisunat(
  payload: ApisunatRequest,
): Promise<ApisunatResponse> {
  const url = `${APISUNAT_BASE}/personas/v1/sendBill`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    throw new Error(
      `ApiSunat respondió con status ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
    );
  }

  return response.json() as Promise<ApisunatResponse>;
}

// ─── Fetch PDF from ApiSunat ──────────────────────────────────

export async function getInvoicePdfFromApisunat(
  documentId: string,
  fileName: string,
  auth: { personaId: string; personaToken: string },
): Promise<ApisunatPdfResult> {
  const url = `${APISUNAT_BASE}/documents/${documentId}/getPDF/A4/${fileName}.pdf`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'personaId': auth.personaId,
      'personaToken': auth.personaToken,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error descargando PDF desde ApiSunat (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: 'application/pdf',
  };
}

// Helper re-exportado para que los routes puedan reconstruir el fileName sin importar buildInvoicePayload
export { buildFileName as buildInvoiceFileName };
