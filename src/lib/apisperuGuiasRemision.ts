// Server-side only — import exclusively from API routes.

// ─── Types ───────────────────────────────────────────────────

export interface ApisPeruDespatchPayload {
  version: number;           // 2022
  tipoDoc: string;           // '09'
  serie: string;             // 'T001'
  correlativo: string;       // '00000001'
  fechaEmision: string;      // 'YYYY-MM-DD'
  company: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    address: {
      direccion: string;
      provincia: string;
      departamento: string;
      distrito: string;
      ubigueo: string;
    };
  };
  destinatario: {
    tipoDoc: string;
    numDoc: string;
    rznSocial: string;
  };
  observacion?: string;
  // docRelacionado movido a envio.relDoc en v2022
  envio: {
    codTraslado: string;
    desTraslado: string;
    modTraslado: string;
    fecTraslado: string;
    pesoTotal: number;
    undPesoTotal: string;
    relDoc?: {
      tipoDoc: string;
      nroDoc: string;
    };
    llegada: {
      ubigueo: string;
      direccion: string;
    };
    partida: {
      ubigueo: string;
      direccion: string;
    };
    transportista?: {
      tipoDoc: string;
      numDoc: string;
      rznSocial: string;
    };
    vehiculos?: {
      placa: string;
    }[];
    choferes?: {
      tipoDoc: string;
      numDoc: string;
      nombres?: string;
      apellidos?: string;
      licencia?: string;
    }[];
  };
  details: {
    cantidad: number;
    unidad: string;
    descripcion: string;
    codigo?: string;
  }[];
}

export interface ApisPeruDespatchResponse {
  success?: boolean;
  xml?: string;
  sunatResponse?: {
    success?: boolean;
    cdrZip?: string;
    cdrResponse?: {
      code?: string;
      description?: string;
    };
    error?: {
      message?: string;
    };
  };
  [key: string]: unknown;
}

// ─── Build payload ────────────────────────────────────────────

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
    // Modalidad 02 — vehículo propio
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
  };
  lineas: {
    descripcion: string;
    unidad_codigo: string;
    cantidad: number;
    codigo_producto: string | null;
  }[];
  motivoLabel: string;
}

export function buildDespatchPayload(params: BuildDespatchParams): ApisPeruDespatchPayload {
  const { guia, empresa, lineas, motivoLabel } = params;
  const today = new Date().toISOString();

  return {
    version: 2022,
    tipoDoc: '09',
    serie: guia.serie,
    correlativo: String(guia.correlativo).padStart(8, '0'),
    fechaEmision: (guia.fecha_emision || today).split('T')[0],
    company: {
      ruc: empresa.ruc,
      razonSocial: empresa.razon_social,
      nombreComercial: empresa.nombre_comercial ?? empresa.razon_social,
      address: {
        direccion: empresa.direccion ?? '',
        provincia: empresa.provincia ?? '',
        departamento: empresa.departamento ?? '',
        distrito: empresa.distrito ?? '',
        ubigueo: empresa.ubigueo ?? '',
      },
    },
    destinatario: {
      tipoDoc: guia.destinatario_tipo_doc,
      numDoc: guia.destinatario_num_doc,
      rznSocial: guia.destinatario_razon_social,
    },
    observacion: guia.observacion ?? undefined,
    envio: {
      codTraslado: guia.motivo_traslado_codigo,
      desTraslado: guia.motivo_traslado_desc ?? motivoLabel,
      modTraslado: guia.modalidad_traslado,
      fecTraslado: (guia.fecha_inicio_traslado || today).split('T')[0],
      pesoTotal: Number(guia.peso_bruto_total),
      undPesoTotal: 'KGM',
      relDoc: guia.tipo_doc_relacionado
        ? { tipoDoc: guia.tipo_doc_relacionado, nroDoc: guia.nro_doc_relacionado! }
        : undefined,
      llegada: {
        ubigueo: guia.dir_llegada_ubigueo,
        direccion: guia.dir_llegada_direccion,
      },
      partida: {
        ubigueo: guia.dir_partida_ubigueo,
        direccion: guia.dir_partida_direccion,
      },
      // Modalidad 01 (transporte público): datos del transportista tercero
      // Modalidad 02 (transporte privado): la empresa es su propio transportista
      transportista: guia.modalidad_traslado === '01' && guia.transportista_num_doc
        ? {
            tipoDoc: guia.transportista_tipo_doc ?? '6',
            numDoc: guia.transportista_num_doc,
            rznSocial: guia.transportista_razon_social ?? '',
          }
        : undefined,
      vehiculos: (() => {
        const placa = guia.modalidad_traslado === '01' ? guia.transportista_placa : guia.vehiculo_propio_placa;
        return placa ? [{ placa }] : undefined;
      })(),
      choferes: (() => {
        const tipoDoc = guia.modalidad_traslado === '01' ? (guia.conductor_tipo_doc ?? '1') : '1';
        const numDoc = guia.modalidad_traslado === '01' ? guia.conductor_num_doc : guia.vehiculo_propio_conductor_doc;
        const nombres = guia.modalidad_traslado === '01' ? (guia.conductor_nombres ?? 'CONDUCTOR') : (guia.vehiculo_propio_conductor_nombres ?? 'CONDUCTOR PROPIO');
        
        return numDoc ? [{
          tipoDoc,
          numDoc,
          nombres,
          apellidos: '-',
        }] : undefined;
      })(),
    },
    details: lineas.map(l => ({
      cantidad: Number(l.cantidad),
      unidad: l.unidad_codigo || 'NIU',
      descripcion: l.descripcion,
      codigo: l.codigo_producto ?? undefined,
    })),
  };
}

// ─── Send to ApisPeru ─────────────────────────────────────────

export async function sendDespatchToApisPeru(
  payload: ApisPeruDespatchPayload,
): Promise<ApisPeruDespatchResponse> {
  const baseUrl = process.env.APISPERU_FACTURACION_URL;
  const token = process.env.APISPERU_FACTURACION_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Faltan variables APISPERU_FACTURACION_URL o APISPERU_FACTURACION_TOKEN');
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/despatch/send`;
  


  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (response.status === 400 && Array.isArray(parsed)) {
      throw new Error(
        `Error de validación ApisPeru: ${(parsed as { message?: string }[]).map(e => e.message).join(', ')}`,
      );
    }

    throw new Error(
      `ApisPeru respondió con status ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
    );
  }

  return response.json();
}

export async function getDespatchPdfFromApisPeru(
  payload: ApisPeruDespatchPayload,
): Promise<Buffer> {
  const baseUrl = process.env.APISPERU_FACTURACION_URL;
  const token = process.env.APISPERU_FACTURACION_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Faltan variables APISPERU_FACTURACION_URL o APISPERU_FACTURACION_TOKEN');
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/despatch/pdf`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al obtener PDF de ApisPeru: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
