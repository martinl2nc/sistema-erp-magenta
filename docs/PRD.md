# PRD — Sistema de Cotizaciones v2

## 1. Resumen Ejecutivo

**Sistema de Cotizaciones v2** es una aplicación web desarrollada en Next.js 16 (App Router) para la gestión integral del ciclo de ventas de una empresa comercial en Perú. El sistema permite crear cotizaciones, convertirlas en pedidos, emitir comprobantes de pago electrónicos (facturas/boletas) y gestionar clientes, productos y vendedores.

La aplicación está diseñada para pequenas y medianas empresas Peruvianas que necesitan automatizar su proceso de ventas y emitir comprobantes electrónicos conformes a la SUNAT.

---

## 2. Contexto del Negocio

### Problema
Las empresas Peruanas enfrentan múltiples desafíos en su proceso de ventas:
- Gestión manual de cotizaciones en hojas de cálculo o documentos físicos
- Seguimientotedioso del estado de cada cotización (Borrador → Enviada → Aprobada → Cancelada)
- Generación manual de facturas y boletas electrónicas
- Dificultad para rastrear el historial de ventas por cliente o vendedor
- Cumplimiento fiscal complejo con la SUNAT

### Solución
Un sistema web integral que automatiza todo el ciclo de ventas:
- Creación digital de cotizaciones con cálculo automático de totales (IGV, descuentos)
- Trackingvisual del estado de cada documento
- Conversiónun clic de cotizaciones aprobadas a pedidos
- Generaciónde comprobantes electrónicos directamente a SUNAT via API (ApisPeru)
- Dashboard analítico con métricas de ventas

---

## 3. Objetivos del Producto

### Objetivo Principal
Digitalizar y automatizar el proceso completo de ventas: desde la cotización inicial hasta la emisión del comprobante electrónico.

### Objetivos Específicos
1. **Cotizaciones**: Crear, editar, enviar por email y trackear estados
2. **Pedidos**: Convertir cotizaciones aprobadas en pedidos de venta
3. **Comprobantes**: Emitir facturas y boletas electrónicas (tabla `comprobantes`) conformes a SUNAT
4. **Gestión de datos**: Administrar clientes, productos, vendedores y configuración de empresa
5. **Análisis**: Visualizar métricas de ventas en tiempo real

---

## 4. Alcance del Producto

### Funcionalidades Incluidas

#### Módulo de Cotizaciones
- [x] Crear nueva cotización con líneas de productos
- [x] Editar cotización existente
- [x] Calcular subtotales, descuentos y IGV automáticamente
- [x] Agregar descuentos por línea y globales
- [x] Adjuntar términos y condiciones
- [x] Marcar como enviada, aprobada o cancelada
- [x] Enviar por email al cliente
- [x] Exportar a PDF
- [x] Convertir a pedido

#### Módulo de Pedidos
- [x] Crear pedido desde cotización aprobada
- [x] Editar líneas del pedido
- [x] Estados: Pendiente, Entregado, Cancelado
- [x] Historial de pedidos por cliente

#### Módulo de Facturación
- [x] Emitir Factura Electrónica (tipo 01)
- [x] Emitir Boleta Electrónica (tipo 03)
- [x] Seleccionar tipo de operación (gravado, exonerado, inafecto)
- [x] Facturación al Crédito con configuración y distribución automática de cuotas
- [x] Configurar detracciones para servicios sujetos
- [x] Envío automático a SUNAT via API ApisPeru
- [x] Verificar estado del comprobante en SUNAT
- [x] Emitir notas de crédito (Anulaciones totales, parciales por ítem y descuentos globales)

#### Módulo de Cobranzas
- [x] Dashboard de cuentas por cobrar y seguimiento de saldos
- [x] Registro de cobros referenciados a comprobantes
- [x] Identificación automática del estado de pago a nivel comprobante
- [x] Historial interactivo del progreso de pago con método, referencia y fechas
- [x] Visualización del cronograma de cuotas en el historial (facturas a crédito): estado Pagado/Vencida/Pendiente calculado por lógica waterfall acumulativa
- Para un detalle técnico completo, consulta: `@[docs/prd_modulo_cobros.md]`

#### Módulo de Clientes y Vendedores
- [x] Registro de clientes con RUC/DNI
- [x] Datos de contacto (nombre, email, teléfono, dirección)
- [x] Registro de vendedores con usuario y contraseña
- [x] Asignación de clientes a vendedores
- [x] Roles: Administrador / Vendedor

#### Módulo de Productos
- [x] Catálogo de productos/servicios
- [x] Precios unitarios y unidades de medida
- [x] Categorías y subcategorías
- [x] Control de stock (futuro)

