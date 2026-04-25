# PRD — Módulo de Guías de Remisión Electrónica (GRE)
**Fase 1: Emisión de Guía Remitente desde Pedido/Comprobante**

---

## Estado de Implementación

| Componente | Estado | Notas |
| :--- | :--- | :--- |
| **Análisis y PRD** | ✅ Documentado | Este archivo |
| **BD — `cat_ubigeo`** | 🔜 Pendiente | Catálogo de ubigeos SUNAT/INEI (~1,874 distritos) — **adelantado de Fase 2** |
| **BD — `cat_motivo_traslado`** | 🔜 Pendiente | Catálogo SUNAT de motivos de traslado |
| **BD — `guias_remision`** | 🔜 Pendiente | Cabecera de la GRE |
| **BD — `guias_remision_lineas`** | 🔜 Pendiente | Bienes a trasladar |
| **BD — `cat_tipo_documento` INSERT** | 🔜 Pendiente | Agregar código `09` (GR Remitente) |
| **BD — `configuracion_series` INSERT** | 🔜 Pendiente | Agregar serie `T001` para tipo `09` |
| **Datos — `empresa_configuracion`** | ⚠️ Prerequisito | Completar `departamento`, `provincia`, `distrito` mediante selects en cascada desde `cat_ubigeo` — actualmente `NULL` |
| **Service — `guias-remision.service.ts`** | 🔜 Pendiente | Lógica de emisión + mapeo JSON ApisPeru |
| **Hook — `useUbigeo.ts`** | 🔜 Pendiente | Hook reutilizable para selects en cascada de ubigeo |
| **Hook — `useGuiasRemision.ts`** | 🔜 Pendiente | Queries y mutations con key factory |
| **UI — Selects en cascada de ubigeo** | 🔜 Pendiente | Componente `UbigeoSelector` reutilizable |
| **UI — Modal de emisión** | 🔜 Pendiente | Formulario en 2 pasos: datos traslado + bienes |
| **UI — Listado `/facturacion/guias`** | 🔜 Pendiente | Tabla de GREs emitidas con estado |
| **UI — Botón en detalle de pedido** | 🔜 Pendiente | Trigger de emisión desde contexto del pedido |

---

## 1. Resumen Ejecutivo

Las **Guías de Remisión Electrónicas (GRE)** son documentos SUNAT obligatorios para acreditar el traslado de bienes. Desde la reforma de 2022, SUNAT exige la versión electrónica para contribuyentes del Régimen General. El sistema debe poder emitirlas desde el contexto de un pedido o comprobante existente, siguiendo el mismo patrón de emisión ya implementado en el módulo de Facturación.

La API de emisión es **ApisPeru** (misma que Facturas/Boletas), usando el endpoint `POST /despatch` con `version: 2022`.

---

## 2. Contexto SUNAT

### Tipos de Guía (solo implementamos el tipo Remitente en Fase 1)

| Código SUNAT | Tipo | Serie | Quién la emite |
| :--- | :--- | :--- | :--- |
| `09` | GR Remitente | `T001`, `T002`... | El vendedor que despacha los bienes |
| `31` | GR Transportista | `V001`... | La empresa de transporte (fuera de alcance) |

### Motivos de traslado más comunes

| Código | Descripción |
| :--- | :--- |
| `01` | Venta |
| `02` | Compra |
| `04` | Traslado entre establecimientos de la misma empresa |
| `08` | Importación |
| `09` | Exportación |
| `13` | Otros (requiere descripción libre) |

### Modalidades de traslado

| Código | Descripción | Datos requeridos |
| :--- | :--- | :--- |
| `01` | Transporte público (tercero) | RUC transportista, placa vehículo, DNI conductor |
| `02` | Transporte privado (empresa propia) | Placa vehículo, DNI conductor |

---

## 3. Prerequisito Crítico: Dirección de Empresa Completa

La API v2022 de ApisPeru requiere el objeto `company.address` con `departamento`, `provincia` y `distrito` explícitos — **no solo el ubigueo**. Actualmente en la BD:

```
empresa_configuracion.departamento  → NULL ⚠️
empresa_configuracion.provincia     → NULL ⚠️
empresa_configuracion.distrito      → NULL ⚠️
empresa_configuracion.ubigueo       → '150101' ✅
```

**Acción requerida antes de implementar:** Completar estos 3 campos en la pantalla de Configuración de Empresa utilizando el componente `UbigeoSelector` (selects en cascada). Al seleccionar el distrito, el sistema obtiene automáticamente los 4 valores desde `cat_ubigeo` y los persiste juntos. Ver Sección 4.1 y Sección 8.2.

---

## 4. Arquitectura de Base de Datos

### 4.1. Nueva tabla: `cat_ubigeo`

Catálogo de ubigeos del Perú según el padrón SUNAT/INEI (~1,874 registros). Permite el lookup bidireccional: dado un código ubigeo se obtiene departamento/provincia/distrito, y dado departamento/provincia/distrito se obtiene el código.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `codigo` | `VARCHAR(6)` PK | Código ubigeo de 6 dígitos (ej: `150101`) |
| `departamento` | `VARCHAR(100)` NOT NULL | Nombre del departamento (ej: `LIMA`) |
| `provincia` | `VARCHAR(100)` NOT NULL | Nombre de la provincia (ej: `LIMA`) |
| `distrito` | `VARCHAR(100)` NOT NULL | Nombre del distrito (ej: `LIMA`) |
| `texto_busqueda` | `TEXT` GENERATED | Concatenación para búsqueda full-text |

**DDL completo:**

```sql
CREATE TABLE cat_ubigeo (
  codigo        VARCHAR(6)   PRIMARY KEY,
  departamento  VARCHAR(100) NOT NULL,
  provincia     VARCHAR(100) NOT NULL,
  distrito      VARCHAR(100) NOT NULL,
  texto_busqueda TEXT GENERATED ALWAYS AS (
    departamento || ' ' || provincia || ' ' || distrito
  ) STORED
);

-- Índice full-text para búsqueda por nombre
CREATE INDEX idx_ubigeo_fts ON cat_ubigeo
  USING gin(to_tsvector('spanish', texto_busqueda));

-- Índice para el select en cascada: nivel departamento
CREATE INDEX idx_ubigeo_departamento ON cat_ubigeo (departamento);

-- Índice para el select en cascada: nivel provincia
CREATE INDEX idx_ubigeo_provincia ON cat_ubigeo (departamento, provincia);
```

**Vistas de apoyo para los selects en cascada:**

```sql
-- Departamentos únicos (nivel 1 del select)
CREATE VIEW cat_ubigeo_departamentos AS
  SELECT DISTINCT departamento
  FROM cat_ubigeo
  ORDER BY departamento;

-- Provincias únicas por departamento (nivel 2 del select)
CREATE VIEW cat_ubigeo_provincias AS
  SELECT DISTINCT departamento, provincia
  FROM cat_ubigeo
  ORDER BY departamento, provincia;
```

**Seed inicial:** Importar el CSV oficial del padrón SUNAT/INEI. Fuente recomendada:

> `https://github.com/joseluisq/ubigeos-peru`

El repositorio provee el archivo `ubigeos.csv` con los ~1,874 distritos en formato compatible. Importar con:

```sql
COPY cat_ubigeo (codigo, departamento, provincia, distrito)
FROM '/ruta/ubigeos.csv'
DELIMITER ','
CSV HEADER;
```

**Lookup inverso (para pre-cargar selects desde un ubigeo existente):**

```sql
-- Dado un código ubigeo, obtener los tres niveles
SELECT departamento, provincia, distrito
FROM cat_ubigeo
WHERE codigo = '150101';
-- → LIMA | LIMA | LIMA
```

---

### 4.2. Nueva tabla: `cat_motivo_traslado`

Catálogo de motivos de traslado según SUNAT.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `codigo` | `VARCHAR(2)` PK | Código SUNAT (01, 02, 04, 08, 09, 13, etc.) |
| `descripcion` | `VARCHAR(100)` NOT NULL | Descripción oficial |
| `requiere_descripcion_libre` | `BOOLEAN` DEFAULT `false` | `true` si código = 13 (Otros) |
| `activo` | `BOOLEAN` DEFAULT `true` | Soft-disable |

