# PRD — Migración de Proveedor de Facturación: ApisPeru → ApiSunat

**Fecha:** 2026-04-25  
**Estado:** Borrador  
**Proyecto:** sistema-cotizaciones-v2 (fork dedicado a migración)

---

## 1. Contexto y Objetivo

El sistema actualmente usa **ApisPeru** como intermediario para emitir comprobantes electrónicos a SUNAT (facturas, boletas, notas de crédito y guías de remisión). Se requiere migrar al proveedor **ApiSunat** (`https://back.apisunat.com`) manteniendo paridad funcional completa.

La migración se ejecutará en un **fork del proyecto** con una **base de datos duplicada**, lo que permite desarrollo y pruebas sin afectar producción.

### Objetivo principal

Reemplazar los módulos `apisperuFacturacion.ts` y `apisperuGuiasRemision.ts` por equivalentes de ApiSunat, sin modificar la lógica de negocio, la base de datos, ni la UI.

---

## 2. Scope

### Incluido

- [ ] Migración de emisión de **Facturas (tipoDoc 01)**
- [ ] Migración de emisión de **Boletas (tipoDoc 03)**
- [ ] Migración de emisión de **Notas de Crédito (tipoDoc 07)**
- [ ] Migración de emisión de **Guías de Remisión (tipoDoc 09)**
- [ ] Soporte de **Detracción** en facturas
- [ ] Soporte de **Forma de pago a crédito con cuotas**
- [ ] Descarga de **PDF** (pendiente confirmar endpoint ApiSunat)
- [ ] Descarga de **XML**
- [ ] Recepción y almacenamiento de **CDR de SUNAT**
- [ ] Actualización de variables de entorno

### Excluido

- Cambios en la base de datos (tablas, RLS, RPCs)
- Cambios en la UI / componentes React
- Cambios en hooks de TanStack Query
- Cambios en servicios (`*.service.ts`)
- Migración de comprobantes ya emitidos con ApisPeru

---

## 3. Diferencias Arquitectónicas: ApisPeru vs ApiSunat

| Aspecto | ApisPeru (actual) | ApiSunat (nuevo) |
|---------|-------------------|------------------|
| Base URL | `APISPERU_FACTURACION_URL` (env var) | `https://back.apisunat.com` |
| Autenticación | `Authorization: Bearer token` en header | `personaId` + `personaToken` en el body |
| Endpoints | `/invoice/send`, `/note/send`, `/despatch/send` | **Un solo endpoint**: `POST /personas/v1/sendBill` |
| PDF | `/invoice/pdf`, `/note/pdf`, `/despatch/pdf` | Por confirmar con ApiSunat |
| Schema del payload | JSON plano propio de ApisPeru | UBL 2.1 XML convertido a JSON (namespaced) |
| `fileName` | No existe | `RUC-TipoDoc-Serie-Correlativo` (ej: `20123456789-01-F001-00000001`) |
| Wrapper | No — payload directo | `{ personaId, personaToken, fileName, documentBody }` |
| Schema `documentBody` | Campos tipo `tipoDoc`, `mtoIGV`, `serie` | Campos UBL tipo `cbc:UBLVersionID`, `cac:TaxTotal` con patrón `{ "_text": valor }` |

---

## 4. Variables de Entorno

### Actuales (ApisPeru) — eliminar
```
APISPERU_FACTURACION_URL=
APISPERU_FACTURACION_TOKEN=
```

### Nuevas (ApiSunat) — agregar
```
APISUNAT_PERSONA_ID=        # ID único de empresa en ApiSunat
APISUNAT_PERSONA_TOKEN=     # Token por ambiente (DEV_... o PROD_...)
```

---

## 5. Archivos a Crear / Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/apisunatFacturacion.ts` | Crear | Builder + send para facturas, boletas y NCs |
| `src/lib/apisunatGuiasRemision.ts` | Crear | Builder + send para guías de remisión |
| `src/lib/apisperuFacturacion.ts` | Eliminar | Ya no se usa |
| `src/lib/apisperuGuiasRemision.ts` | Eliminar | Ya no se usa |
| `src/app/api/facturacion/emitir/route.ts` | Modificar | Cambiar imports + env vars |
| `src/app/api/notas-credito/emitir/route.ts` | Modificar | Cambiar imports + env vars |
| `src/app/api/guias-remision/emitir/route.ts` | Modificar | Cambiar imports + env vars |
| `.env.local` | Modificar | Reemplazar vars ApisPeru por ApiSunat |

