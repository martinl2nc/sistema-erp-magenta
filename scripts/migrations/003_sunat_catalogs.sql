-- ============================================================
-- MIGRATION 003: Catálogos SUNAT + FKs diferidas + datos de series
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
-- Ejecutar DESPUÉS de 001 y ANTES de 002
-- ============================================================

-- ─── cat_tipo_nota_debito (Catálogo 10 SUNAT) ────────────────
CREATE TABLE IF NOT EXISTS public.cat_tipo_nota_debito (
  codigo      VARCHAR(2) PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.cat_tipo_nota_debito (codigo, descripcion) VALUES
  ('01', 'Intereses por mora'),
  ('02', 'Aumento en el valor'),
  ('03', 'Penalidades / otros conceptos')
ON CONFLICT (codigo) DO NOTHING;

-- ─── cat_tipo_sistema_isc (Catálogo 08 SUNAT) ────────────────
CREATE TABLE IF NOT EXISTS public.cat_tipo_sistema_isc (
  codigo      VARCHAR(2) PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.cat_tipo_sistema_isc (codigo, descripcion) VALUES
  ('01', 'Sistema al valor'),
  ('02', 'Aplicación del Monto Fijo'),
  ('03', 'Sistema de Precios de Venta al Público')
ON CONFLICT (codigo) DO NOTHING;

-- ─── FKs diferidas desde Migration 001 ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comprobantes_tipo_nota_debito_codigo_fkey'
      AND table_name = 'comprobantes'
  ) THEN
    ALTER TABLE public.comprobantes
      ADD CONSTRAINT comprobantes_tipo_nota_debito_codigo_fkey
      FOREIGN KEY (tipo_nota_debito_codigo)
      REFERENCES public.cat_tipo_nota_debito(codigo)
      ON UPDATE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comprobantes_detalles_tipo_sis_isc_codigo_fkey'
      AND table_name = 'comprobantes_detalles'
  ) THEN
    ALTER TABLE public.comprobantes_detalles
      ADD CONSTRAINT comprobantes_detalles_tipo_sis_isc_codigo_fkey
      FOREIGN KEY (tipo_sis_isc_codigo)
      REFERENCES public.cat_tipo_sistema_isc(codigo)
      ON UPDATE CASCADE;
  END IF;
END;
$$;

-- ─── cat_tipo_documento: '08' ya existe, seed defensivo ──────
-- Verificado en BD: código '08' = "Nota de Débito", categoria='nota', activo=true
INSERT INTO public.cat_tipo_documento (codigo, descripcion, categoria, activo)
  VALUES ('08', 'Nota de Débito Electrónica', 'nota', true)
  ON CONFLICT (codigo) DO NOTHING;

-- ─── Series para Notas de Débito ─────────────────────────────
-- La BD actual tiene: F001, B001, FC01, BC01
-- Faltan FD01 y BD01 para Notas de Débito
INSERT INTO public.configuracion_series (serie, correlativo_actual, activo, tipo_doc_codigo) VALUES
  ('FD01', 0, true, '08'),
  ('BD01', 0, true, '08')
ON CONFLICT (serie) DO NOTHING;

-- ─── Backfill de prefijo_esperado ────────────────────────────
-- Convención SUNAT de series:
--   F* = Facturas (01), B* = Boletas (03)
--   FC* = NC-Factura, BC* = NC-Boleta (07)
--   FD* = ND-Factura, BD* = ND-Boleta (08)
UPDATE public.configuracion_series
SET prefijo_esperado = CASE
  WHEN tipo_doc_codigo = '01'                         THEN 'F'
  WHEN tipo_doc_codigo = '03'                         THEN 'B'
  WHEN tipo_doc_codigo = '07' AND serie LIKE 'F%'     THEN 'FC'
  WHEN tipo_doc_codigo = '07' AND serie LIKE 'B%'     THEN 'BC'
  WHEN tipo_doc_codigo = '08' AND serie LIKE 'F%'     THEN 'FD'
  WHEN tipo_doc_codigo = '08' AND serie LIKE 'B%'     THEN 'BD'
  ELSE NULL
END
WHERE prefijo_esperado IS NULL;
