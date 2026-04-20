# 📄 PRD: Módulo de Cuentas por Cobrar (Cobros)

## 🎯 1. Objetivo del Módulo

Implementar un sistema de control de caja que separe matemáticamente las obligaciones fiscales (Cuotas SUNAT) de los ingresos reales en bancos (Cobros). El módulo permitirá registrar pagos totales, parciales o fraccionados a una misma factura/boleta, actualizando los saldos pendientes en tiempo real y previniendo sobrecobros.

### Consideraciones de Negocio

- **Detracciones**: Cuando un comprobante tiene detracción, el monto cobrable es `mto_imp_venta - detraccion_monto` (el cliente deposita la detracción directo a SUNAT/Banco de la Nación).
- **Notas de Crédito**: Las NCs aceptadas por SUNAT (`tipo_doc_codigo = '07'`, `estado_sunat = 'aceptada_sunat'`) reducen el saldo pendiente de la factura referenciada.
- **Cuotas SUNAT vs Cobros Reales**: La tabla `comprobantes_cuotas` (ya existente) define el cronograma de pagos declarado a SUNAT. La tabla `cobros` (nueva) registra los ingresos reales. Son conceptos distintos.

---

## 🗄️ 2. FASE 1: Arquitectura de Base de Datos (Supabase)

### 2.1 Resumen de Cambios

| Objeto | Tipo | Descripción |
|--------|------|-------------|
| `cat_metodos_pago` | Tabla nueva | Catálogo de métodos de pago |
| `cuentas_bancarias_empresa` | Tabla nueva | Cuentas bancarias normalizadas (reemplaza campo texto) |
| `cobros` | Tabla nueva | Registro de pagos reales |
| `cobros.moneda` | Columna nueva | Moneda del cobro: `PEN` o `USD`. Frontend actual usa solo PEN; preparado para multimoneda futuro |
| `cobros.anulado` | Columna nueva | Soft-delete: `true` si el cobro fue anulado (nunca se borra físicamente) |
| `cobros.anulado_por` | Columna nueva | FK a `perfiles_usuario` — admin que realizó la anulación |
| `cobros.fecha_anulacion` | Columna nueva | Timestamp de la anulación |
| `cobros.motivo_anulacion` | Columna nueva | Motivo obligatorio ingresado por el admin |
| `comprobantes.estado_pago` | Columna nueva | Estado denormalizado: Pendiente / Parcial / Pagado |
| `trg_actualizar_estado_pago` | Trigger | Mantiene `estado_pago` sincronizado automáticamente. Excluye cobros con `anulado = true` |
| `vista_cuentas_por_cobrar` | Vista SQL | Calcula saldos considerando NCs, detracciones y cobros vigentes (excluye anulados) |
| `registrar_cobro` | RPC | Operación atómica: inserta cobro + valida saldo (excluye anulados del cálculo). Acepta `p_moneda` |
| `anular_cobro` | RPC nueva | Soft-delete auditado: setea `anulado=true` + campos de auditoría. Dispara trigger automáticamente |
| `vouchers_cobros` | Storage bucket nuevo | Bucket público para vouchers de cobros (imágenes/PDF). Path: `{comprobante_id}/{timestamp}.{ext}` |
| RLS Policies | Seguridad | Políticas para las 3 tablas nuevas + bucket |

### 2.2 Script de Migración SQL