---

## 6. Especificación del Payload ApiSunat

### 6.1 Wrapper (todos los documentos)

```typescript
interface ApisunatRequest {
  personaId: string;           // process.env.APISUNAT_PERSONA_ID
  personaToken: string;        // process.env.APISUNAT_PERSONA_TOKEN
  fileName: string;            // `${empresa.ruc}-${tipoDoc}-${serie}-${correlativo padStart 8}`
  documentBody: ApisunatDocumentBody;
  customerEmail?: string;      // opcional
}
```

**fileName format:** `20123456789-01-F001-00000001`
- `RUC` — 11 dígitos
- `TipoDoc` — 2 dígitos (`01`, `03`, `07`, `09`)
- `Serie` — 4 chars (`F001`, `B001`, `FC01`, `T001`)
- `Correlativo` — 8 dígitos con ceros a la izquierda

---

### 6.2 Factura / Boleta — documentBody

```typescript
interface ApisunatInvoiceBody {
  "cbc:UBLVersionID":        { _text: "2.1" };
  "cbc:CustomizationID":     { _text: "2.0" };
  "cbc:ID":                  { _text: string };           // "F001-00000001"
  "cbc:IssueDate":           { _text: string };           // "YYYY-MM-DD"
  "cbc:IssueTime":           { _text: string };           // "HH:MM:SS"
  "cbc:DueDate"?:            { _text: string };           // solo si tiene vencimiento
  "cbc:InvoiceTypeCode": {
    _attributes: { listID: string };                      // tipoOperacion ej: "0101"
    _text: string;                                        // tipoDoc: "01" | "03"
  };
  "cbc:Note": Array<{
    _text: string;
    _attributes: { languageLocaleID: string };            // "1000" para monto en letras
  }>;
  "cbc:DocumentCurrencyCode": { _text: string };          // "PEN"
  "cac:AccountingSupplierParty": ApisunatSupplier;
  "cac:AccountingCustomerParty": ApisunatCustomer;
  "cac:TaxTotal": ApisunatTaxTotal;
  "cac:LegalMonetaryTotal": ApisunatMonetaryTotal;
  "cac:PaymentTerms": ApisunatPaymentTerm[];
  "cac:PaymentMeans"?: ApisunatPaymentMeans;              // solo con detracción
  "cac:InvoiceLine": ApisunatInvoiceLine[];
}
```

---

### 6.3 Empresa (AccountingSupplierParty)

```json
"cac:AccountingSupplierParty": {
  "cac:Party": {
    "cac:PartyIdentification": {
      "cbc:ID": {
        "_attributes": { "schemeID": "6" },
        "_text": "20123456789"
      }
    },
    "cac:PartyLegalEntity": {
      "cbc:RegistrationName": { "_text": "RAZON SOCIAL SA" },
      "cac:RegistrationAddress": {
        "cbc:AddressTypeCode": { "_text": "0000" },
        "cac:AddressLine": {
          "cbc:Line": { "_text": "AV. EJEMPLO 123 LIMA" }
        }
      }
    }
  }
}
```

**Nota:** `cbc:AddressTypeCode: "0000"` es requerido para el supplier — no aplica para customer.

---

### 6.4 Cliente (AccountingCustomerParty)

```json
"cac:AccountingCustomerParty": {
  "cac:Party": {
    "cac:PartyIdentification": {
      "cbc:ID": {
        "_attributes": { "schemeID": "6" },
        "_text": "20602384315"
      }
    },
    "cac:PartyLegalEntity": {
      "cbc:RegistrationName": { "_text": "EMPRESA CLIENTE SAC" },
      "cac:RegistrationAddress": {
        "cac:AddressLine": {
          "cbc:Line": { "_text": "JR. CLIENTE 456 LIMA" }
        }
      }
    }
  }
}
```

**Mapeo schemeID (tipo de documento):**

| Tipo | schemeID |
|------|----------|
| RUC | `"6"` |
| DNI | `"1"` |
| CE | `"4"` |
| Pasaporte | `"7"` |
| Sin documento | `"0"` |

---

### 6.5 Totales de Impuestos (TaxTotal)

