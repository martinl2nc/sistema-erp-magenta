

# PRD — Módulo de Compras y Gastos (Cuentas por Pagar)
**Fase 1: Registro Directo y Flujo Financiero**

## 1. Resumen Ejecutivo
El **Módulo de Compras y Gastos** expande el Sistema de Cotizaciones v2 convirtiéndolo en una herramienta de gestión financiera integral (Mini-ERP). En esta Fase 1, el enfoque es puramente financiero: permitir a la empresa registrar sus gastos, compras de mercadería y pagos a proveedores. 

La arquitectura de este módulo se ha diseñado como un **espejo del módulo de Ventas**, lo que garantizará en el futuro una integración directa (Fase 2 fuera del alcance de la iteración actual) con lectores automáticos de facturas electrónicas XML (UBL 2.1 de SUNAT) enviados por los proveedores.
Fase 3 (fuera del alcance de la iteración actual), en la cual se completará el flujo logístico Procure-to-Pay mediante la implementación de los módulos de Cotizaciones de Proveedores y emisión de Órdenes de Compra (OC).

## 2. Objetivos del Producto
1. **Control de Obligaciones:** Gestionar y visualizar un *Aging Report* de Cuentas por Pagar.
2. **Proyección Fiscal:** Registrar el crédito fiscal (IGV de compras) para ayudar a proyectar el pago de impuestos mensuales.
3. **Control de Gastos:** Categorizar en qué se va el dinero de la empresa (Servicios, Mercadería, Planilla, etc.).
4. **Escalabilidad (XML Ready):** Usar la misma estructura de datos de las ventas para reciclar componentes UI y preparar el sistema para parsear facturas electrónicas automáticamente.

---

## 3. Alcance

### 3.1. Funcionalidades Incluidas (Fase 1)
- **Gestión de Proveedores:** CRUD de proveedores (espejo de clientes) en la sección de administración.
- **Registro de Compras/Gastos:** Ingreso manual de comprobantes (Facturas, Boletas, Recibos por Honorarios, Recibos de Servicios).
- **Categorización:** Clasificación del gasto para reportes financieros.
- **Adjuntos:** Subida de PDF y/o XML de la factura al bucket de Storage.
- **Registro de Pagos (Egresos):** Registro de salidas de dinero desde las cuentas bancarias de la empresa hacia los proveedores.
- **Dashboard de Compras:** Listado general con estados de pago (Pendiente, Parcial, Pagado).

### 3.2. Fuera de Alcance (Roadmap - Fases Posteriores)
- Lectura y autocompletado automatizado de archivos XML de proveedores.
- Cotizaciones de Compra (RFQ de proveedores).
- Emisión y Aprobación de Órdenes de Compra (OC).
- Ingreso automático de stock al Kardex.

---

## 4. Arquitectura de Base de Datos

Se implementarán 5 nuevas tablas en Supabase PostgreSQL, manteniendo simetría total con el núcleo de facturación existente.

### 4.1. Catálogo de Proveedores (`proveedores`)
*Diseñada como espejo exacto de la tabla `clientes`, sumando datos financieros.*
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `tipo_documento` | String | DNI, RUC, etc. (Por defecto 'RUC') |
| `numero_documento` | String | Número de documento (Unique) |
| `razon_social` | String | Nombre legal o Razón Social |
| `nombres_contacto` | String | Nombres del representante/vendedor |
| `apellidos_contacto` | String | Apellidos del representante/vendedor |
| `email` | String | Correo para notificaciones y facturación |
| `telefono` | String | Teléfono de contacto |
| `direccion` | Text | Dirección física/fiscal |
| `ubigueo` | String | Código de ubicación geográfica |
| `banco_predeterminado` | String | Banco principal para realizarle pagos |
| `cuenta_bancaria` | String | Número de cuenta corriente/ahorros |
| `cuenta_cci` | String | Código de Cuenta Interbancaria |
| `cuenta_detraccion_bn` | String | Cuenta del Banco de la Nación para detracciones |
| `fecha_creacion` | Timestamptz | Timestamp de sistema |
| `activo` | Boolean | Estado (Soft delete) |

