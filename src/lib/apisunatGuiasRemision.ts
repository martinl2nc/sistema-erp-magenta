/**
 * ApiSunat Guías de Remisión — Helper server-side
 * Mapea datos de la guía al UBL JSON DespatchAdvice de ApiSunat y llama a la API.
 * Solo se importa en API Routes (server-side).
 */

import {
  sendInvoiceToApisunat,
  getInvoicePdfFromApisunat,
  type ApisunatResponse,
  type ApisunatPdfResult,
  type EmpresaData,
  type ClienteData,
} from './apisunatFacturacion';

// Re-exportar tipos compartidos
export type { EmpresaData, ClienteData };

// ─── Input types ─────────────────────────────────────────────────────────────

export interface BuildDespatchParams {
  guia: {
    serie: string;
    correlativo: number;
    fecha_emision: string;
    fecha_inicio_traslado: string;
    observacion: string | null;
    tipo_doc_relacionado: string | null;
    nro_doc_relacionado: string | null;
    destinatario_tipo_doc: string;
    destinatario_num_doc: string;
    destinatario_razon_social: string;
    dir_llegada_ubigueo: string;
    dir_llegada_direccion: string;
    dir_partida_ubigueo: string;
    dir_partida_direccion: string;
    motivo_traslado_codigo: string;
    motivo_traslado_desc: string | null;
    modalidad_traslado: string;
    peso_bruto_total: number;
    unidad_peso: string;
    transportista_tipo_doc: string | null;
    transportista_num_doc: string | null;
    transportista_razon_social: string | null;
    transportista_placa: string | null;
    conductor_tipo_doc: string | null;
    conductor_num_doc: string | null;
    conductor_nombres: string | null;
    vehiculo_propio_placa: string | null;
    vehiculo_propio_conductor_doc: string | null;
    vehiculo_propio_conductor_nombres: string | null;
  };
  empresa: {
    ruc: string;
    razon_social: string;
    nombre_comercial: string | null;
    direccion: string | null;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    ubigueo: string | null;
    apisunat_persona_id: string;
    apisunat_persona_token: string;
  };
  lineas: {
    descripcion: string;
    unidad_codigo: string;
    cantidad: number;
    codigo_producto: string | null;
  }[];
  motivoLabel: string;
}

export interface ApisunatDespatchRequest {
  personaId: string;
  personaToken: string;
  fileName: string;
  documentBody: object;
}

export interface ApisunatDespatchResponse {
  documentId?: string;
  sunatResponse?: {
    success?: boolean;
    cdrZip?: string;
    cdrResponse?: { code?: string; description?: string };
    error?: { code?: string; message?: string };
  };
  xml?: string;
  ticket?: string;
}

// Re-exportar para routes
export type { ApisunatResponse, ApisunatPdfResult };

// ─── Helpers privados ─────────────────────────────────────────────────────────

function buildDespatchFileName(ruc: string, serie: string, numero: number): string {
  return `${ruc}-09-${serie}-${String(numero).padStart(8, '0')}`;
}

function buildDespatchSupplierParty(params: BuildDespatchParams): object {
  return {
    'cbc:CustomerAssignedAccountID': {
      _attributes: { schemeID: '6' },
      _text: params.empresa.ruc,
    },
    'cac:Party': {
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': { _text: params.empresa.razon_social },
      },
    },
  };
}

function buildDespatchCustomerParty(params: BuildDespatchParams): object {
  const { guia } = params;
  return {
    'cbc:CustomerAssignedAccountID': {
      _attributes: { schemeID: guia.destinatario_tipo_doc === 'RUC' ? '6' : '1' },
      _text: guia.destinatario_num_doc,
    },
    'cac:Party': {
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': { _text: guia.destinatario_razon_social },
      },
    },
  };
}