#### Módulo de Configuración
- [x] Datos de empresa (RUC, razón social, dirección)
- [x] Logo para PDFs
- [x] Cuentas bancarias para pagos
- [x] Cuenta del Banco de la Nación para detracciones
- [x] Términos y condiciones

#### Dashboard
- [x] Métricas de cotizaciones por estado
- [x] Ventas por período
- [x]Top clientes y productos
- [x] Alertas de documentos pendientes

### Funcionalidades Futuras (Roadmap)
- [ ] Módulo de notas de débido
- [ ] Control de inventario
- [ ] Reportes avanzados
- [ ] Integración con más métodos de pago
- [ ] App móvil responsive
- [ ] Exportación a Excel/CSV

---

## 5. Arquitectura Técnica

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Estilos | Tailwind CSS |
| Estado | TanStack Query v5 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Envío a SUNAT | API ApisPeru |
| Emails | Supabase Edge Functions |
| Despliegue | Vercel |

### Arquitectura de Capas

```
Page (Server Component) → Client Component → Hook (TanStack Query) → Service → Supabase
```

### Estructura de Archivos

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Grupo de rutas autenticadas
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── cotizaciones/  # Módulo de cotizaciones
│   │   ├── pedidos/      # Módulo de pedidos
│   │   ├── facturacion/  # Módulo de facturación
│   │   └── admin/        # Administración
│   ├── api/              # API Routes
│   └── login/            # Autenticación
├── components/            # Componentes reutilizables
│   ├── admin/            # Componentes de admin
│   ├── dashboard/        # Componentes del dashboard
│   └── quotes/           # Componentes de cotizaciones
├── features/              # Componentes de característica
│   ├── clients/          # Modal de cliente
│   ├── empresa/         # Configuración de empresa
│   ├── facturacion/     # Modal de facturación
│   ├── pedidos/         # Modal de pedidos
│   ├── products/        # Modal de productos
│   ├── quotes/          # Modal de cotizaciones
│   └── sellers/         # Modal de vendedores
├── hooks/                 # TanStack Query hooks
├── services/              # Lógica de negocio (capa 1)
├── lib/                   # Utilidades y clientes
├── types/                 # Tipos TypeScript
├── utils/                 # Utilidades (cálculos, formateo)
└── constants/             # Constantes globales
```

### Modelo de Datos Principal

#### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `clientes` | Registro de clientes |
| `perfiles_usuario` | Registro de usuarios con rol (admin/vendedor) |
| `productos` | Catálogo de productos |
| `categorias` | Categorías de productos |
| `cotizaciones` | Cabecera de cotizaciones |
| `cotizaciones_lineas` | Líneas de detalle de cotizaciones |
| `pedidos` | Cabecera de pedidos |
| `pedidos_lineas` | Líneas de detalle de pedidos |
| `comprobantes` | Cabecera de comprobantes emitidos (Facturas/Boletas) |
| `comprobantes_detalles` | Líneas de detalle de comprobantes |
| `comprobantes_cuotas` | Cuotas de pago para comprobantes emitidos al crédito |
| `cobros` | Historial de pagos para cuentas por cobrar |
| `cat_metodos_pago` | Catálogo de métodos de pago válidos (Cash, Transferencia, Yape...) |
| `cuentas_bancarias_empresa` | Cuentas bancarias habilitadas con moneda y detracciones |
| `empresa_configuracion` | Configuración singleton de la empresa |

#### 5.1 Estructura de Tablas Principales

A continuación se detalla la estructura de las columnas de las entidades core del sistema:

**Tabla: `productos`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `woo_product_id` | Integer | ID de producto en WooCommerce (opcional) |
| `sku` | String | Código de referencia |
| `nombre` | String | Nombre del producto |
| `descripcion` | Text | Descripción detallada |
| `categoria_id` | UUID | Relación con tabla `categorias` |
| `precio_base` | Numeric | Precio de venta base |
| `activo` | Boolean | Estado de disponibilidad |
| `unidad_medida` | String | Unidad SUNAT (NIU, KGM, etc.) |
| `afectacion_igv` | String | Tipo de afectación IGV |
| `fraccionable` | Boolean | Permite cantidades decimales |
| `fecha_creacion` | Timestamp | Fecha de registro |

**Tabla: `cotizaciones`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `numero_correlativo` | Integer | Número autoincremental para PDFs |
| `origen` | String | Origen (Interno, WooCommerce, etc.) |
| `woo_order_id` | Integer | ID de pedido en WooCommerce |
| `cliente_id` | UUID | Relación con tabla `clientes` |
| `vendedor_id` | UUID | Relación con `perfiles_usuario` |
| `fecha_emision` | Date | Fecha de creación del documento |
| `fecha_validez` | Date | Fecha de expiración |
| `estado` | Enum | Borrador, Enviada, Aprobada, Cancelada |
| `observaciones_pdf` | Text | Notas visibles en el documento |
| `aplica_igv` | Boolean | Si se calcula IGV (18%) |
| `subtotal` | Numeric | Suma de líneas sin impuestos |
| `descuento_global_monto` | Numeric | Descuento aplicado al total |
| `igv_monto` | Numeric | Monto total de IGV |
| `total_final` | Numeric | Monto total a pagar |
| `fecha_creacion` | Timestamp | Timestamp de sistema |
| `ultima_actualizacion` | Timestamp | Último cambio registrado |
| `seguimiento_automatico` | Boolean | Si se envía recordatorio por mail |

**Tabla: `pedidos`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `cotizacion_id` | UUID | Referencia a la cotización origen |
| `cliente_id` | UUID | Relación con tabla `clientes` |
| `vendedor_id` | UUID | Relación con `perfiles_usuario` (vendedor que atendió) |
| `numero_pedido` | Integer | Número autoincremental de pedido |
| `nro_oc_cliente` | String | Orden de compra del cliente |
| `sustento_url` | String | Link al archivo de sustento (PDF/IMG) |
| `sustento_nombre` | String | Nombre original del archivo |
| `observaciones` | Text | Notas internas |
| `fecha_pedido` | Date | Fecha de registro del pedido |
| `direccion_facturacion` | String | Dirección específica para el comprobante |
| `aplica_igv` | Boolean | Si el pedido incluye IGV |
| `subtotal` | Numeric | Monto neto |
| `descuento_global_monto` | Numeric | Descuento total |
| `descuento_global_codigo` | String | Código de cargo/descuento SUNAT |
| `igv_monto` | Numeric | Impuesto total |
| `total_final` | Numeric | Total a facturar |
| `estado` | Enum | pendiente_facturacion, procesando, facturado, error_facturacion, anulado |
| `motivo_anulacion` | Text | Razón por la cual se anuló el pedido |
| `anulado_por` | UUID | Relación con `perfiles_usuario` (quién anuló el pedido) |
| `fecha_anulacion` | Timestamp | Fecha y hora de la anulación |
| `fecha_creacion` | Timestamp | Timestamp de sistema |
| `ultima_actualizacion` | Timestamp | Último cambio |

**Tabla: `comprobantes`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `pedido_id` | UUID | Relación con el pedido |
| `cliente_id` | UUID | Relación con cliente |
| `tipo_doc_codigo` | String | SUNAT: 01 (Factura), 03 (Boleta), 07 (NC) |
| `serie` | String | Serie del documento (ej: F001) |
| `correlativo` | Integer | Número correlativo |
| `serie_numero` | String | Formato completo (EJ: F001-00000001) |
| `comprobante_referencia_id` | UUID | ID del comprobante que rectifica (para NC) |
| `motivo_nota` | String | Razón de la nota de crédito (texto explicativo) |
| `tipo_nota_codigo` | String | Código SUNAT del tipo de nota de crédito (01, 02, etc.) |
| `tipo_nota_debito_codigo` | String | Código SUNAT del tipo de nota de débito |
| `fecha_emision` | Date | Fecha de emisión SUNAT |
| `fecha_vencimiento` | Date | Fecha de vencimiento de pago |
| `tipo_moneda` | String | PEN, USD |
| `forma_pago` | String | Contado, Crédito |
| `total_final` | Numeric | Monto final pagado (mto_imp_venta) |
| `mto_oper_gravadas` | Numeric | Base imponible gravada |
| `mto_oper_exoneradas` | Numeric | Base exonerada |
| `mto_oper_inafectas` | Numeric | Base inafecta |
| `mto_igv` | Numeric | Impuesto general a las ventas |
| `icbper` | Numeric | Impuesto a las bolsas plásticas |
| `mto_isc` | Numeric | Impuesto selectivo al consumo |
| `total_impuestos` | Numeric | Suma de impuestos |
| `valor_venta` | Numeric | Valor total sin impuestos |
| `subtotal` | Numeric | Monto antes de impuestos |
| `descuento_global_monto` | Numeric | Descuento aplicado al total del comprobante |
| `descuento_global_codigo` | String | Código de cargo/descuento SUNAT |
| `enlace_pdf` | String | URL del PDF generado |
| `enlace_xml` | String | URL del XML firmado |
| `enlace_cdr` | String | URL de la constancia de recepción |
| `apisperu_response` | JSONB | Respuesta íntegra del API |
| `estado_sunat` | Enum | borrador, aceptada_sunat, rechazada_sunat, etc. |
| `estado_pago` | String | (Gestionado por DB Trigger) Pendiente, Parcial, Pagado |
| `detraccion_monto` | Numeric | Monto de la detracción calculada |
| `detraccion_porcentaje` | Numeric | Porcentaje de detracción aplicado |
| `detraccion_cod_bien` | String | Código SUNAT de bien/servicio sujeto a detracción |
| `detraccion_cuenta_bn` | String | Cuenta del BN para el depósito |
| `origen_emision` | String | Manual, WooCommerce, Interno |
| `cod_establecimiento_anexo` | String | Código de establecimiento SUNAT (por defecto 0000) |

**Tabla: `comprobantes_cuotas`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `comprobante_id` | UUID | Relación con el comprobante relacionado |
| `numero_cuota` | Integer | Número correlativo de la cuota |
| `moneda` | String | PEN o USD |
| `monto` | Numeric | Monto a pagar en la cuota |
| `fecha_pago` | Date | Fecha de vencimiento de la cuota |

**Tabla: `cobros`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `comprobante_id` | UUID | Comprobante facturado que se está pagando |
| `metodo_pago_codigo` | String | Relación con `cat_metodos_pago` |
| `cuenta_bancaria_id` | UUID | (Opcional) A qué cuenta ingresó el dinero |
| `monto_cobrado` | Numeric | Monto del abono |
| `fecha_pago` | Date | Fecha real en la que el cliente pagó |
| `referencia_operacion` | String | Número de operación o voucher |
| `comprobante_img_url` | String | URL de la imagen del voucher en Supabase Storage |
| `notas` | Text | Observaciones adicionales del cobro |
| `registrado_por` | UUID | Quién registró el cobro (perfiles_usuario) |
| `created_at` | Timestamp | Fecha de registro en sistema |

**Tabla: `cuentas_bancarias_empresa`**
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `banco` | String | Banco de destino |
| `numero_cuenta` | String | Número de cuenta |
| `cci` | String | Código de cuenta interbancaria |
| `moneda` | String | PEN o USD |
| `es_detraccion` | Boolean | Indica si es cuenta de detracción del BN |
| `activo` | Boolean | Soft delete |

#### Tablas de Catálogo (SUNAT)

| Tabla | Descripción |
|-------|-------------|
| `cat_unidades_medida` | Unidades (NIU, KGM, LTS, etc.) |
| `cat_tipo_afectacion_igv` | Tipos de afectación IGV |
| `cat_tipo_documento` | Tipos de documento (01, 03, 07, 08) |
| `cat_tipo_nota_credito` | Tipos de nota de crédito |
| `cat_cargos_descuentos` | Cargos y descuentos globales |
| `cat_tipo_operacion` | Tipos de operación (0101, 0102, etc.) |
| `cat_bien_servicio_detraccion` | Bienes/servicios sujetos a detracción |

---

## 6. Flujo de Usuario

### Flujo Principal: Cotización → Pedido → Factura

```
1. Vendedor crea cotización
   ├── Agrega cliente (existente o nuevo)
   ├── Agrega líneas de productos
   ├── Aplica descuentos (opcional)
   ├── Sistema calcula subtotal, IGV, total
   └── Guarda como "Borrador"