### 4.2. Categorías de Gasto (`cat_categorias_gasto`)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `nombre` | String | Ej: Mercadería, Servicios Públicos, Planilla, Operatividad, Activos Fijos, Otros |

### 4.3. Cabecera de Compras (`comprobantes_compras`)
*Diseñada como espejo de `comprobantes` (Ventas), omitiendo campos de envío API.*
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `proveedor_id` | UUID | Relación con `proveedores` |
| `orden_compra_id` | UUID | Hook de escalabilidad para OC futuras |
| `categoria_gasto_id` | UUID | Relación con `cat_categorias_gasto` |
| `tipo_doc_codigo` | String | 01 (Fact), 02 (RxH), 03 (Bol), 14 (Servicios) |
| `serie` | String | Serie del documento del proveedor |
| `correlativo` | String | Número del documento (VARCHAR) |
| `serie_numero` | String | Unique constraint: `proveedor_id` + `serie_numero` |
| `comprobante_referencia_id` | UUID | Para Notas de Crédito de proveedores |
| `motivo_nota` | Text | Motivo si es NC |
| `tipo_nota_codigo` | String | Código SUNAT de NC |
| `fecha_emision` | Timestamptz | Fecha de emisión del documento |
| `fecha_vencimiento` | Timestamptz | Fecha límite de pago |
| `tipo_moneda` | String | PEN o USD |
| `tipo_cambio` | Numeric | TC del día (Crítico para compras en USD) |
| `forma_pago` | String | Contado, Crédito |
| `mto_oper_gravadas` | Numeric | Base imponible |
| `mto_oper_exoneradas` | Numeric | Base exonerada |
| `mto_oper_inafectas` | Numeric | Base inafecta |
| `mto_igv` | Numeric | IGV total de la compra |
| `icbper` | Numeric | Impuesto a bolsas |
| `mto_isc` | Numeric | Impuesto selectivo al consumo |
| `total_impuestos` | Numeric | Suma de impuestos |
| `valor_venta` | Numeric | Total sin impuestos |
| `subtotal` | Numeric | Monto antes de impuestos |
| `mto_imp_venta` | Numeric | Total final facturado a pagar |
| `descuento_global_monto`| Numeric | Descuento aplicado |
| `detraccion_cod_bien` | String | Si la compra está afecta a detracción |
| `detraccion_porcentaje` | Numeric | % de detracción retenida al proveedor |
| `detraccion_monto` | Numeric | Monto a depositar al BN |
| `archivo_xml_url` | Text | URL del XML recibido en Storage |
| `archivo_pdf_url` | Text | URL del PDF de la factura en Storage |
| `estado_pago` | Enum | Pendiente, Parcial, Pagado |
| `saldo_pendiente` | Numeric | Monto que falta pagar |
| `created_at` | Timestamptz | Fecha de registro en el sistema |

### 4.4. Detalles de la Compra (`comprobantes_compras_detalles`)
*Espejo de `comprobantes_detalles` (Ventas), preparado para mapeo directo de XML.*
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `comprobante_compra_id`| UUID | Relación con `comprobantes_compras` (Cascade) |
| `producto_id` | UUID | (Opcional) FK a `productos` para futuro Kardex |
| `cod_producto_proveedor`| String | El SKU original que usa el proveedor |
| `unidad_codigo` | String | Unidad SUNAT (NIU, KGM) |
| `descripcion` | String | Qué se compró |
| `cantidad` | Numeric | Cantidad adquirida |
| `mto_valor_unitario` | Numeric | Valor por unidad sin IGV |
| `mto_precio_unitario` | Numeric | Precio por unidad con IGV |
| `mto_valor_venta` | Numeric | Subtotal sin IGV (`cantidad` * `valor_unitario`) |
| `mto_base_igv` | Numeric | Base imponible de la línea |
| `porcentaje_igv` | Numeric | % de IGV (Generalmente 18) |
| `igv` | Numeric | IGV de la línea |
| `tip_afe_igv_codigo` | String | Afectación SUNAT (10, 20, 30) |
| `descuento` | Numeric | Descuento de la línea |
| `total_impuestos` | Numeric | Suma de impuestos de la línea |

#### 4.5. Pagos Emitidos (`pagos_emitidos`)