function buildShipmentStage(params: BuildDespatchParams): object {
  const { guia } = params;
  const fechaTraslado = (guia.fecha_inicio_traslado || guia.fecha_emision).split('T')[0];

  if (guia.modalidad_traslado === '01') {
    // Transporte público — incluye CarrierParty, NO TransportMeans ni DriverPerson
    return {
      'cbc:TransportModeCode': { _text: '01' },
      'cac:TransitPeriod': {
        'cbc:StartDate': { _text: fechaTraslado },
      },
      ...(guia.transportista_num_doc
        ? {
            'cac:CarrierParty': {
              'cac:PartyIdentification': {
                'cbc:ID': {
                  _attributes: { schemeID: '6' },
                  _text: guia.transportista_num_doc,
                },
              },
              'cac:PartyName': {
                'cbc:Name': { _text: guia.transportista_razon_social ?? '' },
              },
            },
          }
        : {}),
    };
  }

  // Modalidad 02 — transporte privado — incluye TransportMeans + DriverPerson, NO CarrierParty
  const placa = guia.vehiculo_propio_placa ?? guia.transportista_placa ?? '';
  const conductorDoc = guia.vehiculo_propio_conductor_doc ?? guia.conductor_num_doc;
  const conductorTipoDoc = guia.conductor_tipo_doc ?? '1';

  return {
    'cbc:TransportModeCode': { _text: '02' },
    'cac:TransitPeriod': {
      'cbc:StartDate': { _text: fechaTraslado },
    },
    ...(placa
      ? {
          'cac:TransportMeans': {
            'cac:RoadTransport': {
              'cbc:LicensePlateID': { _text: placa },
            },
          },
        }
      : {}),
    ...(conductorDoc
      ? {
          'cac:DriverPerson': {
            'cbc:ID': {
              _attributes: { schemeID: conductorTipoDoc },
              _text: conductorDoc,
            },
          },
        }
      : {}),
  };
}

function buildShipment(params: BuildDespatchParams): object {
  const { guia } = params;

  return {
    'cbc:ID': { _text: '1' },
    'cbc:HandlingCode': { _text: guia.motivo_traslado_codigo },
    'cbc:GrossWeightMeasure': {
      _attributes: { unitCode: 'KGM' },
      _text: Number(guia.peso_bruto_total),
    },
    'cac:ShipmentStage': buildShipmentStage(params),
    'cac:Delivery': {
      'cac:DeliveryAddress': {
        'cbc:ID': { _text: guia.dir_llegada_ubigueo },
        'cbc:StreetName': { _text: guia.dir_llegada_direccion },
      },
    },
    'cac:OriginAddress': {
      'cbc:ID': { _text: guia.dir_partida_ubigueo },
      'cbc:StreetName': { _text: guia.dir_partida_direccion },
    },
  };
}

function buildDespatchLines(
  lineas: BuildDespatchParams['lineas'],
): object[] {
  return lineas.map((l, idx) => {
    const codProducto = l.codigo_producto && l.codigo_producto !== '-' ? l.codigo_producto : null;

    return {
      'cbc:ID': { _text: idx + 1 },
      'cbc:DeliveredQuantity': {
        _attributes: { unitCode: l.unidad_codigo || 'NIU' },
        _text: Number(l.cantidad),
      },
      'cac:Item': {
        'cbc:Name': { _text: l.descripcion },
        ...(codProducto
          ? { 'cac:SellersItemIdentification': { 'cbc:ID': { _text: codProducto } } }
          : {}),
      },
    };
  });
}

// ─── Public functions ─────────────────────────────────────────────────────────

export function buildDespatchPayload(params: BuildDespatchParams): ApisunatDespatchRequest {
  const { guia, empresa } = params;
  const fechaEmision = (guia.fecha_emision || new Date().toISOString()).split('T')[0];
  const fileName = buildDespatchFileName(empresa.ruc, guia.serie, guia.correlativo);

  const documentBody = {
    'cbc:UBLVersionID': { _text: '2.1' },
    'cbc:CustomizationID': { _text: '2.0' },
    'cbc:ID': { _text: `${guia.serie}-${String(guia.correlativo).padStart(8, '0')}` },
    'cbc:IssueDate': { _text: fechaEmision },
    'cbc:DespatchAdviceTypeCode': { _text: '09' },
    ...(guia.observacion ? { 'cbc:Note': { _text: guia.observacion } } : {}),
    'cac:DespatchSupplierParty': buildDespatchSupplierParty(params),
    'cac:DeliveryCustomerParty': buildDespatchCustomerParty(params),
    'cac:Shipment': buildShipment(params),
    'cac:DespatchLine': buildDespatchLines(params.lineas),
  };

  return {
    personaId: empresa.apisunat_persona_id.trim(),
    personaToken: empresa.apisunat_persona_token.trim(),
    fileName,
    documentBody,
  };
}

export async function sendDespatchToApisunat(
  payload: ApisunatDespatchRequest,
): Promise<ApisunatDespatchResponse> {
  // ApiSunat usa el mismo endpoint para todos los documentos
  const response = await sendInvoiceToApisunat(payload as Parameters<typeof sendInvoiceToApisunat>[0]);
  return response as ApisunatDespatchResponse;
}

export async function getDespatchPdfFromApisunat(
  documentId: string,
  fileName: string,
  auth: { personaId: string; personaToken: string },
): Promise<ApisunatPdfResult> {
  return getInvoicePdfFromApisunat(documentId, fileName, auth);
}