```sql
-- ============================================================
-- PHASE 1: Tablas nuevas
-- ============================================================

-- 1. Catálogo de Métodos de Pago
CREATE TABLE public.cat_metodos_pago (
    codigo VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    requiere_referencia BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true
);

INSERT INTO public.cat_metodos_pago (codigo, descripcion, requiere_referencia) VALUES
('TRANSF', 'Transferencia Bancaria', true),
('YAPE', 'Yape / Plin', true),
('EFECT', 'Efectivo', false),
('TARJ', 'Tarjeta (POS/Pasarela)', true);

-- 2. Cuentas Bancarias de la Empresa (normalización)
-- Reemplaza el campo texto `empresa_configuracion.cuentas_bancarias`
CREATE TABLE public.cuentas_bancarias_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banco VARCHAR(100) NOT NULL,
    numero_cuenta VARCHAR(100) NOT NULL,
    cci VARCHAR(40),
    moneda VARCHAR(3) DEFAULT 'PEN',
    es_detraccion BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Tabla de Cobros (Ingresos Reales)
CREATE TABLE public.cobros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id UUID NOT NULL REFERENCES public.comprobantes(id) ON DELETE RESTRICT,
    metodo_pago_codigo VARCHAR(20) NOT NULL REFERENCES public.cat_metodos_pago(codigo),
    cuenta_bancaria_id UUID REFERENCES public.cuentas_bancarias_empresa(id),

    monto_cobrado NUMERIC(10,2) NOT NULL CHECK (monto_cobrado > 0),
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,

    referencia_operacion VARCHAR(100),  -- Nro de Operación/Voucher
    comprobante_img_url TEXT,           -- URL de Supabase Storage (bucket: vouchers_pago)
    notas TEXT,

    registrado_por UUID REFERENCES public.perfiles_usuario(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================
-- PHASE 2: Columna estado_pago + Trigger
-- ============================================================

-- 4. Agregar columna denormalizada a comprobantes
ALTER TABLE public.comprobantes
ADD COLUMN estado_pago VARCHAR(20) DEFAULT 'Pendiente';

-- 5. Trigger: actualiza estado_pago automáticamente al registrar/modificar/eliminar cobros
CREATE OR REPLACE FUNCTION public.fn_actualizar_estado_pago()
RETURNS TRIGGER AS $$
DECLARE
    v_comprobante_id UUID;
    v_total_facturado NUMERIC;
    v_detraccion NUMERIC;
    v_total_ncs NUMERIC;
    v_total_cobrado NUMERIC;
    v_saldo NUMERIC;
    v_nuevo_estado VARCHAR(20);
BEGIN
    -- Determinar el comprobante afectado
    IF TG_OP = 'DELETE' THEN
        v_comprobante_id := OLD.comprobante_id;
    ELSE
        v_comprobante_id := NEW.comprobante_id;
    END IF;

    -- Obtener datos del comprobante
    SELECT mto_imp_venta, COALESCE(detraccion_monto, 0)
    INTO v_total_facturado, v_detraccion
    FROM public.comprobantes WHERE id = v_comprobante_id;

    -- Total de NCs aceptadas contra este comprobante
    SELECT COALESCE(SUM(mto_imp_venta), 0)
    INTO v_total_ncs
    FROM public.comprobantes
    WHERE comprobante_referencia_id = v_comprobante_id
      AND tipo_doc_codigo = '07'
      AND estado_sunat = 'aceptada_sunat';

    -- Total cobrado
    SELECT COALESCE(SUM(monto_cobrado), 0)
    INTO v_total_cobrado
    FROM public.cobros
    WHERE comprobante_id = v_comprobante_id;

    -- Calcular saldo
    v_saldo := v_total_facturado - v_detraccion - v_total_ncs - v_total_cobrado;

    -- Determinar estado
    IF v_saldo <= 0 THEN
        v_nuevo_estado := 'Pagado';
    ELSIF v_total_cobrado > 0 THEN
        v_nuevo_estado := 'Parcial';
    ELSE
        v_nuevo_estado := 'Pendiente';
    END IF;

    -- Actualizar
    UPDATE public.comprobantes
    SET estado_pago = v_nuevo_estado
    WHERE id = v_comprobante_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_estado_pago
AFTER INSERT OR UPDATE OR DELETE ON public.cobros
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_estado_pago();

-- Backfill: todos los comprobantes existentes (facturas/boletas) quedan como 'Pendiente'
-- (correcto porque aún no hay cobros registrados)

-- ============================================================
-- PHASE 3: Vista SQL + RPC
-- ============================================================

-- 6. Vista maestra de cuentas por cobrar
CREATE OR REPLACE VIEW public.vista_cuentas_por_cobrar AS
SELECT
    c.id AS comprobante_id,
    c.serie_numero,
    c.fecha_emision,
    c.fecha_vencimiento,
    c.forma_pago,
    c.tipo_doc_codigo,
    c.estado_sunat,
    c.estado_pago,
    c.detraccion_monto,
    cl.id AS cliente_id,
    cl.razon_social,
    cl.nombres_contacto,
    cl.apellidos_contacto,
    c.mto_imp_venta AS total_facturado,
    -- Monto cobrable = total - detracción
    (c.mto_imp_venta - COALESCE(c.detraccion_monto, 0)) AS monto_cobrable,
    -- Total de NCs emitidas contra esta factura
    COALESCE(nc.total_notas_credito, 0) AS total_notas_credito,
    -- Total cobrado hasta ahora
    COALESCE(cb.total_cobrado, 0) AS total_cobrado,
    -- Saldo = cobrable - NCs - cobrado
    (c.mto_imp_venta - COALESCE(c.detraccion_monto, 0)
     - COALESCE(nc.total_notas_credito, 0)
     - COALESCE(cb.total_cobrado, 0)) AS saldo_pendiente
FROM public.comprobantes c
JOIN public.clientes cl ON c.cliente_id = cl.id
LEFT JOIN (
    SELECT comprobante_id, SUM(monto_cobrado) AS total_cobrado
    FROM public.cobros
    GROUP BY comprobante_id
) cb ON c.id = cb.comprobante_id
LEFT JOIN (
    SELECT comprobante_referencia_id, SUM(mto_imp_venta) AS total_notas_credito
    FROM public.comprobantes
    WHERE tipo_doc_codigo = '07'
      AND estado_sunat = 'aceptada_sunat'
    GROUP BY comprobante_referencia_id
) nc ON c.id = nc.comprobante_referencia_id
WHERE c.tipo_doc_codigo IN ('01', '03')
  AND c.estado_sunat = 'aceptada_sunat';

-- 7. RPC atómica para registrar cobro con validación de saldo
CREATE OR REPLACE FUNCTION public.registrar_cobro(
    p_comprobante_id UUID,
    p_metodo_pago_codigo VARCHAR,
    p_cuenta_bancaria_id UUID,
    p_monto_cobrado NUMERIC,
    p_fecha_pago DATE,
    p_referencia_operacion VARCHAR DEFAULT NULL,
    p_comprobante_img_url TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL,
    p_registrado_por UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_saldo NUMERIC;
    v_cobro_id UUID;
BEGIN
    -- Calcular saldo actual (con lock para concurrencia)
    SELECT (c.mto_imp_venta - COALESCE(c.detraccion_monto, 0)
            - COALESCE((SELECT SUM(mto_imp_venta) FROM public.comprobantes
                        WHERE comprobante_referencia_id = c.id
                          AND tipo_doc_codigo = '07'
                          AND estado_sunat = 'aceptada_sunat'), 0)
            - COALESCE((SELECT SUM(monto_cobrado) FROM public.cobros
                        WHERE comprobante_id = c.id), 0))
    INTO v_saldo
    FROM public.comprobantes c
    WHERE c.id = p_comprobante_id
    FOR UPDATE;  -- Lock para evitar sobrecobro por concurrencia

    IF v_saldo IS NULL THEN
        RAISE EXCEPTION 'Comprobante no encontrado: %', p_comprobante_id;
    END IF;

    IF p_monto_cobrado > v_saldo THEN
        RAISE EXCEPTION 'El monto (%.2f) excede el saldo pendiente (%.2f)', p_monto_cobrado, v_saldo;
    END IF;

    -- Insertar cobro (el trigger actualizará estado_pago automáticamente)
    INSERT INTO public.cobros (
        comprobante_id, metodo_pago_codigo, cuenta_bancaria_id,
        monto_cobrado, fecha_pago, referencia_operacion,
        comprobante_img_url, notas, registrado_por
    ) VALUES (
        p_comprobante_id, p_metodo_pago_codigo, p_cuenta_bancaria_id,
        p_monto_cobrado, p_fecha_pago, p_referencia_operacion,
        p_comprobante_img_url, p_notas, p_registrado_por
    )
    RETURNING id INTO v_cobro_id;

    RETURN v_cobro_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 4: RLS Policies
-- ============================================================

-- cat_metodos_pago: lectura para todos los autenticados
ALTER TABLE public.cat_metodos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read cat_metodos_pago"
ON public.cat_metodos_pago FOR SELECT
TO authenticated USING (true);

-- cuentas_bancarias_empresa: lectura para todos, escritura para admin
ALTER TABLE public.cuentas_bancarias_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read cuentas_bancarias"
ON public.cuentas_bancarias_empresa FOR SELECT
TO authenticated USING (true);
CREATE POLICY "Admin can manage cuentas_bancarias"
ON public.cuentas_bancarias_empresa FOR ALL
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles_usuario
            WHERE id = auth.uid() AND rol = 'admin')
);

-- cobros: lectura para todos los autenticados, insert para admin
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read cobros"
ON public.cobros FOR SELECT
TO authenticated USING (true);
CREATE POLICY "Admin can insert cobros"
ON public.cobros FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles_usuario
            WHERE id = auth.uid() AND rol = 'admin')
);
```