**Seed inicial:**

```sql
INSERT INTO cat_motivo_traslado (codigo, descripcion, requiere_descripcion_libre) VALUES
('01', 'Venta',                                                          false),
('02', 'Compra',                                                         false),
('04', 'Traslado entre establecimientos de la misma empresa',            false),
('05', 'Consignación',                                                   false),
('06', 'Devolución',                                                     false),
('07', 'Recojo de bienes transformados',                                 false),
('08', 'Importación',                                                    false),
('09', 'Exportación',                                                    false),
('13', 'Otros',                                                          true),
('14', 'Venta sujeta a confirmación del comprador',                      false),
('18', 'Traslado de bienes para transformación',                         false);
```

---

### 4.3. Nueva tabla: `guias_remision`

Cabecera de la Guía de Remisión Electrónica. Modela exactamente los campos del JSON de ApisPeru v2022.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` PK | Identificador único |
| `serie` | `VARCHAR(4)` NOT NULL | Serie SUNAT (ej: `T001`) |
| `correlativo` | `INTEGER` NOT NULL | Número correlativo |
| `serie_numero` | `VARCHAR(20)` NOT NULL UNIQUE | Formato completo (ej: `T001-00000123`) |
| `fecha_emision` | `DATE` NOT NULL | Fecha de emisión del documento |
| `fecha_inicio_traslado` | `DATE` NOT NULL | **Obligatorio SUNAT.** Fecha en que se inicia el traslado físico |
| `observacion` | `TEXT` | Nota libre visible en el documento |
| **Origen del traslado** | | |
| `pedido_id` | `UUID` FK → `pedidos` | Pedido que origina el traslado (opcional) |
| `comprobante_id` | `UUID` FK → `comprobantes` | Comprobante relacionado (opcional) |
| `nro_doc_relacionado` | `VARCHAR(20)` | Serie-número del comprobante ref (ej: `F001-00016`). Se usa para `relDoc` en la API |
| `tipo_doc_relacionado` | `VARCHAR(2)` | Tipo doc SUNAT del comprobante ref (01, 03, etc.) |
| **Destinatario** | | |
| `cliente_id` | `UUID` NOT NULL FK → `clientes` | Destinatario del traslado |
| `destinatario_tipo_doc` | `VARCHAR(2)` NOT NULL | Tipo doc SUNAT: `6`=RUC, `1`=DNI |
| `destinatario_num_doc` | `VARCHAR(20)` NOT NULL | Número de documento del destinatario |
| `destinatario_razon_social` | `VARCHAR(200)` NOT NULL | Razón social o nombre del destinatario |
| **Dirección de llegada** | | |
| `dir_llegada_ubigueo` | `VARCHAR(6)` NOT NULL FK → `cat_ubigeo` | Código ubigeo SUNAT del punto de llegada |
| `dir_llegada_departamento` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_llegada_provincia` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_llegada_distrito` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_llegada_direccion` | `TEXT` NOT NULL | Dirección descriptiva del punto de llegada |
| **Dirección de partida** | | |
| `dir_partida_ubigueo` | `VARCHAR(6)` NOT NULL FK → `cat_ubigeo` | Código ubigeo del punto de partida (default: empresa) |
| `dir_partida_departamento` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_partida_provincia` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_partida_distrito` | `VARCHAR(100)` NOT NULL | Desnormalizado desde `cat_ubigeo` para rapidez |
| `dir_partida_direccion` | `TEXT` NOT NULL | Dirección del punto de partida |
| **Datos del envío** | | |
| `motivo_traslado_codigo` | `VARCHAR(2)` NOT NULL FK → `cat_motivo_traslado` | Código SUNAT del motivo |
| `motivo_traslado_desc` | `TEXT` | Descripción libre (requerida si código = 13) |
| `modalidad_traslado` | `VARCHAR(2)` NOT NULL | `01`=Público, `02`=Privado |
| `peso_bruto_total` | `NUMERIC(10,3)` NOT NULL | Peso total en KGM. Obligatorio SUNAT |
| `unidad_peso` | `VARCHAR(5)` NOT NULL DEFAULT `'KGM'` | Siempre KGM en la práctica |
| `numero_bultos` | `INTEGER` | Cantidad de bultos (opcional SUNAT) |
| `numero_contenedor` | `VARCHAR(50)` | Para traslado marítimo (opcional) |
| **Transportista (modalidad 01)** | | |
| `transportista_tipo_doc` | `VARCHAR(2)` | Tipo doc del transportista (usualmente `6`=RUC) |
| `transportista_num_doc` | `VARCHAR(20)` | RUC del transportista |
| `transportista_razon_social` | `VARCHAR(200)` | Razón social de la empresa de transporte |
| `transportista_placa` | `VARCHAR(10)` | Placa del vehículo |
| `conductor_tipo_doc` | `VARCHAR(2)` | Tipo doc del conductor (`1`=DNI) |
| `conductor_num_doc` | `VARCHAR(12)` | DNI del conductor |
| **Vehículo propio (modalidad 02)** | | |
| `vehiculo_propio_placa` | `VARCHAR(10)` | Placa del vehículo propio |
| `vehiculo_propio_conductor_doc` | `VARCHAR(12)` | DNI del conductor propio |
| **Estado SUNAT** | | |
| `estado_sunat` | `VARCHAR(50)` NOT NULL DEFAULT `'borrador'` | `borrador` → `enviando` → `aceptada_sunat` / `rechazada_sunat` |
| `enlace_pdf` | `TEXT` | URL del PDF en Storage |
| `enlace_xml` | `TEXT` | URL del XML firmado en Storage |
| `enlace_cdr` | `TEXT` | URL de la CDR en Storage |
| `apisperu_response` | `JSONB` | Respuesta completa de la API |
| **Auditoría** | | |
| `creado_por` | `UUID` FK → `perfiles_usuario` | Usuario que emitió |
| `created_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | Timestamp de creación |

**Constraint UNIQUE:** `(serie, correlativo)`.

> **Nota sobre desnormalización de departamento/provincia/distrito:** Los campos de dirección en `guias_remision` almacenan estos valores como snapshot en el momento de emisión. Esto evita joins en el historial de GREs y garantiza que un cambio futuro en `cat_ubigeo` no afecte documentos ya emitidos.

---

### 4.4. Nueva tabla: `guias_remision_lineas`

Detalle de bienes que se trasladan. Los detalles de la GRE no llevan precio — solo identificación y cantidad.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` PK | Identificador único |
| `guia_id` | `UUID` NOT NULL FK → `guias_remision(id) ON DELETE CASCADE` | Guía padre |
| `orden` | `INTEGER` NOT NULL | Orden del ítem en el documento |
| `pedido_linea_id` | `UUID` FK → `pedidos_lineas` | Referencia al origen (opcional, para trazabilidad) |
| `producto_id` | `UUID` FK → `productos` | Referencia al catálogo (opcional) |
| `descripcion` | `VARCHAR(500)` NOT NULL | Descripción del bien (snapshot al momento de emisión) |
| `unidad_codigo` | `VARCHAR(10)` NOT NULL DEFAULT `'NIU'` | Código SUNAT de unidad de medida |
| `cantidad` | `NUMERIC(12,3)` NOT NULL | Cantidad del bien |
| `codigo_producto` | `VARCHAR(50)` | SKU o código interno (opcional) |

