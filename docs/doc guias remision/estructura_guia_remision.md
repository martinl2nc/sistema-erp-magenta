# ANEXO XII
## Anexo N° 14: Estándar UBL 2.1 - Guía de remisión - Remitente

| N° | DATO | NIVEL | CONDICIÓN PRIVADO | CONDICIÓN PUBLICA | CONDICIÓN PUBLICA COMPLETA | TIPO Y LONGITUD | FORMATO | TAG UBL 2.1 |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|:---|
| **I** | **Guía Electrónica** | - | - | - | - | - | - | `/DespatchAdvice` |
| 1 | Versión del UBL | Global | M | M | M | an3 | - | `/DespatchAdvice/cbc:UBLVersionID` |
| 2 | Versión de la estructura del documento | Global | M | M | M | an3 | - | `/DespatchAdvice/cbc:CustomizationID` |
| 3 | Numeración, conformada por serie y número correlativo | Global | M | M | M | an..13 | T###-NNNNNNNN | `/DespatchAdvice/cbc:ID` |
| 4 | Fecha de emisión | Global | M | M | M | an..10 | YYYY-MM-DD | `/DespatchAdvice/cbc:IssueDate` |
| 5 | Hora de emisión | Global | M | M | M | an..12 | hh:mm:ss.oz ó 'hh:mm:ss.0z' | `/DespatchAdvice/cbc:IssueTime` |
| 6 | Tipo de documento (Guía) | Global | M | M | M | an2 | Catálogo N° 01 | `/DespatchAdvice/cbc:DespatchAdviceTypeCode` |
| 7 | Observaciones (Texto) | Global | C | C | C | an..250 | - | `/DespatchAdvice/cbc:Note` |
| **II** | **Guía de Remisión de referencia (dada de baja por cambio de destinatario)** | Global | C | C | C | - | - | `/DespatchAdvice/cac:OrderReference/` |
| 8 | Serie y Número de documento | Global | M | M | M | an..13 | T###-NNNNNNNN EG01-NNNNNNNN | `/DespatchAdvice/cac:OrderReference/cbc:ID` |
| 9 | Código del tipo de documento | Global | M | M | M | an2 | Catálogo N° 01 ser = 09 | `/DespatchAdvice/cac:OrderReference/cbc:OrderTypeCode` |
| 10 | Tipo de documento (Descripción) | Global | C | C | C | an..50 | - | `/DespatchAdvice/cac:OrderReference/cbc:OrderTypeCode@name` |
| **III** | **Numero de DAM (obligatorio cuando el motivo de traslado es importación)** | Global | C | C | C | - | - | `/DespatchAdvice/cac:AdditionalDocumentReference` |
| 11 | Numero de documento | Global | M | M | M | an..20 | - | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:ID` |
| 12 | Código del tipo de documento | Global | M | M | M | an2 | Catálogo N° 21 DAM | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:DocumentTypeCode` |
| **IV** | **Documento Relacionado (Numeración de manifiesto de carga)** | Global | C | C | C | - | - | `/DespatchAdvice/cac:AdditionalDocumentReference` |
| 13 | Numero de documento | Global | M | M | M | an..20 | - | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:ID` |
| 14 | Código del tipo de documento | Global | M | M | M | an2 | Catálogo N° 21 MANIFIESTO DE CARGA | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:DocumentTypeCode` |
| **V** | **Documento Relacionado (Número de Orden de entrega, Número de SCOP, etc.)** | Global | C | C | C | - | - | `/DespatchAdvice/cac:AdditionalDocumentReference` |
| 15 | Numero de documento | Global | M | M | M | an..20 | - | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:ID` |
| 16 | Código del tipo de documento | Global | M | M | M | an2 | Catálogo N° 21 | `/DespatchAdvice/cac:AdditionalDocumentReference/cbc:DocumentTypeCode` |
| **VI** | **Firma Digital** | Global | M | M | M | - | - | - |
| 17 | Firma Digital | Global | M | M | M | an..3000 | - | `/DespatchAdvice/ext:UBLExtensions/.../ds:Signature` |
| **VII** | **Datos del Remitente** | Global | M | M | M | - | - | `/DespatchAdvice/cac:DespatchSupplierParty/` |
| 18 | Numero de documento de identidad | - | M | M | M | - | - | `.../cbc:CustomerAssignedAccountID` |
| 19 | Tipo de documento de identidad | - | M | M | M | n1 | Catálogo N° 06 | `.../cbc:CustomerAssignedAccountID@schemeID` |
| 20 | Apellidos y nombres o razón social | - | M | M | M | an..100 | - | `.../cac:PartyLegalEntity/cbc:RegistrationName` |
| **VIII** | **Datos del Destinatario** | Global | M | M | M | - | - | `/DespatchAdvice/cac:DeliveryCustomerParty/` |
| 21 | Numero de documento de identidad | - | M | M | M | n15 | n(15) | `.../cbc:CustomerAssignedAccountID` |
| 22 | Tipo de documento de identidad | - | M | M | M | n1 | Catálogo N° 06 | `.../cbc:CustomerAssignedAccountID@schemeID` |
| 23 | Apellidos y nombres o razón social | - | M | M | M | an..100 | an | `.../cac:PartyLegalEntity/cbc:RegistrationName` |
| **IX** | **Datos del Proveedor (cuando se ingrese)** | Global | C | C | C | - | - | `/DespatchAdvice/cac:SellerSupplierParty/` |
| 24 | Numero de documento de identidad | - | M | M | M | n11 | n(11) | `.../cbc:CustomerAssignedAccountID` |
| 25 | Tipo de documento de identidad | - | M | M | M | an2 | Catálogo N° 06 | `.../cbc:CustomerAssignedAccountID@schemeID` |
| 26 | Apellidos y nombres o razón social | - | M | M | M | an2 | Catálogo N° 06 | `.../cac:PartyLegalEntity/cbc:RegistrationName` |
| **X** | **Datos del envío** | Global | M | M | M | - | - | `/DespatchAdvice/cac:Shipment/` |
| 27 | Motivo del traslado | Global | M | M | M | an2 | Catálogo N° 20 | `.../cbc:HandlingCode` |
| 28 | Descripción de motivo de traslado | Global | C | C | C | an..100 | an | `.../cbc:Information` |
| 29 | Indicador de Transbordo Programado | Global | C | C | C | boolean | true/false | `.../cbc:SplitConsignmentIndicator` |
| 30 | Peso bruto total de los guía | Global | M | M | M | n..16 | n(12,3) | `.../cbc:GrossWeightMeasure` |
| 31 | Unidad de medida del peso bruto | Global | M | M | M | an4 | Catálogo N° 03 =KGM | `.../cbc:GrossWeightMeasure@unitCode` |
| 32 | Numero de Bultos o Pallets | - | C | C | C | n..12 | n12 | `.../cbc:TotalTransportHandlingUnitQuantity` |
| 33 | Modalidad de Traslado | Global | M | M | M | an2 | Catálogo N° 18 | `.../cac:ShipmentStage/cbc:TransportModeCode` |
| 34 | Fecha Inicio de traslado | Global | M | M | M | an..10 | YYYY-MM-DD | `.../cac:ShipmentStage/cac:TransitPeriod/cbc:StartDate` |
| 35 | Fecha de entrega de bienes al transportista | Global | M | M | M | an..10 | YYYY-MM-DD | `.../cac:ShipmentStage/cac:TransitPeriod/cbc:StartDate` |
| **XI** | **Transportista (Transporte Público)** | Global | NA | M | M | - | - | `/DespatchAdvice/cac:Shipment/cac:ShipmentStage/cac:CarrierParty/` |
| 36 | Numero de RUC transportista | Global | NA | M | M | n11 | - | `.../cac:PartyIdentification/cbc:ID` |
| 37 | Tipo de documento del transportista | Global | NA | M | M | an2 | Catálogo N° 06 | `.../cac:PartyIdentification/cbc:ID@schemeID` |
| 38 | Apellidos y Nombres o razón social | Global | NA | M | M | an..100 | - | `.../cac:PartyName/cbc:Name` |
| **XII** | **VEHICULO (Transporte Privado)** | Global | M | NA | M | - | - | `/DespatchAdvice/cac:Shipment/cac:ShipmentStage/cac:TransportMeans` |
| 39 | Numero de placa del vehiculo | Global | M | NA | M | an..8 | - | `.../cac:RoadTransport/cbc:LicensePlateID` |
| **XIII** | **Vehículos (Secundarios)** | Global | C | NA | C | - | - | `/DespatchAdvice/cac:Shipment/cac:TransportHandlingUnit` |
| 40 | Número de placa del vehículo | Global | C | NA | C | - | - | `.../cac:TransportEquipment/cbc:ID` |
| **XIV** | **CONDUCTOR (Transporte Privado)** | Global | M | NA | M | - | - | `/DespatchAdvice/cac:Shipment/cac:ShipmentStage/cac:DriverPerson/` |
| 41 | Numero de documento de identidad | - | M | NA | M | n11 | - | `.../cbc:ID` |
| 42 | Tipo de documento de identidad | - | M | NA | M | an2 | Catálogo N° 06 | `.../cbc:ID@schemeID` |
| **XV** | **Dirección punto de llegada** | Global | M | M | M | - | - | `/DespatchAdvice/cac:Shipment/cac:Delivery/cac:DeliveryAddress/` |
| 43 | Ubigeo | Global | M | M | M | an8 | Catálogo N° 13 | `.../cbc:ID` |
| 44 | Direccion completa y detallada | - | M | M | M | an..100 | - | `.../cbc:StreetName` |
| **XVI** | **Datos del contenedor** | Global | C | C | C | - | - | `/DespatchAdvice/cac:Shipment/cac:TransportHandlingUnit/` |
| 45 | Numero de Contenedor | Global | M | M | M | an..17 | na | `.../cbc:ID` |
| **XVII** | **Dirección punto de partida** | Global | M | M | M | - | - | `/DespatchAdvice/cac:Shipment/cac:OriginAddress/` |
| 46 | Ubigeo | Global | M | M | M | an8 | Catálogo N° 13 | `.../cbc:ID` |
| 47 | Direccion completa y detallada | Global | M | M | M | an..100 | - | `.../cbc:StreetName` |
| **XVIII** | **Puerto o Aeropuerto** | Global | C | C | C | - | - | `/DespatchAdvice/cac:Shipment/cac:FirstArrivalPortLocation` |
| 48 | Codigo del Puerto | - | M | M | M | an3 | - | `.../cbc:ID` |
| **XIX** | **BIENES A TRANSPORTAR** | ITEM | M | M | M | - | - | `/DespatchAdvice/cac:DespatchLine/` |
| 49 | Numero de orden del item | ITEM | M | M | M | n..4 | - | `.../cbc:ID` |
| 50 | Cantidad del item | ITEM | M | M | M | n..8 | - | `.../cbc:DeliveredQuantity` |
| 51 | Unidad de medida del item | ITEM | M | M | M | - | Catálogo N° 03 | `.../cbc:DeliveredQuantity@unitCode` |
| 52 | Descripcion detallada del ítem | ITEM | M | M | M | an..250 | - | `.../cac:Item/cbc:Name` |
| 53 | Codigo del item | ITEM | C | C | C | an..16 | - | `.../cac:Item/cac:SellersItemIdentification/cbc:ID` |
| 54 | Codigo producto SUNAT | C | C | C | C | an..8 | - | - |

---

### Nota:
(*) En caso el emisor electrónico opte por consignar en la factura electrónica cualquier otro dato no consignado en el presente anexo, se deberá utilizar el estándar UBL versión 2.1.

**(1) Condición informática:**
*   **M:** El dato debe consignarse siempre.
*   **C:** Condicional, el campo debe consignarse de acuerdo a lo indicado en los anexos.

**(2) Tipo y Longitud:**
*   **a:** carácter alfabético
*   **n:** carácter numérico
*   **an:** carácter alfanumérico
*   **a3:** 3 caracteres alfabéticos de longitud fija
*   **n3:** 3 caracteres numéricos de longitud fija
*   **an3:** 3 caracteres alfa-numéricos de longitud fija
*   **a..3:** hasta 3 caracteres alfabéticos
*   **n..3:** hasta 3 caracteres numéricos
*   **an..3:** hasta 3 caracteres alfa-numéricos