*Espejo exacto de la tabla `cobros` para mantener estandarización en auditoría y UI.*

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `comprobante_compra_id`| UUID | Relación con `comprobantes_compras` |
| `metodo_pago_codigo` | String | Relación con `cat_metodos_pago` |
| `cuenta_bancaria_id` | UUID | Relación con `cuentas_bancarias_empresa` (De dónde salió el dinero) |
| `monto_pagado` | Numeric | Monto desembolsado al proveedor |
| `fecha_pago` | Date | Fecha real en la que se pagó |
| `referencia_operacion` | String | Nro. de operación bancaria o cheque |
| `comprobante_img_url` | Text | Foto/PDF de la transferencia en Storage |
| `notas` | Text | Observaciones adicionales del pago |
| `registrado_por` | UUID | Relación con `perfiles_usuario` (quién registró el pago) |
| `created_at` | Timestamptz | Fecha de registro en el sistema |
| `anulado` | Boolean | Soft delete: `true` si el pago fue anulado |
| `anulado_por` | UUID | Relación con `perfiles_usuario` (admin que anuló) |
| `fecha_anulacion` | Timestamptz | Momento exacto de la anulación |
| `motivo_anulacion` | Text | Razón obligatoria ingresada al anular |
| `moneda` | String | Moneda del pago (PEN, USD) |

---

## 5. Reglas de Negocio

1. **Restricción de Duplicidad:** El sistema no debe permitir registrar dos veces el mismo comprobante (`serie_numero`) para el mismo `proveedor_id`.
2. **Reutilización UI/Componentes:** Aprovechando la simetría de la BD, se deben reutilizar en lo posible los hooks de cálculo de IGV, componentes de formulario de clientes y tarjetas de resumen que se usan en Facturación.
3. **Cálculo Abierto de IGV:** El UI debe calcular el IGV automáticamente, **pero los campos de impuestos deben ser editables**. Es crítico porque los sistemas de algunos proveedores redondean los céntimos de manera diferente.
4. **Detalle Implícito (Gastos):** Si el usuario registra una "Compra Rápida" (ej: recibo de luz) e ignora las líneas de detalle en el UI, el backend debe autogenerar una fila en `comprobantes_compras_detalles` con `cantidad=1` y descripción genérica para mantener la integridad relacional de cara al futuro parseo XML.
5. **Trigger de Saldos:** Las inserciones o anulaciones en `pagos_emitidos` deben actualizar automáticamente el `saldo_pendiente` y el `estado_pago` del comprobante padre, emulando el *waterfall* de las Cuentas por Cobrar.

---

## 6. Interfaz de Usuario (Rutas en Next.js)

### `/compras/dashboard`

- Panel resumen financiero: Total Compras del Mes, IGV Crédito Fiscal Acumulado, Total Cuentas por Pagar.

### `/administración/proveedores`

- Data Table con listado de proveedores.
- Modal para Crear/Editar Proveedor (Clon visual del CustomerForm actual).

### `/compras` (Historial de Compras)

- Tabla principal de registro.
- Columnas: Fecha Emisión, Proveedor, Comprobante, Categoría, Total, Estado Pago.

### `/compras/nuevo` (Formulario de Ingreso)

- Formulario con lógica idéntica a la emisión de facturas:
  1. Selección de Proveedor.
  2. Datos del Comprobante (Tipo, Serie, Correlativo, Fechas).
  3. Uploaders: Dropzone para cargar el XML o PDF de la factura.
  4. Tabla de Líneas de Detalle (Productos/Servicios adquiridos).
  5. Totales e Impuestos (Base, IGV Editable, Exonerados, Total Final).
  6. Selección de Categoría de Gasto.

### `/compras/pagos` (Cuentas por Pagar)

- Aging Report inverso. Muestra a quién le debemos dinero.
- Botón "Registrar Pago" que procesa el egreso.

---

## 7. Requisitos Técnicos Específicos

- **Backend (Supabase):** Implementación de una transacción RPC (`registrar_comprobante_compra`) que inserte la cabecera y el detalle de forma atómica.
- **Storage:** Crear el bucket `compras_adjuntos` para alojar los archivos `.pdf` y `.xml` que cargue el usuario.