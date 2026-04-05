-- ============================================================
-- MIGRATION 006: Código de descuento por ítem (Catálogo 53 SUNAT)
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
-- ============================================================
-- '00' = Descuento por ítem que afecta la base imponible del IGV/IVAP
-- '01' = Descuento por ítem que NO afecta la base imponible del IGV/IVAP
-- ============================================================

ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS descuento_codigo VARCHAR(3) DEFAULT '00';

COMMENT ON COLUMN public.comprobantes_detalles.descuento_codigo
  IS 'Catálogo 53 SUNAT — motivo del descuento por ítem. 00 = afecta base imponible (default)';