### 2.3 Storage (Almacenamiento de Vouchers)

Bucket **público** en Supabase Storage: `vouchers_cobros`. Se usa para subir capturas de los depósitos/transferencias.

- **Tipos permitidos**: `image/jpeg`, `image/jpg`, `image/png`, `application/pdf`
- **Tamaño máximo**: 10 MB
- **Path**: `{comprobante_id}/{timestamp}.{ext}`
- **Políticas RLS**: usuarios autenticados pueden INSERT, SELECT y DELETE
- **Upload**: desde `RegistrarCobroModal` usando `useFileUpload()` + `cobrosService.uploadVoucherCobro()`
- **Visualización**: ícono "Ver voucher" en `HistorialCobrosDrawer` y en `ListadoCobros` (solo aparece cuando `comprobante_img_url` está cargada)

> ⚠️ El PRD original especificaba bucket `vouchers_pago`. El bucket creado se llama `vouchers_cobros`.

### 2.4 Migración de Cuentas Bancarias

La tabla `empresa_configuracion` actualmente almacena las cuentas bancarias como texto plano en el campo `cuentas_bancarias`. Se debe:

1. Insertar los datos actuales en la nueva tabla `cuentas_bancarias_empresa`
2. Actualizar la UI de configuración de empresa para usar la tabla normalizada
3. (Opcional, fase posterior) Remover el campo `cuentas_bancarias` de `empresa_configuracion`

