-- ============================================================
-- MIGRATION 002: Nuevas tablas para facturación electrónica SUNAT
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
-- ============================================================

-- ─── configuracion_empresa ───────────────────────────────────
-- Credenciales SUNAT/ApisPeru separadas de empresa_configuracion (display).
-- ⚠️ sol_pass y certificado_pem en TEXT hasta Fase 3.
--    Fase 3: migrar a vault.create_secret() de Supabase Vault.

CREATE TABLE IF NOT EXISTS public.configuracion_empresa (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc                     VARCHAR(11) NOT NULL,
  razon_social            VARCHAR(255) NOT NULL,
  nombre_comercial        VARCHAR(255) NULL,
  direccion               TEXT NULL,
  ubigueo                 VARCHAR(6) NULL DEFAULT '150101',
  departamento            VARCHAR(100) NULL,
  provincia               VARCHAR(100) NULL,
  distrito                VARCHAR(100) NULL,
  cod_establecimiento     VARCHAR(4) NOT NULL DEFAULT '0000',
  -- ApisPeru: token de empresa (no expira, diferente al token de login)
  apisperu_token          TEXT NULL,
  apisperu_environment    VARCHAR(20) NOT NULL DEFAULT 'beta'
                            CHECK (apisperu_environment IN ('beta', 'produccion')),
  -- ⚠️ SEGURIDAD: migrar a Supabase Vault antes de go-live en producción
  sol_user                TEXT NULL,
  sol_pass                TEXT NULL,
  certificado_pem         TEXT NULL,
  activo                  BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo una empresa activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS configuracion_empresa_activo_unique
  ON public.configuracion_empresa (activo)
  WHERE (activo = true);

COMMENT ON COLUMN public.configuracion_empresa.sol_pass IS
  'SUNAT SOL secondary user password. Migrar a Supabase Vault antes de producción.';
COMMENT ON COLUMN public.configuracion_empresa.certificado_pem IS
  'Certificado digital PEM en Base64. Generado vía ApisPeru POST /companies/certificate. Migrar a Vault antes de producción.';

-- ─── comprobantes_cuotas ─────────────────────────────────────
-- Cuotas de pago al crédito.
-- SUNAT requiere cuando forma_pago = 'Crédito'.
-- Mapea al array "cuotas" de ApisPeru: [{ moneda, monto, fechaPago }]

CREATE TABLE IF NOT EXISTS public.comprobantes_cuotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id  UUID NOT NULL REFERENCES public.comprobantes(id) ON DELETE CASCADE,
  numero_cuota    SMALLINT NOT NULL DEFAULT 1,
  moneda          VARCHAR(3) NOT NULL DEFAULT 'PEN',
  monto           NUMERIC(10,2) NOT NULL,
  fecha_pago      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_cuotas_comprobante
  ON public.comprobantes_cuotas(comprobante_id);

-- ─── comunicacion_baja ───────────────────────────────────────
-- Baja formal de facturas ante SUNAT.
-- Mapea a ApisPeru POST /voided/send.
-- SUNAT exige comunicar dentro de 3 días calendario de la emisión.

CREATE TABLE IF NOT EXISTS public.comunicacion_baja (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo           VARCHAR(10) NOT NULL,
  fec_generacion        DATE NOT NULL,
  fec_comunicacion      DATE NOT NULL DEFAULT CURRENT_DATE,
  ticket                VARCHAR(50) NULL,       -- Ticket async retornado por ApisPeru
  estado                VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'enviada', 'aceptada_sunat', 'rechazada_sunat', 'error')),
  apisperu_response     JSONB NULL,
  enlace_xml            TEXT NULL,
  enlace_cdr            TEXT NULL,
  sunat_ticket_response JSONB NULL,             -- Respuesta al polling de status
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comunicacion_baja_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicacion_baja_id  UUID NOT NULL REFERENCES public.comunicacion_baja(id) ON DELETE CASCADE,
  comprobante_id        UUID NOT NULL REFERENCES public.comprobantes(id),
  tipo_doc              VARCHAR(2) NOT NULL,    -- Copiado al momento de la baja
  serie                 VARCHAR(4) NOT NULL,
  correlativo_str       VARCHAR(8) NOT NULL,
  des_motivo_baja       TEXT NOT NULL,          -- Requerido por SUNAT, máx ~100 chars
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_com_baja_items_baja
  ON public.comunicacion_baja_items(comunicacion_baja_id);
