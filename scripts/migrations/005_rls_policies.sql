-- ============================================================
-- MIGRATION 005: RLS para todas las tablas nuevas
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
--
-- DISEÑO:
--   authenticated → SELECT + INSERT (lectura y escritura normal)
--   service_role  → ALL (operaciones de sistema desde API routes)
--   configuracion_empresa → authenticated solo SELECT
--     (credenciales sensibles nunca se modifican desde el cliente)
-- ============================================================

-- ─── Habilitar RLS ───────────────────────────────────────────
ALTER TABLE public.configuracion_empresa    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_cuotas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacion_baja        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacion_baja_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumen_boletas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumen_boletas_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apisperu_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipo_nota_debito     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipo_sistema_isc     ENABLE ROW LEVEL SECURITY;

-- ─── configuracion_empresa ───────────────────────────────────
-- Solo lectura para authenticated (para construir payloads ApisPeru)
-- Escritura solo service_role (credenciales nunca desde cliente)
CREATE POLICY "configuracion_empresa_select_authenticated"
  ON public.configuracion_empresa FOR SELECT TO authenticated USING (true);

CREATE POLICY "configuracion_empresa_all_service_role"
  ON public.configuracion_empresa FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── comprobantes_cuotas ─────────────────────────────────────
CREATE POLICY "cuotas_select_authenticated"
  ON public.comprobantes_cuotas FOR SELECT TO authenticated USING (true);

CREATE POLICY "cuotas_insert_authenticated"
  ON public.comprobantes_cuotas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cuotas_delete_authenticated"
  ON public.comprobantes_cuotas FOR DELETE TO authenticated USING (true);

CREATE POLICY "cuotas_all_service_role"
  ON public.comprobantes_cuotas FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── comunicacion_baja ───────────────────────────────────────
CREATE POLICY "com_baja_select_authenticated"
  ON public.comunicacion_baja FOR SELECT TO authenticated USING (true);

CREATE POLICY "com_baja_insert_authenticated"
  ON public.comunicacion_baja FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "com_baja_all_service_role"
  ON public.comunicacion_baja FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── comunicacion_baja_items ─────────────────────────────────
CREATE POLICY "com_baja_items_select_authenticated"
  ON public.comunicacion_baja_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "com_baja_items_insert_authenticated"
  ON public.comunicacion_baja_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "com_baja_items_all_service_role"
  ON public.comunicacion_baja_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── resumen_boletas ─────────────────────────────────────────
CREATE POLICY "resumen_boletas_select_authenticated"
  ON public.resumen_boletas FOR SELECT TO authenticated USING (true);

CREATE POLICY "resumen_boletas_insert_authenticated"
  ON public.resumen_boletas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "resumen_boletas_all_service_role"
  ON public.resumen_boletas FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── resumen_boletas_items ───────────────────────────────────
CREATE POLICY "resumen_items_select_authenticated"
  ON public.resumen_boletas_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "resumen_items_insert_authenticated"
  ON public.resumen_boletas_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "resumen_items_all_service_role"
  ON public.resumen_boletas_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── apisperu_logs ───────────────────────────────────────────
-- INSERT para authenticated (las API routes escriben logs)
-- SELECT también para authenticated, pero las queries deben
--   excluir request_payload (puede contener credenciales)
CREATE POLICY "apisperu_logs_insert_authenticated"
  ON public.apisperu_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "apisperu_logs_select_authenticated"
  ON public.apisperu_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "apisperu_logs_all_service_role"
  ON public.apisperu_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── Catálogos: solo lectura para authenticated ──────────────
CREATE POLICY "cat_nota_debito_select"
  ON public.cat_tipo_nota_debito FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_nota_debito_all_service_role"
  ON public.cat_tipo_nota_debito FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "cat_sistema_isc_select"
  ON public.cat_tipo_sistema_isc FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_sistema_isc_all_service_role"
  ON public.cat_tipo_sistema_isc FOR ALL TO service_role
  USING (true) WITH CHECK (true);