### 2.5 Impacto de la Migración en Archivos Existentes

> ⚠️ **Hallazgo**: El PDF de cotizaciones (`QuotePDFTemplate.tsx`) ya intenta parsear `cuentas_bancarias` como JSON (`JSON.parse`), pero la BD almacena texto plano. Esto significa que **la sección de cuentas bancarias del PDF está rota actualmente** — el `catch` silencioso hace que `bankAccounts = []`. La migración a tabla normalizada CORRIGE este bug.

| Archivo | Cambio Requerido | Impacto |
|---------|-----------------|--------|
| `src/services/companyConfig.service.ts` | Remover `cuentas_bancarias` de `CompanyConfig` y `CompanyConfigFormData` | Tipos |
| `src/features/empresa/useCompanyConfigFormState.ts` | Remover `cuentas_bancarias` del estado inicial y del populate | Estado |
| `src/features/empresa/CompanyConfigForm.tsx` | Reemplazar `<textarea>` de cuentas bancarias por sección CRUD con tabla editable (agregar/eliminar cuentas bancarias desde `cuentas_bancarias_empresa`) | UI Admin |
| `src/components/quotes/QuotePDFTemplate.tsx` | Recibir cuentas bancarias como prop (array de `CuentaBancaria[]` desde la tabla) en vez de parsear JSON del campo texto. Adaptar el mapeo al nuevo schema (`banco`, `numero_cuenta`, `cci`, `moneda`) | PDF Cotizaciones |