2. Vendedor envía cotización al cliente
   ├── Marca como "Enviada"
   ├── Envía por email (PDF adjunto)
   └── Cliente recibe y revisa

3. Cliente aprueba → Vendedor marca como "Aprobada"

4. Vendedor convierte a pedido
   ├── Crea pedido desde cotización
   ├── Define fecha de entrega
   └── Estado inicial: "Pendiente"

5. Cliente paga → Vendedor emite comprobante
   ├── Abre modal de facturación
   ├── Selecciona tipo (Factura/Boleta)
   ├── Completa datos de detracción (si aplica)
   ├── Sistema genera JSON para SUNAT
   ├── Envía a ApisPeru → SUNAT
   └── Obtiene CDR y XML

6. Proceso completo ✓
```

### Flujo de Usuario: Nota de Crédito

```
1. Cliente solicita rectificación
2. Administrador crea nota de crédito
3. Selecciona factura a rectificar
4. Elige tipo (01=Anulación, 02=Descuento)
5. Ingresa motivo y monto
6. Envía a SUNAT
7. Obtiene CDR
```

---

## 7. Requisitos No Funcionales

### Rendimiento
- Tiempo de carga de página < 2 segundos
- Respuesta de API < 500ms
- Actualización de datos en tiempo real

### Seguridad
- Autenticación via Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Roles diferenciados en `perfiles_usuario`: admin (acceso total) / vendedor (limitado)
- Contraseñas hasheadas
- Sesiones con JWT

### Usabilidad
- Interfaz intuitiva basada en modales
- Paginación soportada de principio a fin en todas las tablas de datos
- Feedback visual inmediato (toast notifications)
- Diseño responsive (mobile-friendly)
- Tema oscuro por defecto

### Escalabilidad
- Código modular y mantenible
- Separación clara de capas
- Variables de entorno para configuración
- Ready para multi-tenant (futuro)

---

## 8. Integraciones

### Supabase
- **Auth**: Gestión de usuarios y sesiones
- **Database**: PostgreSQL con RLS
- **Storage**: Almacenamiento de logos y adjuntos
- **Edge Functions**: Lógica server-side para emails y webhooks

### ApisPeru (SUNAT)
- **Endpoint**: API REST para facturación electrónica
- **Operaciones**:
  - `sendInvoice`: Enviar factura/boleta
  - `sendCreditNote`: Enviar nota de crédito
  - `getStatus`: Consultar estado en SUNAT
- **Formatos**: JSON → SUNAT XML → CDR

---

## 9. Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Administrador** | Acceso completo a todos los módulos. Gestión de usuarios, configuración de empresa, reportes |
| **Vendedor** | Crear/modificar cotizaciones y pedidos propios. Ver clientes asignados. Emitir comprobantes |

### Restricciones por Rol
- Vendedores solo ven sus propias cotizaciones/pedidos
- Vendedor no puede acceder a configuración de empresa
- Vendedor no puede eliminar clientes/productos
- Campo `vendedor_id` se autocompleta con el usuario actual

---

## 10. Métricas del Producto

### KPIs Principales
- **Cotizaciones creadas**: Número de cotizaciones por período
- **Tasa de conversión**: % de cotizaciones que se convierten en pedidos
- **Ticket promedio**: Valor promedio por transacción
- **Comprobantes emitidos**: Facturas + boletas por período
- **Tiempo de emisión**: Tiempo promedio desde pedido hasta comprobante

### Métricas de Negocio
- Ventas totales por mes/trimestre/año
- Top 10 clientes por facturación
- Top 10 productos más vendidos
- Desempeño por vendedor
- Estado de cotizaciones (Borrador/Enviada/Aprobada/Cancelada)

---

## 11. Consideraciones Legales (SUNAT)

### Comprobantes Electrónicos
- Solo se emitirán comprobantes tipo 01 (Factura) y 03 (Boleta)
- Los comprobantes se firman digitalmente via ApisPeru
- CDR (Constancia de Recepción) se almacena como respaldo

### Detracciones
- Servicios sujetos a detracción (Cat. 54 SUNAT)
- Porcentaje de detracción según tipo de servicio
- Cuenta del Banco de la Nación configurable

### Plazos
- Comprobantes deben enviarse a SUNAT dentro de las 72 horas
- Nota de crédito debe emitirse dentro de los 7 días

---

## 12. Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0.0 | 2025 | Lanzamiento inicial con cotizaciones, pedidos y facturación básica |
| 1.1.0 | 2026 | Añadido módulo de detracciones y notas de crédito |
| 1.2.0 | 2026-04-18 | Cronograma de cuotas en historial de cobranzas (waterfall acumulativo) |

---

## 13. Glosario

| Término | Definición |
|---------|------------|
| **Cotización** | Documento comercial que detalla productos, precios y condiciones para un cliente potencial |
| **Pedido** | Confirmación de compra derivada de una cotización aprobada |
| **Factura electrónica** | Comprobante de pago tipo 01 emitido electrónicamente a SUNAT (tabla `comprobantes`) |
| **Boleta electrónica** | Comprobante de pago tipo 03 emitido electrónicamente a SUNAT (tabla `comprobantes`) |
| **Nota de crédito** | Documento que rectifica una factura/boleta (anulación o descuento) |
| **Detracción** | Descuento del 10% (aprox.) que el cliente deduce y paga a SUNAT por servicios específicos |
| **CDR** | Constancia de Recepción — respuesta de SUNAT confirmando recepción del comprobante |
| **IGV** | Impuesto General a las Ventas — 18% en Perú |
| **SUNAT** | Superintendencia Nacional de Aduanas y de Administración Tributaria |

---

*Documento generado el 16 de abril de 2026*