---

### 4.5. Cambios en tablas existentes

```sql
-- 1. Nuevo tipo de documento
INSERT INTO cat_tipo_documento (codigo, descripcion, categoria)
VALUES ('09', 'Guía de Remisión Remitente', 'guia');

-- 2. Serie T001 para emisión de GRE
INSERT INTO configuracion_series (tipo_doc_codigo, serie, correlativo_actual, prefijo_esperado)
VALUES ('09', 'T001', 0, 'T');

-- 3. Completar address de empresa vía UbigeoSelector en UI de Configuración
-- empresa_configuracion.departamento, .provincia, .distrito → se completan con el selector en cascada
-- empresa_configuracion.ubigueo → ya existe y es la fuente de verdad para el pre-cargado inicial
```

> **Nota sobre `configuracion_series`:** La tabla ya tiene el mecanismo de correlativo atómico con RPC. La emisión de GRE reutilizará la misma RPC `emitir_comprobante` o una equivalente específica para tipo `09`.

---

## 5. Reglas de Negocio

1. **Solo se emite desde pedidos con comprobante asociado:** El flujo principal es Pedido → Comprobante emitido → Guía de Remisión. Aunque la GRE puede existir sin comprobante (ej: traslado interno, código 04), el caso de uso principal es post-facturación.