---

## 💻 3. FASE 2: Implementación Frontend y Backend

### 3.1 Arquitectura (Patrón del Proyecto)

El sistema sigue estrictamente la arquitectura por capas:

```
Page (Server Component) → Client Component → Hook (TanStack Query) → Service → Supabase
```

**Archivos creados:**

| Capa | Archivo | Descripción |
|------|---------|-------------|
| Service | `src/services/cobros.service.ts` | CRUD cobros + consulta vista + RPCs + upload voucher |
| Hook | `src/hooks/useCobros.ts` | Query key factory + hooks TanStack Query |
| Feature | `src/features/cobros/CobranzasDashboard.tsx` | Dashboard cuentas por cobrar con link a Transacciones |
| Feature | `src/features/cobros/RegistrarCobroModal.tsx` | Modal de registro de pago con upload de voucher |
| Feature | `src/features/cobros/HistorialCobrosDrawer.tsx` | Panel lateral con timeline + botón anulación (admin) |
| Feature | `src/features/cobros/ListadoCobros.tsx` | Listado general de transacciones para conciliación |
| Feature | `src/features/cobros/cobros.utils.ts` | Validación manual del formulario |
| Page | `src/app/(app)/cobranzas/page.tsx` | Server Component |
| Page | `src/app/(app)/cobranzas/loading.tsx` | Skeleton de carga |
| Page | `src/app/(app)/cobranzas/error.tsx` | Manejo de errores |
| Page | `src/app/(app)/cobranzas/transacciones/page.tsx` | Listado general de cobros (conciliación bancaria) |

**Archivos a modificar (migración cuentas bancarias):**

| Capa | Archivo | Cambio |
|------|---------|--------|
| Service | `src/services/companyConfig.service.ts` | Remover `cuentas_bancarias` de tipos |
| Hook State | `src/features/empresa/useCompanyConfigFormState.ts` | Remover del estado inicial |
| Feature | `src/features/empresa/CompanyConfigForm.tsx` | Reemplazar textarea por CRUD de cuentas bancarias |
| Component | `src/components/quotes/QuotePDFTemplate.tsx` | Recibir cuentas como prop desde tabla normalizada |

### 3.2 Service: `cobros.service.ts`

```typescript
// Patrón: igual a facturas.service.ts
import { createClient } from '@/lib/supabase/client';

export interface CuentaPorCobrar {
  comprobante_id: string;
  serie_numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  forma_pago: string;
  estado_pago: string;
  cliente_id: string;
  razon_social: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
  total_facturado: number;
  monto_cobrable: number;
  total_notas_credito: number;
  total_cobrado: number;
  saldo_pendiente: number;
}

export interface Cobro { /* ... */ }
export interface RegistrarCobroPayload { /* ... */ }

export const cobrosService = {
  async getCuentasPorCobrar(): Promise<CuentaPorCobrar[]> { /* SELECT * FROM vista_cuentas_por_cobrar */ },
  async getHistorialCobros(comprobanteId: string): Promise<Cobro[]> { /* ... */ },
  async registrarCobro(payload: RegistrarCobroPayload): Promise<string> { /* RPC registrar_cobro */ },
  async getMetodosPago() { /* ... */ },
  async getCuentasBancarias() { /* ... */ },
};
```

### 3.3 Hook: `useCobros.ts`

```typescript
// Patrón: igual a useFacturas.ts
export const cobrosKeys = {
  all: () => ['cobros'] as const,
  cuentasPorCobrar: () => [...cobrosKeys.all(), 'cuentas-por-cobrar'] as const,
  historial: (comprobanteId: string) => [...cobrosKeys.all(), 'historial', comprobanteId] as const,
};

export const metodosPagoKeys = {
  all: () => ['metodos-pago'] as const,
};

export const cuentasBancariasKeys = {
  all: () => ['cuentas-bancarias'] as const,
};
```

