-- Fix: RLS policies using TO public are not evaluated for authenticated users in PostgREST.
-- Adding explicit authenticated and anon policies resolves:
--   1. 403 on /rest/v1/productos?select=*,categorias(nombre) (admin page)
--   2. 404 on /cotizaciones/editar/[id] (quoteRes fails because productos embed gets 403)
-- Wrapped in DO blocks to be idempotent (policies may already exist from manual apply).

DO $$ BEGIN
  CREATE POLICY "categorias_select_authenticated"
    ON categorias FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_insert_authenticated"
    ON categorias FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_update_authenticated"
    ON categorias FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_delete_authenticated"
    ON categorias FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_select_anon"
    ON categorias FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "productos_select_authenticated"
    ON productos FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "productos_insert_authenticated"
    ON productos FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "productos_update_authenticated"
    ON productos FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "productos_delete_authenticated"
    ON productos FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "productos_select_anon"
    ON productos FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