CREATE INDEX IF NOT EXISTS idx_com_baja_items_comprobante
  ON public.comunicacion_baja_items(comprobante_id);

-- ─── resumen_boletas ─────────────────────────────────────────
-- Resumen Diario de Boletas.
-- SUNAT requiere reportar boletas en lote diario vía ApisPeru POST /summary/send.

CREATE TABLE IF NOT EXISTS public.resumen_boletas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo           VARCHAR(10) NOT NULL,
  fec_generacion        DATE NOT NULL DEFAULT CURRENT_DATE,
  fec_resumen           DATE NOT NULL,          -- Fecha de las boletas que se reportan
  moneda                VARCHAR(3) NOT NULL DEFAULT 'PEN',
  ticket                VARCHAR(50) NULL,
  estado                VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'enviada', 'aceptada_sunat', 'rechazada_sunat', 'error')),
  apisperu_response     JSONB NULL,
  enlace_xml            TEXT NULL,
  enlace_cdr            TEXT NULL,
  sunat_ticket_response JSONB NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo un resumen por fecha de reporte
CREATE UNIQUE INDEX IF NOT EXISTS resumen_boletas_fec_resumen_unique
  ON public.resumen_boletas(fec_resumen);

CREATE TABLE IF NOT EXISTS public.resumen_boletas_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resumen_id          UUID NOT NULL REFERENCES public.resumen_boletas(id) ON DELETE CASCADE,
  comprobante_id      UUID NOT NULL REFERENCES public.comprobantes(id),
  tipo_doc            VARCHAR(2) NOT NULL,
  serie_nro           VARCHAR(20) NOT NULL,     -- Ej: "B001-00000001"
  -- Estado: '1'=Adicionado, '2'=Modificado, '3'=Anulado (Catálogo 04 ApisPeru)
  estado              VARCHAR(1) NOT NULL DEFAULT '1'
                        CHECK (estado IN ('1', '2', '3')),
  cliente_tipo_doc    VARCHAR(2) NOT NULL DEFAULT '1',   -- '1'=DNI, '6'=RUC
  cliente_nro_doc     VARCHAR(15) NOT NULL DEFAULT '00000000',
  -- Montos copiados al generar el resumen (trail inmutable de auditoría)
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,
  mto_oper_gravadas   NUMERIC(10,2) NOT NULL DEFAULT 0,
  mto_oper_exoneradas NUMERIC(10,2) NOT NULL DEFAULT 0,
  mto_oper_inafectas  NUMERIC(10,2) NOT NULL DEFAULT 0,
  mto_igv             NUMERIC(10,2) NOT NULL DEFAULT 0,
  mto_isc             NUMERIC(10,2) NULL,
  mto_icbper          NUMERIC(10,2) NULL,
  -- Para NC/ND que afectan una boleta (docReferencia en ApisPeru)
  doc_referencia_tipo VARCHAR(2) NULL,
  doc_referencia_nro  VARCHAR(20) NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumen_items_resumen
  ON public.resumen_boletas_items(resumen_id);
CREATE INDEX IF NOT EXISTS idx_resumen_items_comprobante
  ON public.resumen_boletas_items(comprobante_id);

-- ─── apisperu_logs ───────────────────────────────────────────
-- Log de auditoría de todas las llamadas a ApisPeru.
-- Retención mínima 5 años (SUNAT facturación electrónica).

CREATE TABLE IF NOT EXISTS public.apisperu_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id  UUID NULL REFERENCES public.comprobantes(id) ON DELETE SET NULL,
  endpoint        VARCHAR(100) NOT NULL,        -- '/invoice/send', '/voided/send', etc.
  http_method     VARCHAR(6) NOT NULL DEFAULT 'POST',
  request_payload JSONB NULL,                   -- ⚠️ Puede contener credenciales
  response_status SMALLINT NULL,
  response_body   JSONB NULL,
  error_message   TEXT NULL,
  duration_ms     INTEGER NULL,
  emisor_user_id  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apisperu_logs_comprobante
  ON public.apisperu_logs(comprobante_id);
CREATE INDEX IF NOT EXISTS idx_apisperu_logs_created_at
  ON public.apisperu_logs(created_at DESC);
-- Índice parcial para errores (query más frecuente en debugging)
CREATE INDEX IF NOT EXISTS idx_apisperu_logs_errors
  ON public.apisperu_logs(created_at DESC)
  WHERE (response_status IS NULL OR response_status >= 400 OR error_message IS NOT NULL);