**Hooks disponibles:**
- `useCuentasPorCobrar(params)` — lista principal paginada
- `useKpisCuentasPorCobrar()` — KPIs del dashboard
- `useHistorialCobros(comprobanteId)` — timeline de pagos por comprobante
- `useAllCobros(params)` — listado general de transacciones (sin filtro por comprobante)
- `useRegistrarCobro()` — mutation con invalidación de `cobrosKeys.all()` + `facturasKeys.lists()`
- `useAnularCobro(comprobanteId)` — soft-delete auditado; invalida historial, KPIs, cuentas y facturas
- `useMetodosPago()` — dropdown
- `useCuentasBancarias()` — dropdown
- `useCuotasComprobante(comprobanteId, isOpen)` — cronograma de cuotas crédito

### 3.4 Pantalla Principal: `/dashboard/cobranzas`

- **Acceso**: Solo roles administrativos (verificar con `useAuth()`)
- **Tabla**: HTML table nativa (patrón existente del proyecto, NO `@tanstack/react-table`)
- **Datos**: Hook `useCuentasPorCobrar()` que consulta `vista_cuentas_por_cobrar`
- **Filtros**: 
  - Por defecto: `saldo_pendiente > 0` (solo pendientes)
  - Toggle para ver todos (incluido pagados)
  - Filtro por cliente (búsqueda)
  - Filtro por `forma_pago` (Contado / Crédito)
- **Columnas**:
  - Comprobante (`serie_numero`, ej: F001-00000008)
  - Cliente (usar `getClientDisplayName()` de `formatters.ts`)
  - Total Facturado (usar `formatCurrency()`)
  - Monto Cobrable (total - detracción)
  - Saldo Pendiente (rojo si > 0, verde si = 0)
  - Estado (`estado_pago`: badge Pendiente/Parcial/Pagado)
  - **Acciones**: Botón "Registrar Pago" + Botón "Ver Historial"
- **Estados UI**: `isLoading`, `isError`, empty state, populated state
- **Responsive**: Tabla desktop + cards mobile

### 3.5 Modal: Registro de Pago (`RegistrarCobroModal.tsx`)

- **Patrón**: Feature modal (igual a `EmitirComprobanteModal.tsx`)
- **Props**: `isOpen`, `onClose`, `comprobante: CuentaPorCobrar`, `onSuccess`
- **Estado**: `useState` (NO react-hook-form ni Zod para formularios no-auth)
- **Validación**: Función en `cobros.utils.ts` que retorna `string | null`

**Campos del formulario:**

| Campo | Tipo | Reglas |
|-------|------|--------|
| `monto_cobrado` | number | Obligatorio. > 0. **max = saldo_pendiente** |
| `metodo_pago_codigo` | select | Obligatorio. Dropdown desde `useMetodosPago()` |
| `cuenta_bancaria_id` | select | Opcional. Dropdown desde `useCuentasBancarias()`. Sin selección = efectivo |
| `moneda` | hardcoded | Siempre `'PEN'`. Campo existe en DB para multimoneda futuro |
| `fecha_pago` | date | Default hoy. No futuro. |
| `referencia_operacion` | text | Obligatorio si `metodo_pago.requiere_referencia === true` |
| `comprobante_img_url` | file | Opcional. Upload al bucket `vouchers_cobros` via `useFileUpload()` + `cobrosService.uploadVoucherCobro()`. Acepta JPG, PNG, PDF (máx 10MB). Drag & drop soportado |
| `notas` | textarea | Opcional |

**Header del modal**: Mostrar resumen del comprobante (serie, cliente, total, saldo actual).

**Submit**: Llama a `useRegistrarCobro()` → RPC `registrar_cobro`. 
- `onSuccess`: `toast.success()` + `onClose()` + invalidación automática (en el hook)
- `onError`: `toast.error(err.message)` — la RPC devuelve mensajes descriptivos

### 3.6 Historial de Pagos (`HistorialCobrosDrawer.tsx`)

Panel lateral deslizable (Sheet/Drawer) que muestra:

- **Header**: Serie del comprobante, Total Facturado, Monto Cobrable, Total Cobrado, Saldo Actual
- **Barra de progreso visual**: `(total_cobrado / monto_cobrable) * 100`
- **Cronograma de cuotas** (solo comprobantes a crédito): estado Pagado/Vencida/Pendiente con waterfall acumulativo
- **Timeline**: Lista cronológica de cobros registrados con:
  - Fecha del pago
  - Monto cobrado (`formatCurrency()`) — tachado y opaco si anulado
  - Badge `ANULADO` + motivo de anulación (cuando aplica)
  - Método de pago (con ícono)
  - Banco de destino
  - Nro. de operación
  - Botón "Ver Voucher" → abre URL en nueva pestaña (solo si tiene voucher)
  - Quién registró el cobro
  - **Botón "Anular"** (solo admin, solo cobros vigentes): panel inline con campo motivo obligatorio → llama RPC `anular_cobro`

### 3.7 Listado General de Transacciones (`ListadoCobros.tsx`)

Ruta: `/cobranzas/transacciones`. Accesible desde botón "Transacciones" en header del dashboard.

**Propósito**: conciliación bancaria — ver todos los cobros registrados independientemente del comprobante.

**Filtros**:
- Preset de fecha: Hoy / Esta semana / Mes actual / Personalizado (rango custom)
- Dropdown cuenta bancaria
- Dropdown método de pago

**Columnas**: Fecha | Comprobante | Cliente | Método (con ícono) | Cuenta destino | Nro. Operación | Monto | Registrado por | Acciones

**Acciones por fila**:
- Ver voucher (ícono, solo si tiene `comprobante_img_url`)
- Anular (ícono trash, solo admin, solo vigentes): panel inline con motivo obligatorio

**Totales** en header: cantidad de cobros vigentes + suma del período seleccionado.

> Paginación: pendiente de implementar (roadmap).

### 3.8 Reporte de Antigüedad de Deuda — `/cobranzas/aging`

Ruta: `/cobranzas/aging`. Accesible desde botón "Antigüedad" en el header del dashboard de cobranzas.

**Propósito**: Priorizar la gestión de cobranza B2B identificando qué clientes tienen deuda más atrasada.

#### Lógica de fecha efectiva de vencimiento (por comprobante)

| Condición | Fecha usada |
|-----------|-------------|
| Tiene cuotas en `comprobantes_cuotas` con `fecha_pago < hoy` | `MIN(cuota.fecha_pago)` vencida |
| No tiene cuotas vencidas pero tiene `fecha_vencimiento` | `comprobantes.fecha_vencimiento` |
| Sin cuotas ni fecha de vencimiento | `comprobantes.fecha_emision` (fallback) |

#### Buckets de antigüedad

| Bucket | Condición (`dias_vencido`) | Color UI |
|--------|---------------------------|----------|
| Por Vencer | `<= 0` | Verde `#10B981` |
| 1 - 30 días | `1 a 30` | Amarillo |
| 31 - 60 días | `31 a 60` | Naranja |
| 61 - 90 días | `61 a 90` | Rojo claro |
| + 90 días | `> 90` | Rojo intenso |

#### RPCs de base de datos

| RPC | Descripción |
|-----|-------------|
| `get_aging_report()` | Una fila por cliente con 5 buckets pre-calculados y `count_comprobantes`. Ordenado por `deuda_total DESC` |
| `get_aging_detalle(p_cliente_id uuid)` | Una fila por comprobante del cliente con `dias_vencido` y `bucket`. Carga lazy al expandir |

**Notas de implementación:**
- `comprobantes_cuotas.fecha_pago` es `timestamptz` → se castea a `::date` con `MIN(fecha_pago::date)` en el CTE
- Los alias internos del CTE evitan ambigüedad con columnas del `RETURNS TABLE` en PL/pgSQL
- `GRANT EXECUTE TO authenticated, anon` + `NOTIFY pgrst, 'reload schema'` requeridos tras crear los RPCs

#### Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/features/cobros/AgingReport.tsx` | Componente principal: KPI cards + tabla expandible |
| `src/app/(app)/cobranzas/aging/page.tsx` | Server Component — ruta `/cobranzas/aging` |
| `src/services/cobros.service.ts` | Tipos `AgingReportRow`, `AgingDetalleRow` + funciones `getAgingReport()`, `getAgingDetalle()` |
| `src/hooks/useCobros.ts` | `agingKeys` factory + hooks `useAgingReport()`, `useAgingDetalle(clienteId)` |

#### Criterios de aceptación

- [x] Tabla muestra un cliente por fila con deuda total y los 5 buckets de mora
- [x] Click en una fila expande los comprobantes individuales de ese cliente (lazy load)
- [x] KPI cards muestran totales globales de cada bucket + % de deuda vencida
- [x] Footer de tabla con sumas de cada columna
- [x] Comprobantes sin `fecha_vencimiento` usan `fecha_emision` como fallback
- [x] Comprobantes a crédito con cuotas usan la cuota vencida más antigua como referencia

---

## 📐 4. Diagrama de Relaciones

```
┌────────────────────┐
│   comprobantes     │
│ (facturas/boletas) │
│                    │
│ + estado_pago      │◄──── Trigger automático
└────────┬───────────┘
         │ 1
         │
         │ N
┌────────▼───────────┐     ┌──────────────────────┐
│      cobros        │────►│  cat_metodos_pago     │
│                    │     └──────────────────────┘
│ comprobante_id  FK │
│ metodo_pago     FK │     ┌──────────────────────┐
│ cuenta_bancaria FK │────►│ cuentas_bancarias_    │
│ monto_cobrado      │     │ empresa               │
│ fecha_pago         │     └──────────────────────┘
│ registrado_por  FK │────► perfiles_usuario
└────────────────────┘

Comprobantes ◄──── comprobantes (NCs via comprobante_referencia_id)
```

---

## 🔒 5. Seguridad

- **RLS habilitado** en las 3 tablas nuevas (ver SQL en sección 2.2)
- **Roles**: Solo admin puede registrar cobros y gestionar cuentas bancarias
- **Acceso a ruta**: `/dashboard/cobranzas` protegida por verificación de rol en componente
- **Prevención de sobrecobro**: Validación en RPC con `FOR UPDATE` (lock de fila)
- **Auditoría**: Campo `registrado_por` registra quién hizo cada cobro

---

## ✅ 6. Criterios de Aceptación

### Módulo de Cobros
- [x] Cobro total: pago completo → `estado_pago = 'Pagado'`, `saldo_pendiente = 0`
- [x] Cobro parcial: 2+ pagos → `estado_pago = 'Parcial'`, saldo refleja diferencia
- [x] Prevención de sobrecobro: monto > saldo → error de la RPC
- [x] Notas de crédito: NC aceptada reduce saldo automáticamente
- [x] Detracciones: factura con detracción muestra monto cobrable correcto
- [x] Historial: drawer muestra timeline con todos los pagos, vouchers y estado de anulación
- [x] RLS: vendedor puede ver cobros pero no puede registrarlos
- [x] Trigger: `estado_pago` se actualiza automáticamente. Excluye cobros anulados del cálculo
- [x] Storage: vouchers se suben correctamente al bucket `vouchers_cobros`
- [x] Anulación: soft-delete auditado con motivo, no DELETE físico. Vista y trigger excluyen anulados
- [x] Listado general de transacciones: vista maestro para conciliación bancaria con filtros
- [x] Reporte de antigüedad de deuda: tabla por cliente con 5 buckets de mora y detalle expandible
- [ ] Paginación en listado de transacciones (roadmap)

### Migración Cuentas Bancarias
- [ ] Formulario de admin: cuentas bancarias se gestionan como tabla CRUD (agregar/eliminar), no como textarea
- [ ] PDF de cotizaciones: sección "Números de cuenta" muestra las cuentas desde la tabla `cuentas_bancarias_empresa`
- [ ] PDF de cotizaciones: la sección se renderiza correctamente (actualmente está rota por JSON.parse fallido)
- [ ] Datos migrados: las cuentas bancarias existentes en texto plano están insertadas en la nueva tabla