2. **Numeración atómica:** Igual que `comprobantes`, el correlativo se incrementa dentro de una transacción RPC para evitar duplicados concurrentes.

3. **Una GRE por despacho:** Un pedido puede tener múltiples GREs si los bienes se entregan en varios viajes. No hay restricción 1:1 entre pedido y guía.

4. **Los ítems de la GRE no tienen precio:** SUNAT prohíbe incluir valores monetarios en la GRE. Solo van descripción, cantidad y unidad. El precio está en la factura referenciada.

5. **Peso bruto obligatorio:** Si el usuario no conoce el peso exacto, debe al menos ingresar un valor estimado. El sistema no puede calcular el peso automáticamente.

6. **Modalidad 01 (transporte público):** Requiere obligatoriamente RUC del transportista, placa y DNI del conductor. La validación ocurre en el frontend antes de enviar.

7. **Modalidad 02 (transporte privado):** Solo requiere placa y DNI del conductor. No se envía objeto `transportista` en el JSON — la API lo interpreta como vehículo propio.

8. **`relDoc` en la GRE vs `guias` en la Factura:** Son referencias cruzadas bidireccionales. La GRE referencia la factura en `relDoc`. La factura puede incluir el número de GRE en su array `guias[]` (campo que ya existe en el JSON de factura según los docs de ApisPeru — ver `facturaRelGuiaRemision` en `comprobantes-api-docs.json`). En Fase 1 solo se gestiona el lado de la GRE; la vinculación inversa en la factura queda para Fase 2.

9. **Anulación:** Las GREs no se anulan con Nota de Crédito. SUNAT permite la "baja" vía `docBaja` en una nueva GRE. En Fase 1 no se implementa baja — se documenta como Roadmap.

10. **Ubigeo siempre desde `cat_ubigeo`:** Ningún campo de ubigeo (`dir_llegada_ubigueo`, `dir_partida_ubigueo`) se ingresa manualmente. El usuario selecciona departamento → provincia → distrito y el sistema resuelve el código. Si el cliente ya tiene ubigeo guardado, el `UbigeoSelector` se pre-carga vía lookup inverso.

---

## 6. Mapeo JSON ApisPeru v2022

El servicio `guias-remision.service.ts` construye este objeto para el `POST /despatch`:

```typescript
{
  version: 2022,
  tipoDoc: "09",
  serie: guia.serie,                          // "T001"
  correlativo: String(guia.correlativo),
  fechaEmision: guia.fecha_emision,           // ISO 8601 con timezone Lima

  company: {
    ruc: empresa.ruc,
    razonSocial: empresa.razon_social,
    nombreComercial: empresa.nombre_comercial ?? empresa.razon_social,
    address: {
      direccion: empresa.direccion,
      provincia: empresa.provincia,           // ✅ completado vía UbigeoSelector
      departamento: empresa.departamento,     // ✅ completado vía UbigeoSelector
      distrito: empresa.distrito,             // ✅ completado vía UbigeoSelector
      ubigueo: empresa.ubigueo,
    }
  },

  destinatario: {
    tipoDoc: guia.destinatario_tipo_doc,      // "6" o "1"
    numDoc: guia.destinatario_num_doc,
    rznSocial: guia.destinatario_razon_social,
  },

  observacion: guia.observacion ?? undefined,

  relDoc: guia.tipo_doc_relacionado ? {
    tipoDoc: guia.tipo_doc_relacionado,       // "01", "03", etc.
    nroDoc: guia.nro_doc_relacionado,         // "F001-00016"
  } : undefined,

  envio: {
    codTraslado: guia.motivo_traslado_codigo,
    desTraslado: guia.motivo_traslado_desc ?? motivoLabel,
    modTraslado: guia.modalidad_traslado,
    fecTraslado: guia.fecha_inicio_traslado,
    pesoTotal: guia.peso_bruto_total,
    undPesoTotal: guia.unidad_peso,           // "KGM"
    llegada: {
      ubigueo: guia.dir_llegada_ubigueo,
      direccion: guia.dir_llegada_direccion,
    },
    partida: {
      ubigueo: guia.dir_partida_ubigueo,
      direccion: guia.dir_partida_direccion,
    },
    // Solo si modalidad = "01"
    transportista: guia.modalidad_traslado === "01" ? {
      tipoDoc: guia.transportista_tipo_doc,
      numDoc: guia.transportista_num_doc,
      rznSocial: guia.transportista_razon_social,
      placa: guia.transportista_placa,
      choferTipoDoc: guia.conductor_tipo_doc,
      choferDoc: guia.conductor_num_doc,
    } : undefined,
  },

  details: lineas.map(l => ({
    cantidad: l.cantidad,
    unidad: l.unidad_codigo,
    descripcion: l.descripcion,
    codigo: l.codigo_producto ?? undefined,
  })),
}
```

