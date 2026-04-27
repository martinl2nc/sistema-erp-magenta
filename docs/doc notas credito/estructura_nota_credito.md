# CONTENIDO DE LA NOTA DE CRÉDITO ELECTRÓNICA

Aquí tienes la transcripción completa del contenido de la **Nota de Crédito Electrónica** (UBL 2.1) a formato Markdown, organizada por secciones tal como aparece en el documento.

| Raíz / Nodo | Atributo | DATO | Cardinalidad UBL | Valor / Formato | Observaciones |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **/CreditNote** | | | - | | |
| /CreditNote/ext:UBLExtensions | | | 0..1 | | |
| /CreditNote/ext:UBLExtensions/ext:UBLExtension | | | 1..n | | |
| /CreditNote/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent | | | 1 | | |
| ds:Signature | | Firma Digital | | | |
| cbc:UBLVersionID | | Versión del UBL | 0..1 | "2.1" | |
| cbc:CustomizationID | | Versión de la estructura del documento | 0..1 | "2.0" | |
| cbc:ID | | Serie y número del comprobante | 1 | F###-NNNNNNNN | |
| cbc:IssueDate | | Fecha de emisión | 1 | yyyy-mm-dd | |
| cbc:IssueTime | | Hora de emisión | 0..1 | hh-mm-ss.0z | |
| cbc:Note | | Leyenda | 0..n | an..100 | |
| | @languageLocaleID | Código de leyenda | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo52" | Catálogo 52 |
| cbc:DocumentCurrencyCode | | Código de tipo de moneda | 0..1 | an3 | Catálogo 02 |
| **/CreditNote/cac:DiscrepancyResponse** | | | 0..n | | |
| cbc:ReferenceID | | Serie y número de comprobante afectado | 1 | NNNN-NNNNNNNN \ F###-NNNNNNNN | |
| cbc:ResponseCode | | Código de tipo de nota de crédito | 0..1 | n2 | Catálogo 09 |
| cbc:Description | | Motivo o sustento | 0..n | an..250 | |
| **/CreditNote/cac:BillingReference/cac:CreditNoteDocumentReference** | | | 0..1 | | |
| cbc:ID | | Serie y número del comprobante que modifica | 1 | NNNN-NNNNNNNN / F###-NNNNNNNN | |
| cbc:DocumentTypeCode | | Código de tipo de comprobante que modifica | 0..1 | n2 | Catálogo 01 |
| **/CreditNote/cac:DespatchDocumentReference** | | | 0..n | | |
| cbc:ID | | Serie y número de la guía de remisión | 1 | NNNN-NNNNNNNN / G###-NNNNNNNN / R###-NNNNNNNN | |
| cbc:DocumentTypeCode | | Código de tipo de comprobante (guía) | 0..1 | n2 | Catálogo 01 |
| **/CreditNote/cac:AdditionalDocumentReference** | | | 0..n | | |
| cbc:ID | | Serie y número del comprobante de referencia | 1 | an..30 | |
| cbc:DocumentTypeCode | | Código de tipo de comprobante de referencia | 0..1 | n2 | Catálogo 12 |

## Datos de los Intervinientes (Emisor y Adquirente)

| Raíz / Nodo | Atributo | DATO | Cardinalidad UBL | Valor / Formato | Observaciones |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **/CreditNote/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme** | | | 0..n | | |
| cbc:RegistrationName | | Nombre o razón social del emisor | 0..1 | an..100 | |
| cbc:CompanyID | | Número de RUC del emisor | 0..1 | n11 | |
| | @schemeID | Tipo de Documento de Identidad del Emisor | 0..1 | an1 | Catálogo 06 |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Documento de Identidad" | |
| | @schemeAgencyName | - | 0..1 | "PE:SUNAT" | |
| | @schemeURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06" | |
| **/CreditNote/cac:AccountingSupplierParty/.../cac:RegistrationAddress** | | | 0..1 | | |
| cbc:AddressTypeCode | | Código del domicilio fiscal o local anexo | 0..1 | n4 | |
| **/CreditNote/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme** | | | 0..n | | |
| cbc:RegistrationName | | Nombre o razón social del adquirente | 0..1 | an..100 | |
| cbc:CompanyID | | Número de RUC del adquirente | 0..1 | n11 | |
| | @schemeID | Tipo de Documento de Identidad del Adquirente | 0..1 | an1 | Catálogo 06 |