```json
"cac:TaxTotal": {
  "cbc:TaxAmount": {
    "_attributes": { "currencyID": "PEN" },
    "_text": 18
  },
  "cac:TaxSubtotal": [
    {
      "cbc:TaxableAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 100 },
      "cbc:TaxAmount":     { "_attributes": { "currencyID": "PEN" }, "_text": 18 },
      "cac:TaxCategory": {
        "cac:TaxScheme": {
          "cbc:ID":          { "_text": "1000" },
          "cbc:Name":        { "_text": "IGV" },
          "cbc:TaxTypeCode": { "_text": "VAT" }
        }
      }
    }
  ]
}
```

**Mapeo ApisPeru → ApiSunat:**

| ApisPeru | ApiSunat |
|----------|----------|
| `mtoIGV` | `cac:TaxTotal.cbc:TaxAmount._text` |
| `mtoOperGravadas` | `cac:TaxTotal.cac:TaxSubtotal[0].cbc:TaxableAmount._text` |

Para operaciones **exoneradas** (tipAfeIgv `20`) o **inafectas** (tipAfeIgv `30`), agregar `cac:TaxSubtotal` adicionales con los `cbc:ID` / `cbc:Name` / `cbc:TaxTypeCode` correspondientes al tipo de afectación.

---

### 6.6 Totales Monetarios (LegalMonetaryTotal)

```json
"cac:LegalMonetaryTotal": {
  "cbc:LineExtensionAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 100 },
  "cbc:TaxInclusiveAmount":  { "_attributes": { "currencyID": "PEN" }, "_text": 118 },
  "cbc:PayableAmount":       { "_attributes": { "currencyID": "PEN" }, "_text": 118 }
}
```

| ApisPeru | ApiSunat |
|----------|----------|
| `valorVenta` | `cbc:LineExtensionAmount._text` |
| `subTotal` | `cbc:TaxInclusiveAmount._text` |
| `mtoImpVenta` | `cbc:PayableAmount._text` |

---

### 6.7 Forma de Pago y Cuotas (PaymentTerms)

**Contado:**
```json
"cac:PaymentTerms": [
  {
    "cbc:ID":             { "_text": "FormaPago" },
    "cbc:PaymentMeansID": { "_text": "Contado" }
  }
]
```

**Crédito con cuotas:**
```json
"cac:PaymentTerms": [
  {
    "cbc:ID":             { "_text": "FormaPago" },
    "cbc:PaymentMeansID": { "_text": "Credito" },
    "cbc:Amount": { "_attributes": { "currencyID": "PEN" }, "_text": 118 }
  },
  {
    "cbc:ID":             { "_text": "FormaPago" },
    "cbc:PaymentMeansID": { "_text": "Cuota001" },
    "cbc:Amount":         { "_attributes": { "currencyID": "PEN" }, "_text": 59 },
    "cbc:PaymentDueDate": { "_text": "2026-04-30" }
  },
  {
    "cbc:ID":             { "_text": "FormaPago" },
    "cbc:PaymentMeansID": { "_text": "Cuota002" },
    "cbc:Amount":         { "_attributes": { "currencyID": "PEN" }, "_text": 59 },
    "cbc:PaymentDueDate": { "_text": "2026-05-30" }
  }
]
```

**Cuotas se numeran** `Cuota001`, `Cuota002`, etc. (siempre 3 dígitos con ceros).

---

### 6.8 Detracción

La detracción requiere **dos bloques adicionales** en el `documentBody`:

**Bloque 1 — cac:PaymentMeans** (cuenta bancaria):
```json
"cac:PaymentMeans": {
  "cbc:ID":              { "_text": "Detraccion" },
  "cbc:PaymentMeansCode": { "_text": "001" },
  "cac:PayeeFinancialAccount": {
    "cbc:ID": { "_text": "0004-3342343243" }
  }
}
```

**Bloque 2 — entrada adicional en cac:PaymentTerms** (porcentaje y monto):
```json
{
  "cbc:ID":             { "_text": "Detraccion" },
  "cbc:PaymentMeansID": { "_text": "014" },
  "cbc:PaymentPercent": { "_text": 12 },
  "cbc:Amount": { "_attributes": { "currencyID": "PEN" }, "_text": 56.64 }
}
```

**Mapeo ApisPeru → ApiSunat:**