---

## 7. Interfaz de Usuario

### Rutas

| Ruta | Componente | Descripción |
| :--- | :--- | :--- |
| `/facturacion/guias` | `GuiasRemisionPage` | Listado de todas las GREs emitidas, con filtros y estado |
| Modal desde `/pedidos/[id]` | `EmitirGuiaRemisionModal` | Formulario de emisión en contexto del pedido |
| Modal desde `/facturacion` | `EmitirGuiaRemisionModal` | Misma acción desde el listado de comprobantes |

### 7.1. Componente `UbigeoSelector`

Componente reutilizable de tres selects en cascada. Se usa en cualquier punto del sistema donde se requiera capturar una dirección con ubigeo válido (Configuración de Empresa, dirección de partida, dirección de llegada en el modal de GRE).

**Flujo visual:**

```
[Departamento ▼]  →  filtra  →  [Provincia ▼]  →  filtra  →  [Distrito ▼]
                                                                    ↓
                                              ubigeo se resuelve automáticamente
                                              (campo oculto o de solo lectura)
```

**Props:**

```typescript
interface UbigeoSelectorProps {
  // Valores controlados desde el padre
  value?: {
    ubigeo: string;        // '150101'
    departamento: string;
    provincia: string;
    distrito: string;
  };
  onChange: (val: {
    ubigeo: string;
    departamento: string;
    provincia: string;
    distrito: string;
  }) => void;
  disabled?: boolean;
  label?: string;          // Label del grupo (ej: "Dirección de llegada")
}
```

**Comportamiento:**
- Al cambiar el departamento se resetean provincia y distrito.
- Al cambiar la provincia se resetea el distrito.
- Al seleccionar el distrito, `onChange` se dispara con los 4 valores resueltos.
- Si se provee `value.ubigeo`, el componente hace un lookup inverso en `cat_ubigeo` para pre-seleccionar los tres niveles automáticamente.

---

### 7.2. `EmitirGuiaRemisionModal` — Flujo en 2 pasos

**Paso 1: Datos del traslado**
- Fecha de inicio de traslado (date picker, default hoy)
- Motivo de traslado (select de `cat_motivo_traslado`)
- Modalidad: Transporte Público / Privado (radio)
- Datos del transportista según modalidad:
  - Si Público: RUC empresa transporte (con lookup ApisPeru), placa, DNI conductor
  - Si Privado: placa vehículo propio, DNI conductor
- **Dirección de partida:** `UbigeoSelector` pre-cargado desde `empresa_configuracion` + campo de dirección descriptiva editable
- **Dirección de llegada:** `UbigeoSelector` pre-cargado desde el ubigeo del cliente (lookup inverso) + campo de dirección descriptiva editable
- Peso bruto total + unidad
- Número de bultos (opcional)
- Observación (opcional)

