-- ============================================================
-- MIGRATION 001: Agregar columnas SUNAT a tablas existentes
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
-- Todas las columnas son NULL o tienen DEFAULT seguro (retrocompatible)
-- ============================================================

-- ─── comprobantes ────────────────────────────────────────────

-- Código del establecimiento anexo (R-123-2022 campo 4)
-- '0000' = sede principal. Requerido en XML UBL <cbc:AddressTypeCode>
ALTER TABLE public.comprobantes
  ADD COLUMN IF NOT EXISTS cod_establecimiento_anexo VARCHAR(4) NOT NULL DEFAULT '0000';

-- Impuesto al Consumidor de Bienes Plásticos — total cabecera
ALTER TABLE public.comprobantes
  ADD COLUMN IF NOT EXISTS icbper NUMERIC(10,2) NULL;

-- Impuesto Selectivo al Consumo — total cabecera
ALTER TABLE public.comprobantes
  ADD COLUMN IF NOT EXISTS mto_isc NUMERIC(10,2) NULL;

-- Tipo de Nota de Débito (Catálogo 10 SUNAT)
-- FK se agrega en migration 003 después de crear cat_tipo_nota_debito
ALTER TABLE public.comprobantes
  ADD COLUMN IF NOT EXISTS tipo_nota_debito_codigo VARCHAR(2) NULL;

-- ─── comprobantes_detalles ───────────────────────────────────

-- Código de producto SUNAT (Catálogo 25) — OBLIGATORIO desde Ene 2021
ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS cod_prod_sunat VARCHAR(15) NULL;

-- GTIN/EAN (GS1) — alternativo a cod_prod_sunat
ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS cod_prod_gs1 VARCHAR(14) NULL;

-- Descuento por línea (ApisPeru SaleDetail "descuento")
ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(10,2) NULL;

-- ISC por línea (Impuesto Selectivo al Consumo)
-- Catálogo 08: '01'=Al valor, '02'=Monto fijo, '03'=Precio venta público
-- FK se agrega en migration 003
ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS tipo_sis_isc_codigo VARCHAR(2) NULL;

ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS mto_base_isc NUMERIC(10,2) NULL;

ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS porcentaje_isc NUMERIC(5,2) NULL;

ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS isc NUMERIC(10,2) NULL;

-- ICBPER por línea (bolsas plásticas)
-- factor_icbper: tasa fija S/ 0.20 por unidad
ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS factor_icbper NUMERIC(10,4) NULL;

ALTER TABLE public.comprobantes_detalles
  ADD COLUMN IF NOT EXISTS icbper NUMERIC(10,2) NULL;

-- ─── configuracion_series ────────────────────────────────────

-- Prefijo esperado para validación: F, B, FC, BC, FD, BD
ALTER TABLE public.configuracion_series
  ADD COLUMN IF NOT EXISTS prefijo_esperado VARCHAR(2) NULL;

-- ─── productos ───────────────────────────────────────────────

-- Código SUNAT del producto — se propaga a comprobantes_detalles al emitir
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS cod_prod_sunat VARCHAR(15) NULL;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS cod_prod_gs1 VARCHAR(14) NULL;

-- ─── empresa_configuracion ───────────────────────────────────

-- Nombre comercial — requerido en ApisPeru company.nombreComercial
ALTER TABLE public.empresa_configuracion
  ADD COLUMN IF NOT EXISTS nombre_comercial VARCHAR(255) NULL;

-- UBIGEO — actualmente hardcodeado '150101' en apisperu-facturacion.ts
ALTER TABLE public.empresa_configuracion
  ADD COLUMN IF NOT EXISTS ubigueo VARCHAR(6) NULL DEFAULT '150101';

-- Código de establecimiento anexo
ALTER TABLE public.empresa_configuracion
  ADD COLUMN IF NOT EXISTS cod_establecimiento_anexo VARCHAR(4) NULL DEFAULT '0000';