| Campo ApisPeru | Campo ApiSunat | Bloque |
|---------------|----------------|--------|
| `detraccion.codMedioPago` (ej: `"001"`) | `cac:PaymentMeans.cbc:PaymentMeansCode._text` | PaymentMeans |
| `detraccion.ctaBanco` | `cac:PaymentMeans.cac:PayeeFinancialAccount.cbc:ID._text` | PaymentMeans |
| `detraccion.codBienDetraccion` (Catálogo 54) | `cac:PaymentTerms[n].cbc:PaymentMeansID._text` | PaymentTerms |
| `detraccion.percent` | `cac:PaymentTerms[n].cbc:PaymentPercent._text` | PaymentTerms |
| `detraccion.mount` | `cac:PaymentTerms[n].cbc:Amount._text` | PaymentTerms |

Las **leyendas de detracción** que ApisPeru agrega en `legends` con código `2006` pasan al array `cbc:Note` con `languageLocaleID: "2006"`.

---

### 6.9 Líneas de Detalle (InvoiceLine)

```json
"cac:InvoiceLine": [
  {
    "cbc:ID":               { "_text": 1 },
    "cbc:InvoicedQuantity": { "_attributes": { "unitCode": "NIU" }, "_text": 2 },
    "cbc:LineExtensionAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 200 },
    "cac:PricingReference": {
      "cac:AlternativeConditionPrice": {
        "cbc:PriceAmount":  { "_attributes": { "currencyID": "PEN" }, "_text": 118 },
        "cbc:PriceTypeCode": { "_text": "01" }
      }
    },
    "cac:TaxTotal": {
      "cbc:TaxAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 36 },
      "cac:TaxSubtotal": [
        {
          "cbc:TaxableAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 200 },
          "cbc:TaxAmount":     { "_attributes": { "currencyID": "PEN" }, "_text": 36 },
          "cac:TaxCategory": {
            "cbc:Percent":                { "_text": 18 },
            "cbc:TaxExemptionReasonCode": { "_text": "10" },
            "cac:TaxScheme": {
              "cbc:ID":          { "_text": "1000" },
              "cbc:Name":        { "_text": "IGV" },
              "cbc:TaxTypeCode": { "_text": "VAT" }
            }
          }
        }
      ]
    },
    "cac:Item": {
      "cbc:Description": { "_text": "Producto ejemplo" },
      "cac:SellersItemIdentification": {
        "cbc:ID": { "_text": "PROD001" }
      }
    },
    "cac:Price": {
      "cbc:PriceAmount": { "_attributes": { "currencyID": "PEN" }, "_text": 100 }
    }
  }
]
```

**Mapeo ApisPeru → ApiSunat por línea:**

| ApisPeru | ApiSunat |
|----------|----------|
| (índice 0-based + 1) | `cbc:ID._text` |
| `unidad` | `cbc:InvoicedQuantity._attributes.unitCode` |
| `cantidad` | `cbc:InvoicedQuantity._text` |
| `mtoValorVenta` | `cbc:LineExtensionAmount._text` |
| `mtoPrecioUnitario` (precio con IGV) | `cac:PricingReference.cac:AlternativeConditionPrice.cbc:PriceAmount._text` |
| `igv` | `cac:TaxTotal.cbc:TaxAmount._text` |
| `mtoBaseIgv` | `cac:TaxTotal.cac:TaxSubtotal[0].cbc:TaxableAmount._text` |
| `porcentajeIgv` | `cac:TaxCategory.cbc:Percent._text` |
| `tipAfeIgv` | `cac:TaxCategory.cbc:TaxExemptionReasonCode._text` |
| `descripcion` | `cac:Item.cbc:Description._text` |
| `codProducto` (opcional) | `cac:Item.cac:SellersItemIdentification.cbc:ID._text` |
| `mtoValorUnitario` (precio sin IGV) | `cac:Price.cbc:PriceAmount._text` |

**Nota:** `cac:SellersItemIdentification` se omite cuando `codProducto` es null o `"-"`.

---

### 6.10 Nota de Crédito (tipoDoc 07)

> ⚠️ **Pendiente ejemplo real de ApiSunat.** La estructura UBL esperada es:

```json
{
  "cbc:UBLVersionID":    { "_text": "2.1" },
  "cbc:CustomizationID": { "_text": "2.0" },
  "cbc:ID":              { "_text": "FC01-00000001" },
  "cbc:IssueDate":       { "_text": "2026-04-25" },
  "cbc:IssueTime":       { "_text": "17:00:00" },
  "cbc:Note": [
    { "_text": "TIPO NOTA: Anulación total", "_attributes": { "languageLocaleID": "4000" } }
  ],
  "cbc:DocumentCurrencyCode": { "_text": "PEN" },
  "cac:DiscrepancyResponse": {
    "cbc:ReferenceID":   { "_text": "F001-00000123" },
    "cbc:ResponseCode":  { "_text": "01" },
    "cbc:Description":   { "_text": "Anulación total" }
  },
  "cac:BillingReference": {
    "cac:InvoiceDocumentReference": {
      "cbc:ID":          { "_text": "F001-00000123" },
      "cbc:DocumentTypeCode": { "_text": "01" }
    }
  }
}
```

**Mapeo ApisPeru NC → ApiSunat:**

| ApisPeru | ApiSunat |
|----------|----------|
| `tipDocAfectado` | `cac:BillingReference.cac:InvoiceDocumentReference.cbc:DocumentTypeCode._text` |
| `numDocfectado` (ej: `"F001-00000123"`) | `cac:BillingReference.cac:InvoiceDocumentReference.cbc:ID._text` + `cac:DiscrepancyResponse.cbc:ReferenceID._text` |
| `codMotivo` | `cac:DiscrepancyResponse.cbc:ResponseCode._text` |
| `desMotivo` | `cac:DiscrepancyResponse.cbc:Description._text` |

**No incluir** `cbc:InvoiceTypeCode.listID` ni `cac:PaymentTerms` — no aplican para NC (igual que ApisPeru).

---

### 6.11 Guía de Remisión (tipoDoc 09)

> ⚠️ **Pendiente ejemplo real de ApiSunat para GRE v2.0.**  
> Desde 2023 SUNAT usa GRE versión 2.0 (formato distinto al UBL de facturación).  
> Se requiere un ejemplo del `documentBody` de ApiSunat para GRE antes de implementar.

**Lo que sabemos:** el `fileName` usa el mismo patrón: `RUC-09-T001-00000001`.

---

## 7. Respuesta de ApiSunat

### Éxito
```json
{
  "sunatResponse": {
    "success": true,
    "cdrZip": "base64...",
    "cdrResponse": {
      "code": "0",
      "description": "La Factura numero F001-00000001..."
    }
  },
  "xml": "<?xml version=\"1.0\"...>"
}
```

### Error SUNAT
```json
{
  "sunatResponse": {
    "success": false,
    "error": {
      "code": "2800",
      "message": "El valor del IGV es incorrecto"
    }
  }
}
```

**Detección de éxito** (misma lógica que ApisPeru):
```typescript
const isAccepted =
  response.sunatResponse?.success === true ||
  response.sunatResponse?.cdrResponse?.code === '0';
```

---

## 8. Endpoint y Función de Envío