**Paso 2: Bienes a trasladar**
- Tabla pre-cargada desde `pedidos_lineas` del pedido origen
- Editable: descripción, unidad, cantidad
- Agregar/quitar ítems manualmente
- Resumen: total de ítems, total de bultos

**Acciones:**
- `Emitir Guía` → llama al service → estado `enviando` → ApisPeru → `aceptada_sunat` / error
- Muestra CDR, links a PDF y XML al completarse

### 7.3. `/facturacion/guias` — Listado

Columnas: Serie-Número | Fecha Emisión | Fecha Traslado | Destinatario | Motivo | Estado SUNAT | PDF | XML

Filtros: rango de fechas, motivo, estado SUNAT, búsqueda por destinatario o serie-número.

---

## 8. Arquitectura de Capas (patrón del sistema)

```
GuiasRemisionPage (Server Component)
  └─▶ GuiasRemisionClient (Client Component)
        └─▶ useGuiasRemision (TanStack Query)
              └─▶ guiasRemisionService (Service)
                    └─▶ Supabase + ApisPeru
```

### 8.1. Query Key Factory

```typescript
export const guiasRemisionKeys = {
  all:    ()          => ['guias-remision'] as const,
  lists:  ()          => [...guiasRemisionKeys.all(), 'list'] as const,
  list:   (params?)   => [...guiasRemisionKeys.lists(), params] as const,
  detail: (id: string)=> [...guiasRemisionKeys.all(), 'detail', id] as const,
};
```

### 8.2. Hook `useUbigeo`

Hook reutilizable que encapsula la lógica de los tres niveles en cascada. Usado internamente por `UbigeoSelector`.

```typescript
// hooks/useUbigeo.ts

interface UbigeoState {
  departamento: string;
  provincia:    string;
  distrito:     string;
  ubigeo:       string;
}

export function useUbigeo(initialUbigeo?: string) {
  const [state, setState] = useState<UbigeoState>({
    departamento: '',
    provincia:    '',
    distrito:     '',
    ubigeo:       '',
  });

  // Lookup inverso: si se provee un ubigeo inicial, pre-cargar los 3 niveles
  useEffect(() => {
    if (!initialUbigeo) return;
    supabase
      .from('cat_ubigeo')
      .select('departamento, provincia, distrito')
      .eq('codigo', initialUbigeo)
      .single()
      .then(({ data }) => {
        if (data) setState({ ...data, ubigeo: initialUbigeo });
      });
  }, [initialUbigeo]);

  // Nivel 1: departamentos (estático, se carga una vez)
  const { data: departamentos } = useQuery({
    queryKey: ['ubigeo', 'departamentos'],
    queryFn: () =>
      supabase.from('cat_ubigeo_departamentos').select('departamento'),
    staleTime: Infinity, // catálogo estático
  });

  // Nivel 2: provincias reactivas al departamento seleccionado
  const { data: provincias } = useQuery({
    queryKey: ['ubigeo', 'provincias', state.departamento],
    queryFn: () =>
      supabase
        .from('cat_ubigeo_provincias')
        .select('provincia')
        .eq('departamento', state.departamento),
    enabled: !!state.departamento,
    staleTime: Infinity,
  });

  // Nivel 3: distritos reactivos a departamento + provincia
  const { data: distritos } = useQuery({
    queryKey: ['ubigeo', 'distritos', state.departamento, state.provincia],
    queryFn: () =>
      supabase
        .from('cat_ubigeo')
        .select('codigo, distrito')
        .eq('departamento', state.departamento)
        .eq('provincia', state.provincia)
        .order('distrito'),
    enabled: !!state.provincia,
    staleTime: Infinity,
  });

  // Handlers con reset en cascada
  const handleDepartamento = (departamento: string) => {
    setState({ departamento, provincia: '', distrito: '', ubigeo: '' });
  };

  const handleProvincia = (provincia: string) => {
    setState(prev => ({ ...prev, provincia, distrito: '', ubigeo: '' }));
  };

  const handleDistrito = (codigo: string, distrito: string) => {
    setState(prev => ({ ...prev, distrito, ubigeo: codigo }));
  };

  return {
    state,
    departamentos: departamentos?.data ?? [],
    provincias:    provincias?.data ?? [],
    distritos:     distritos?.data ?? [],
    handleDepartamento,
    handleProvincia,
    handleDistrito,
  };
}
```