## Impuestos y Totales

| Raíz / Nodo | Atributo | DATO | Cardinalidad UBL | Valor / Formato | Observaciones |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **/CreditNote/cac:TaxTotal** | | | 0..n | | |
| cbc:TaxAmount | | Monto total del tributo | 1 | n(12,2) | |
| | @currencyID | Moneda del monto total del tributo | 1 | an3 | Catálogo 02 |
| **/CreditNote/cac:TaxTotal/cac:TaxSubtotal** | | | 0..n | | |
| cbc:TaxAmount | | Monto total del tributo | 1 | n(12,2) | |
| **/CreditNote/cac:TaxTotal/cac:TaxSubtotal/.../cac:TaxScheme** | | | 1 | | |
| cbc:ID | | Código de tributo | 0..1 | an4 | Catálogo 05 |
| cbc:Name | | Nombre de tributo | 0..1 | an..6 | Catálogo 05 |
| cbc:TaxTypeCode | | Código internacional tributo | 0..1 | an3 | Catálogo 05 |
| **/CreditNote/cac:LegalMonetaryTotal** | | | 1 | | |
| cbc:AllowanceTotalAmount | | Monto total de descuentos globales | 0..1 | n(12,2) | |
| cbc:ChargeTotalAmount | | Monto total de otros cargos | 0..1 | n(12,2) | |
| cbc:PrepaidAmount | | Monto total de anticipos | 0..1 | n(15,2) | |
| cbc:PayableAmount | | Importe total de la venta o servicio | 1 | n(12,2) | |

## Detalle de la Nota de Crédito (Líneas)

| Raíz / Nodo | Atributo | DATO | Cardinalidad UBL | Valor / Formato | Observaciones |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **/CreditNote/cac:CreditNoteLine** | | | 1..n | | |
| cbc:ID | | Número de orden del Ítem | 1 | n..3 | |
| cbc:CreditedQuantity | | Cantidad de unidades del ítem | 0..1 | n(12,10) | |
| | @unitCode | Unidad de medida del ítem | 0..1 | an..3 | Catálogo 03 |
| | @unitCodeListID | - | 0..1 | UN/ECE rec 20 | |
| | @unitCodeListAgencyName | - | 0..1 | United Nations Economic Commission for Europe | |
| cbc:LineExtensionAmount | | Valor de venta del ítem | 1 | n(12,2) | |
| **/CreditNote/.../cac:AlternativeConditionPrice** | | | 0..n | | |
| cbc:PriceAmount | | Precio de venta unitario / Valor referencial | 1 | n(12,10) | |
| cbc:PriceTypeCode | | Código de tipo de precio | 0..1 | an2 | Catálogo 16 |
| **/CreditNote/cac:CreditNoteLine/cac:TaxTotal** | | | 0..n | | |
| cbc:TaxAmount | | Monto de tributo del ítem | 1 | n(12,2) | |
| **/CreditNote/.../cac:TaxSubtotal/cac:TaxCategory** | | | 1 | | |
| cbc:TaxExemptionReasonCode | | Código de tipo de afectación del IGV | 0..1 | an2 | Catálogo 07 |
| cbc:TierRange | | Código de tipo de sistema de ISC | 0..1 | an2 | Catálogo 08 |
| **/CreditNote/cac:CreditNoteLine/cac:Item** | | | 1 | | |
| cbc:Description | | Descripción detallada del bien o servicio | 0..n | an..250 | |
| cbc:ID | | Código de producto del ítem | 1 | an..30 | |
| **/CreditNote/.../cac:CommodityClassification** | | | 0..1 | | |
| cbc:ItemClassificationCode | | Código de producto (SUNAT) | 1 | n8 | |
| | @listID | - | 0..1 | UNSPSC | |
| **/CreditNote/.../cac:AdditionalItemProperty** | | | 0..n | | |
| cbc:Name | | Nombre del concepto a consignar | 1 | an..100 | |
| cbc:NameCode | | Código del concepto a consignar | 0..1 | 8000 ó 8001 | Catálogo 55 |
| cbc:Value | | Valor del concepto a consignar | 0..1 | an..100 | |
| **/CreditNote/cac:CreditNoteLine/cac:Price** | | | 0..1 | | |
| cbc:PriceAmount | | Valor unitario del ítem | 1 | n(12,10) | |