```typescript
async function sendToApisunat(
  fileName: string,
  documentBody: object,
): Promise<ApisunatResponse> {
  const personaId    = process.env.APISUNAT_PERSONA_ID;
  const personaToken = process.env.APISUNAT_PERSONA_TOKEN;

  if (!personaId || !personaToken) {
    throw new Error('Faltan variables APISUNAT_PERSONA_ID o APISUNAT_PERSONA_TOKEN');
  }

  const response = await fetch('https://back.apisunat.com/personas/v1/sendBill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId, personaToken, fileName, documentBody }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ApiSunat respondió con status ${response.status}: ${text}`);
  }

  return response.json();
}
```

**Diferencias clave vs ApisPeru:**
- Sin `Authorization` header — auth va en el body
- Un solo endpoint para todos los tipos de documento
- `fileName` construido con: `${ruc}-${tipoDoc}-${serie}-${correlativo.padStart(8, '0')}`

---

## 9. PDF

> ⚠️ **Pendiente confirmar endpoint de PDF con ApiSunat.**  
> ApisPeru exponía `/invoice/pdf` y `/despatch/pdf`.  
> ApiSunat no documenta este endpoint públicamente.  
> **Acción:** consultar a soporte de ApiSunat o revisar en dashboard si hay endpoint de PDF.

**Alternativa mientras no está disponible:** usar el XML de la respuesta para generar PDF propio, o deshabilitar la descarga de PDF hasta confirmar.

---

## 10. Plan de Implementación

### Fase 1 — Setup (Día 1)
- [ ] Fork del proyecto y duplicación de BD
- [ ] Agregar variables `APISUNAT_PERSONA_ID` y `APISUNAT_PERSONA_TOKEN` en `.env.local`
- [ ] Crear cuenta ApiSunat en modo DEV
- [ ] Confirmar endpoint de PDF con ApiSunat
- [ ] Obtener ejemplos reales de NC (07) y GRE (09) del dashboard ApiSunat

### Fase 2 — Implementación Core (Días 2-3)
- [ ] Crear `src/lib/apisunatFacturacion.ts`
  - [ ] Tipos TypeScript (`ApisunatRequest`, `ApisunatDocumentBody`, etc.)
  - [ ] `buildFileName()` — genera el fileName correcto
  - [ ] `buildSupplierParty()` — empresa
  - [ ] `buildCustomerParty()` — cliente con mapeo de tipo documento
  - [ ] `buildTaxTotal()` — totales de IGV (gravado, exonerado, inafecto)
  - [ ] `buildMonetaryTotal()` — totales monetarios
  - [ ] `buildPaymentTerms()` — contado / crédito / cuotas / detracción
  - [ ] `buildPaymentMeans()` — solo para detracción
  - [ ] `buildInvoiceLines()` — líneas de detalle con descuentos
  - [ ] `buildInvoiceBody()` — factura y boleta (01, 03)
  - [ ] `buildCreditNoteBody()` — nota de crédito (07)
  - [ ] `sendToApisunat()` — función de envío única
  - [ ] `getPdfFromApisunat()` — descarga PDF (cuando esté disponible)
- [ ] Crear `src/lib/apisunatGuiasRemision.ts`
  - [ ] Tipos para GRE (requiere ejemplo real)
  - [ ] `buildGuiaRemisionBody()` — GRE (09)
  - [ ] Reutilizar `sendToApisunat()` del módulo de facturación

### Fase 3 — Integración (Día 4)
- [ ] Actualizar `src/app/api/facturacion/emitir/route.ts`
- [ ] Actualizar `src/app/api/notas-credito/emitir/route.ts`
- [ ] Actualizar `src/app/api/guias-remision/emitir/route.ts`
- [ ] Eliminar `src/lib/apisperuFacturacion.ts`
- [ ] Eliminar `src/lib/apisperuGuiasRemision.ts`

### Fase 4 — Testing (Días 5-6)
- [ ] Emitir factura contado sin detracción (caso base)
- [ ] Emitir factura a crédito con cuotas
- [ ] Emitir factura con detracción
- [ ] Emitir boleta
- [ ] Emitir nota de crédito
- [ ] Emitir guía de remisión (modalidad 01 — transporte público)
- [ ] Emitir guía de remisión (modalidad 02 — transporte propio)
- [ ] Verificar descarga de XML
- [ ] Verificar descarga de PDF (si disponible)
- [ ] Verificar recepción y guardado del CDR

---

## 11. Preguntas Abiertas

| # | Pregunta | Responsable | Estado |
|---|----------|-------------|--------|
| 1 | ¿ApiSunat tiene endpoint de PDF? ¿Cuál es la URL? | Dev / Soporte ApiSunat | Pendiente |
| 2 | ¿Cuál es el `documentBody` de ejemplo para GRE (09) en ApiSunat? | Dev | Pendiente |
| 3 | ¿Cuál es el `documentBody` de ejemplo para NC (07) en ApiSunat? | Dev | Pendiente |
| 4 | ¿Los errores de validación de ApiSunat son array como ApisPeru o tienen diferente formato? | Dev | Pendiente |
| 5 | ¿ApiSunat tiene ambiente de DEV separado o usa el mismo endpoint con token DEV\_...? | Dev | Confirmado — mismo endpoint, token distingue ambiente |

---

## 12. Lo que NO cambia

Para que quede claro: todo lo que está fuera de `src/lib/apisunat*.ts` y las 3 API routes **no se toca**:

- `src/utils/calculations.ts` — lógica financiera igual
- `src/utils/formatters.ts` — formateo igual
- `src/utils/numeroALetras.ts` — se sigue usando para `cbc:Note` con `languageLocaleID: "1000"`
- `src/constants/index.ts` — `TAX_RATES`, `DECIMAL_PRECISION` igual
- `src/services/*.service.ts` — sin cambios
- `src/hooks/*.ts` — sin cambios
- `src/features/*.tsx` / `src/components/*.tsx` — sin cambios
- Base de datos — sin cambios (tablas, RLS, RPCs)
