# Guía de elaboración de documentos electrónicos XML - UBL 2.1
## CONTENIDO DE LA FACTURA ELECTRÓNICA

| Raíz / Nodo | Atributo | DATO | Cardinalidad UBL | Valor / Formato | Observ. | Factura | RRSSPP |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **/Invoice** | | | | | | | |
| /Invoice/ext:UBLExtensions | | | 0..1 | | | | |
| /Invoice/ext:UBLExtensions/ext:UBLExtension | | | 1..n | | | | |
| /Invoice/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent | | | 1 | | | | |
| ds:Signature | | Firma Digital | | | | x | x |
| cbc:UBLVersionID | | Versión del UBL | 0..1 | "2.1" | | x | x |
| cbc:CustomizationID | | Versión de la estructura del documento | 0..1 | "2.0" | | x | x |
| cbc:ProfileID | | Código de tipo de operación | 0..1 | an2 | Catálogo 51 | | |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Tipo de Operación" | | | |
| | @schemeAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @schemeURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17" | | | |
| cbc:ID | | Serie y número del comprobante | 1 | F###-NNNNNNNN | | x | x |
| cbc:IssueDate | | Fecha de emisión | 1 | yyyy-mm-dd | | x | x |
| cbc:IssueTime | | Hora de emisión | 0..1 | hh-mm-ss.0z | | x | x |
| cbc:DueDate | | Fecha de vencimiento | 0..1 | yyyy-mm-dd | | x | x |
| cbc:InvoiceTypeCode | | Código de tipo de documento | 0..1 | an2 | Catálogo 01 | x | |
| | @listAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @listName | - | 0..1 | "SUNAT:Identificador de Tipo de Documento" | | | |
| | @listURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" | | | |
| cbc:Note | | Leyenda | 0..n | an..100 | | x | x |
| | @languageLocaleID | Código de leyenda | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo52" | Catálogo 52 | x | x |
| cbc:DocumentCurrencyCode | | Código de tipo de moneda de la factura | 0..1 | an3 | Catálogo 02 | x | x |
| | @listID | - | 0..1 | "ISO 4217 Alpha" | | | |
| | @listName | - | 0..1 | Currency | | | |
| | @listAgencyName | - | 0..1 | United Nations Economic Commission for Europe | | | |
| cbc:LineCountNumeric | | Cantidad de ítems de la factura | 0..1 | n3 | | x | |
| **/Invoice/cac:InvoicePeriod** | | | 0..n | | | | |
| cbc:StartDate | | Fecha de inicio de ciclo de facturación | 0..1 | yyyy-mm-dd | | x | |
| cbc:EndDate | | Fecha de fin de ciclo de facturación | 0..1 | yyyy-mm-dd | | x | |
| **/Invoice/cac:OrderReference** | | | 0..1 | | | | |
| cbc:ID | | Número de la orden de compra | 1 | an..20 | | x | |
| **/Invoice/cac:DespatchDocumentReference** | | | 0..n | | | | |
| cbc:ID | | Número de guía de remisión relacionada | 1 | NNNN-NNNNNNNN / R###-NNNNNNNN | | x | |
| cbc:DocumentTypeCode | | Código de tipo de guía de remisión | 0..1 | an2 | Catálogo 01 | x | |
| | @listAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @listName | - | 0..1 | "SUNAT:Identificador de guía relacionada" | | | |
| | @listURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo12" | | | |
| **/Invoice/cac:ContractDocumentReference** | | | | | | | |
| cbc:ID | | Número de suministro/teléfono | 1 | an..9 | | x | |
| cbc:DocumentTypeCode | | Tipo de Servicio Público | 0..1 | n1 | Catálogo 56 | x | |
| | @listAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @listName | - | 0..1 | "SUNAT:Identificador de Tipo de Servicio" | | | |
| | @listURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo56" | | | |
| cbc:LocaleCode | | Código de Servicios de Telecomunicaciones | 0..1 | n1 | Catálogo 57 | x | |
| | @listAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @listName | - | 0..1 | "SUNAT:Identificador de Servicio de Telecomunicación" | | | |
| | @listURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo57" | | | |
| cbc:DocumentStatusCode | | Código de Tipo de Tarifa contratada | 0..1 | an..4 | Catálogo 24 | x | |
| | @listAgencyName | - | 0..1 | PE:SUNAT | | | |
| | @listName | - | 0..1 | SUNAT:Identificador de Tipo de Tarifa | | | |
| | @listURI | - | 0..1 | urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo24 | | | |
| **/Invoice/cac:AdditionalDocumentReference** | | | 0..n | | | | |
| cbc:ID | | Número de documento relacionado | 1 | an..30 | | x | |
| cbc:DocumentTypeCode | | Código de tipo de documento relacionado | 0..1 | an2 | Catálogo 12 | x | |
| | @listAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @listName | - | 0..1 | "SUNAT:Identificador de documento relacionado" | | | |
| | @listURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo12" | | | |
| **/Invoice/cac:Signature** | | Información adicional de la firma | 0..n | | | x | x |
| **/Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyName** | | | 0..n | | | | |
| cbc:Name | | Nombre Comercial del emisor | 1..1 | an..100 | | x | x |
| **/Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme** | | | 0..n | | | | |
| cbc:RegistrationName | | Nombre o razón social del emisor | 0..1 | an..100 | | x | x |
| cbc:CompanyID | | Número de RUC del emisor | 0..1 | n11 | | x | x |
| | @schemeID | Tipo de Documento de Identidad | 0..1 | an1 | Catálogo 06 | x | x |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Documento de Identidad" | | | |
| | @schemeAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @schemeURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06" | | | |
| **/Invoice/cac:AccountingSupplierParty/.../cac:RegistrationAddress** | | | 0..1 | | | | |
| cbc:AddressTypeCode | | Código del domicilio fiscal o local anexo | 0..1 | n4 | | x | x |
| **/Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme** | | | 0..n | | | | |
| cbc:RegistrationName | | Nombre o razón social del adquirente | 0..1 | an..100 | | x | x |
| cbc:CompanyID | | Número de RUC del adquirente | 0..1 | n11 | | x | x |
| | @schemeID | Tipo de Documento de Identidad | 0..1 | an1 | Catálogo 06 | x | x |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Documento de Identidad" | | | |
| | @schemeAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @schemeURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06" | | | |
| **/Invoice/cac:Delivery** | | | 0..n | | | | |
| cbc:ID | | Número de medidor (Servicios públicos) | 0..1 | | | x | |
| | @schemeID | Código del tipo de medidor | 0..1 | n1 | Catálogo 58 | x | |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Tipo de Medidor" | | | |
| | @schemeAgencyName | - | 0..1 | "PE:SUNAT" | | | |
| | @schemeURI | - | 0..1 | "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo58" | | | |
| cbc:Quantity | | Consumo del periodo (Servicios públicos) | 0..1 | n10 | | x | |
| | @unitCode | Código de unidad de medida | 0..1 | an3 | Catálogo 03 | x | |
| | @unitCodeListID | - | 0..1 | UN/ECE rec 20 | | | |
| | @unitCodeListAgencyName | - | 0..1 | United Nations Economic Commission for Europe | | | |
| cbc:MaximumQuantity | | Potencia contratada (Servicios públicos) | 0..1 | n..5 | | x | |
| | @unitCode | Código de unidad de medida potencia | 0..1 | an3 | Catálogo 03 | x | |
| **/Invoice/cac:Delivery/cac:DeliveryLocation/cac:LocationCoordinate** | | | 0..n | | | | |
| cbc:LatitudeDirectionCode | | Ubicación geográfica del medidor (Lat) | 0..1 | | | x | |
| cbc:LongitudeDirectionCode | | Ubicación geográfica del medidor (Long) | 0..1 | | | x | |
| **/Invoice/cac:Delivery/cac:DeliveryParty/cac:PartyLegalEntity** | | | 0..n | | | | |
| cbc:CompanyID | | Nro documento identidad del destinatario | 1 | n11 | | x | |
| | @schemeID | Código tipo documento identidad | 0..1 | an1 | Catálogo 06 | x | |
| | @schemeName | - | 0..1 | "SUNAT:Identificador de Documento de Identidad" | | | |
| cbc:RegistrationName | | Apellidos y nombres o razón social | 1 | an..100 | | x | |
| **/Invoice/cac:Delivery/cac:Shipment** | | | 0..1 | | | | |
| cbc:HandlingCode | | Código de motivo del traslado | 0..1 | an2 | Catálogo 20 | x | |
| | @listName | - | 0..1 | "SUNAT:Indicador de Motivo de Traslado" | | | |
| cbc:GrossWeightMeasure | | Peso bruto total | 0..1 | n(12,3) | | x | |
| | @unitCode | Código de unidad de medida | 1 | an3 | Catálogo 03 | x | |
| **/Invoice/cac:Delivery/cac:Shipment/cac:ShipmentStage** | | | 0..n | | | | |
| cbc:TransportModeCode | | Modalidad de Transporte | 0..1 | an2 | Catálogo 18 | x | |
| cbc:StartDate | | Fecha inicio traslado / entrega bienes | 0..1 | yyyy-mm-dd | | x | |
| **/Invoice/cac:Delivery/cac:Shipment/.../cac:CarrierParty/cac:PartyLegalEntity** | | | 0..n | | | | |
| cbc:CompanyID | | Número de RUC del transportista | 1 | n11 | | x | |
| | @schemeID | Código tipo doc. identidad transportista | 0..1 | "6" | Catálogo 06 | x | |
| cbc:RegistrationName | | Apellidos y Nombres / Razón social transportista | 1 | an..100 | | x | |
| cbc:RegistrationNationalityID | | Nro constancia inscripción / cert. habilitación | 0..1 | an..40 | | x | |
| **/Invoice/cac:Delivery/cac:Shipment/.../cac:RoadTransport** | | | 0..1 | | | | |
| cbc:LicensePlateID | | Número de placa del vehículo | 1 | an..8 | | x | |
| **/Invoice/cac:Delivery/cac:Shipment/.../cac:DriverPerson** | | | 0..n | | | | |
| cbc:ID | | Nro Documento de los conductores | 1 | n11 | | x | |
| | @schemeID | Tipo de Documento de conductores | 0..1 | an1 | Catálogo 06 | x | |
| **/Invoice/cac:Delivery/cac:Shipment/cac:Delivery/cac:DeliveryAddress** | | | 0..1 | | | | |
| cbc:CountrySubentityCode | | Código de ubigeo punto de llegada | 0..1 | n6 | Catálogo 13 | x | |
| cbc:Line | | Dirección completa punto de llegada | 1 | an..100 | | x | |
| **/Invoice/cac:Delivery/cac:Shipment/cac:OriginAddress** | | | 0..1 | | | | |
| cbc:CountrySubentityCode | | Código de ubigeo punto de partida | 0..1 | n6 | Catálogo 13 | x | |
| cbc:Line | | Dirección completa punto de partida | 1 | an..100 | | x | |
| **/Invoice/cac:DeliveryTerms** | | | 0..n | | | | |
| cbc:ID | | Número de registro MTC | | | | x | |
| cbc:Amount | | Monto Referencial | 0..1 | | | x | |
| | @currencyID | Moneda del valor referencial | 0..1 | PEN | | x | |
| cbc:StreetName | | Dirección entrega (Calle/Detallada) | 0..1 | | | x | |
| cbc:CitySubdivisionName | | Dirección entrega (Urbanización) | 0..1 | | | x | |
| cbc:CityName | | Dirección entrega (Provincia) | 0..1 | | | x | |
| cbc:CountrySubentity | | Dirección entrega (Departamento) | 0..1 | | | x | |
| cbc:CountrySubentityCode | | Dirección entrega (Ubigeo) | 0..1 | n6 | Catálogo 13 | x | |
| cbc:District | | Dirección entrega (Distrito) | 0..1 | | | x | |
| cbc:IdentificationCode | | Dirección entrega (Código de país) | 0..1 | | Catálogo 04 | x | |
| **/Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount** | | | 0..n | | | | |
| cbc:ID | | Cuenta del banco de la nación (detracción) | 0..1 | | | x | |
| **/Invoice/cac:PaymentTerms** | | | 0..n | | | | |
| cbc:ID | | Código del bien o producto sujeto a detracción | 0..1 | n2 | Catálogo 54 | x | |
| cbc:PaymentPercent | | Porcentaje de la detracción | 0..1 | n(3,2) | | x | |
| cbc:Amount | | Monto de la detracción | 0..1 | n(12,2) | | x | |
| **/Invoice/cac:PrepaidPayment** | | | 0..n | | | | |
| cbc:ID | | Serie y número comprobante anticipo | 0..1 | (Formatos Varios) | | x | |
| cbc:PaidAmount | | Monto prepagado o anticipo | 0..1 | n(15,2) | | x | |
| cbc:InstructionID | | NUC del emisor del comprobante anticipo | 0..1 | n11 | | x | |
| **/Invoice/cac:AllowanceCharge** | | | 0..n | | | | |
| cbc:ChargeIndicator | | Indicador cargo/descuento global | 1 | "true"/"false" | Catálogo 53 | x | x |
| cbc:AllowanceChargeReasonCode | | Código motivo cargo/descuento global | 0..1 | an..2 | Catálogo 53 | x | x |
| cbc:MultiplierFactorNumeric | | Factor del cargo/descuento | 0..1 | n(3,5) | Catálogo 53 | x | |
| cbc:Amount | | Monto del cargo/descuento global | 1 | n(12,2) | | x | x |
| cbc:BaseAmount | | Monto base del cargo/descuento global | 1 | n(12,2) | | x | |
| **/Invoice/cac:TaxTotal** | | | 0..n | | | | |
| cbc:TaxAmount | | Monto total de impuestos | 1 | n(12,2) | | x | x |
| **/Invoice/cac:TaxTotal/cac:TaxSubtotal** | | | 0..n | | | | |
| cbc:TaxableAmount | | Monto operaciones (Grav/Exon/Inaf) | 0..1 | | | x | |
| cbc:TaxAmount | | Monto total del impuesto | 1 | n(12,2) | | x | |
| **/Invoice/cac:TaxTotal/.../cac:TaxCategory/cac:TaxScheme** | | | 1 | | | | |
| cbc:ID | | Código de tributo | 0..1 | an..3 | Catálogo 05 | x | x |
| cbc:Name | | Nombre de tributo | 0..1 | an..6 | Catálogo 05 | x | x |
| cbc:TaxTypeCode | | Código internacional tributo | 0..1 | an4 | Catálogo 05 | x | x |
| **/Invoice/cac:LegalMonetaryTotal** | | | 1 | | | | |
| cbc:LineExtensionAmount | | Total valor de venta | 0..1 | n(12,2) | | x | x |
| cbc:TaxInclusiveAmount | | Total precio de venta (con impuestos) | 0..1 | n(12,2) | | x | x |
| cbc:AllowanceTotalAmount | | Monto total de descuentos | 0..1 | n(12,2) | | x | x |
| cbc:ChargeTotalAmount | | Monto total de otros cargos | 0..1 | n(12,2) | | x | x |
| cbc:PrepaidAmount | | Monto total de anticipos | 0..1 | n(15,2) | | x | |
| cbc:PayableAmount | | Importe total de la venta/servicio | 1 | n(12,2) | | x | x |
| **/Invoice/cac:InvoiceLine** | | | 1..n | | | | |
| cbc:ID | | Número de orden del ítem | 1 | n..3 | | x | |
| cbc:InvoicedQuantity | | Cantidad de unidades del ítem | 0..1 | n(12,10) | | x | |
| | @unitCode | Código de unidad de medida | 0..1 | an..3 | Catálogo 03 | x | |
| cbc:LineExtensionAmount | | Valor de venta del ítem | 1 | n(12,2) | | x | x |
| **/Invoice/cac:InvoiceLine/cac:PricingReference/...** | | | 0..n | | | | |
| cbc:PriceAmount | | Precio unitario / Valor referencial | 1 | n(12,10) | | x | x |
| cbc:PriceTypeCode | | Código de tipo de precio | 0..1 | an2 | Catálogo 16 | x | |
| **/Invoice/cac:InvoiceLine/.../cac:PartyIdentification** | | | 0..1 | | | | |
| cbc:ID | | Numero de documento del huesped | | | | x | |
| | @schemeID | Código tipo documento huesped | 0..1 | an1 | Catálogo 06 | x | |
| | @schemeAgencyID | Código país emisión pasaporte | 0..1 | an2 | Catálogo 04 | x | |
| **/Invoice/cac:InvoiceLine/.../cac:Person** | | | 0..1 | | | | |
| cbc:ID | | Paquete turístico - Doc. Identidad | | | | x | |
| cbc:FirstName | | Paquete turístico - Nro Doc. Identidad | 1 | an..100 | | x | |
| **/Invoice/cac:InvoiceLine/.../cac:ShipmentStage** | | | 0..n | | | | |
| cbc:ID | | Número de Asiento (Transporte Pasajeros) | 0..1 | an..100 | | x | |
| **/Invoice/cac:InvoiceLine/.../cac:PlannedDepartureTransportEvent** | | | 0..1 | | | | |
| cbc:OccurrenceDate | | Fecha de inicio programado | 0..1 | yyyy-mm-dd | | x | |
| cbc:OccurrenceTime | | Hora de inicio programado | 0..1 | hh:mm:ss.0z | | x | |
| **/Invoice/cac:InvoiceLine/.../cac:PassengerPerson** | | | 0..n | | | | |
| cbc:ID | | Numero documento identidad pasajero | | | Catálogo 06 | x | |
| cbc:FirstName | | Nombres y apellidos del pasajero | 0..1 | an..100 | | x | |
| **/Invoice/cac:InvoiceLine/cac:AllowanceCharge** | | | 0..n | | | | |
| cbc:ChargeIndicator | | Indicador cargo/descuento ítem | 1 | "true"/"false" | Catálogo 53 | x | |
| cbc:Amount | | Monto del cargo/descuento ítem | 1 | n(12,2) | | x | |
| **/Invoice/cac:InvoiceLine/cac:TaxTotal** | | | 0..n | | | | |
| cbc:TaxAmount | | Monto de tributo del ítem | 1 | n(12,2) | | x | x |
| **/Invoice/cac:InvoiceLine/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory** | | | 1 | | | | |
| cbc:Percent | | Porcentaje del impuesto | 0..1 | n(3,5) | | x | x |
| cbc:TaxExemptionReasonCode | | Código tipo afectación del IGV | 0..1 | an2 | Catálogo 07 | x | x |
| cbc:TierRange | | Código tipo sistema de ISC | 0..1 | an2 | Catálogo 08 | x | |
| **/Invoice/cac:InvoiceLine/cac:Item** | | | 1 | | | | |
| cbc:Description | | Descripción detallada del bien/servicio | 0..n | an..250 | | x | x |
| **/Invoice/cac:InvoiceLine/cac:Item/cac:SellersItemIdentification** | | | 0..1 | | | | |
| cbc:ID | | Código de producto del ítem | 1 | an..30 | | x | |
| **/Invoice/cac:InvoiceLine/cac:Item/cac:CommodityClassification** | | | 0..1 | | | | |
| cbc:ItemClassificationCode | | Código de producto (SUNAT) | 1 | n8 | | x | |
| **/Invoice/cac:InvoiceLine/cac:Item/cac:AdditionalItemProperty** | | | 0..n | | | | |
| cbc:Name | | Nombre del concepto tributario | 1 | an..100 | | x | |
| cbc:NameCode | | Código concepto tributario (del ítem) | 0..1 | n4 | Catálogo 55 | x | |
| cbc:Value | | Valor de la propiedad del ítem | 0..1 | an..100 | | x | |
| cbc:ValueQualifier | | Código del concepto del ítem | 0..n | an..4 | Catálogo 54 | x | |
| **/Invoice/cac:InvoiceLine/cac:Price** | | | 0..1 | | | | |
| cbc:PriceAmount | | Valor unitario del ítem | 1 | n(12,10) | | x | x |
| | @currencyID | Código de moneda valor unitario | 1 | an3 | Catálogo 02 | x | x |