**Queries de Supabase que alimentan el hook:**

```typescript
// Nivel 1 — departamentos únicos
const { data } = await supabase
  .from('cat_ubigeo_departamentos')
  .select('departamento');

// Nivel 2 — provincias del departamento elegido
const { data } = await supabase
  .from('cat_ubigeo_provincias')
  .select('provincia')
  .eq('departamento', 'LIMA');

// Nivel 3 — distritos de la provincia elegida
const { data } = await supabase
  .from('cat_ubigeo')
  .select('codigo, distrito')
  .eq('departamento', 'LIMA')
  .eq('provincia', 'LIMA')
  .order('distrito');
// → [{ codigo: '150101', distrito: 'LIMA' }, { codigo: '150102', distrito: 'BREÑA' }, ...]

// Lookup inverso — dado un ubigeo, obtener los 3 niveles
const { data } = await supabase
  .from('cat_ubigeo')
  .select('departamento, provincia, distrito')
  .eq('codigo', '150101')
  .single();
// → { departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA' }
```

### 8.3. Invalidaciones en `onSuccess`

Al emitir una GRE exitosa:
- `guiasRemisionKeys.lists()`
- `comprasKeys.detail(pedidoId)` si viene de un pedido (para reflejar el estado en el pedido)

---

## 9. Storage

Reutilizar el bucket existente `vouchers_cobros` **no aplica** — las GREs son documentos legales. Crear bucket dedicado:

| Bucket | Visibilidad | Path |
| :--- | :--- | :--- |
| `guias_remision` | Público | `{guia_id}/{T001-00000123}.pdf` |

---

## 10. Alcance y Roadmap

### Fase 1 (este PRD)
- Catálogo `cat_ubigeo` con ~1,874 distritos (seed desde padrón SUNAT/INEI)
- Componente `UbigeoSelector` reutilizable con selects en cascada
- Emisión de GRE Remitente (código 09) desde pedido o comprobante
- Listado de GREs con estado
- Descarga de PDF y XML

### Fuera de alcance (Fase 2)
- GRE Transportista (código 31)
- Baja de GRE ya emitida (`docBaja`)
- Vinculación inversa: array `guias[]` en la Factura relacionada
- Catálogo de transportistas frecuentes (para autocompletar datos)
- Búsqueda full-text de ubigeo (campo de búsqueda libre como alternativa a los selects en cascada)

---

## 11. Riesgos

| Riesgo | Probabilidad | Mitigación |
| :--- | :--- | :--- |
| `empresa_configuracion.departamento/provincia/distrito` están `NULL` → la API devuelve error | Alta | Prerequisito bloqueante: completar estos campos mediante `UbigeoSelector` en la pantalla de Configuración antes de cualquier prueba de emisión. El campo `ubigueo` ya existente permite hacer el lookup inverso para pre-cargar el selector |
| El ubigeo del cliente puede estar desactualizado o ser incorrecto | Media | El `UbigeoSelector` valida que el código exista en `cat_ubigeo`. Si el cliente tiene ubigeo guardado, se pre-carga con lookup inverso y el usuario puede corregirlo visualmente |
| ApisPeru requiere credenciales SUNAT adicionales para GRE v2022 (`client_id` y `client_secret`) | Media | Verificar si el token actual de `empresa_configuracion.apisperu_token` cubre GREs, o si requiere configuración adicional en el portal SUNAT |
| El peso bruto es obligatorio y el sistema no tiene datos de peso por producto | Alta | El campo es de entrada manual; no hay forma de calcularlo automáticamente en Fase 1 |
| La tabla `cat_ubigeo` queda desactualizada si SUNAT modifica el padrón | Baja | El padrón de ubigeos es muy estable. Documentar el proceso de actualización: reimportar el CSV desde el repositorio oficial cuando SUNAT publique cambios |

---

*Documento generado el 23 de abril de 2026 — actualizado con implementación de Ubigeo*