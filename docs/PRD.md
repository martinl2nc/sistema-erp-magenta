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
3. **Facturación**: Emitir facturas y boletas electrónicas conformes a SUNAT
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
- [x] Configurar detracciones para servicios sujetos
- [x] Envío automático a SUNAT via API ApisPeru
- [x] Verificar estado del comprobante en SUNAT
- [x] Emitir notas de crédito para rectificaciones

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
- [x] Términos y condiciones padrão

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
| `vendedores` | Registro de vendedores vinculados a auth.users |
| `perfiles_usuario` | Perfiles con rol (admin/vendedor) |
| `productos` | Catálogo de productos |
| `categorias_productos` | Categorías de productos |
| `cotizaciones` | Cabecera de cotizaciones |
| `cotizacion_lineas` | Líneas de detalle de cotizaciones |
| `pedidos` | Cabecera de pedidos |
| `pedido_lineas` | Líneas de detalle de pedidos |
| `facturas` | Cabecera de comprobantes emitidos |
| `factura_lineas` | Líneas de detalle de facturas |
| `empresa_configuracion` | Configuración singleton de la empresa |

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
- Roles diferenciados: admin (acceso total) / vendedor (limitado)
- Contraseñas hasheadas
- Sesiones con JWT

### Usabilidad
- Interfaz intuitiva basada en modales
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

---

## 13. Glosario

| Término | Definición |
|---------|------------|
| **Cotización** | Documento comercial que detalla productos, precios y condiciones para un cliente potencial |
| **Pedido** | Confirmación de compra derivada de una cotización aprobada |
| **Factura electrónica** | Comprobante de pago tipo 01 emitido electrónicamente a SUNAT |
| **Boleta electrónica** | Comprobante de pago tipo 03 emitido electrónicamente a SUNAT |
| **Nota de crédito** | Documento que rectifica una factura/boleta (anulación o descuento) |
| **Detracción** | Descuento del 10% (aprox.) que el cliente deduce y paga a SUNAT por servicios específicos |
| **CDR** | Constancia de Recepción — respuesta de SUNAT confirmando recepción del comprobante |
| **IGV** | Impuesto General a las Ventas — 18% en Perú |
| **SUNAT** | Superintendencia Nacional de Aduanas y de Administración Tributaria |

---

*Documento generado el 6 de abril de 2026*
