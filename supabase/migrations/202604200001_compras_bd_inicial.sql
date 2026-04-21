-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo de Compras y Gastos — Fase 1: Registro Directo y Flujo Financiero
-- Tablas: proveedores, cat_categorias_gasto, comprobantes_compra,
--         comprobantes_compras_detalles, pagos_emitidos
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. proveedores (espejo de clientes + datos bancarios) ────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento       text        NOT NULL DEFAULT 'RUC',
  numero_documento     text        NOT NULL UNIQUE,
  razon_social         text,
  nombres_contacto     text        NOT NULL DEFAULT '',
  apellidos_contacto   text        NOT NULL DEFAULT '',
  email                text,
  telefono             text,
  direccion            text,
  banco_predeterminado text,
  cuenta_bancaria      text,
  cuenta_cci           text,
  cuenta_detraccion_bn text,
  activo               boolean     NOT NULL DEFAULT true,
  fecha_creacion       timestamptz NOT NULL DEFAULT now()
);

-- ── 2. cat_categorias_gasto ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_categorias_gasto (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text    NOT NULL UNIQUE,
  descripcion text,
  activo      boolean NOT NULL DEFAULT true
);

-- ── 3. comprobantes_compra (cabecera — espejo de comprobantes ventas) ─────────
CREATE TABLE IF NOT EXISTS comprobantes_compra (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id             uuid          NOT NULL REFERENCES proveedores(id),
  categoria_gasto_id       uuid          REFERENCES cat_categorias_gasto(id),
  tipo_doc_codigo          text          NOT NULL,
  serie                    text          NOT NULL,
  correlativo              text          NOT NULL,
  serie_numero             text          GENERATED ALWAYS AS (upper(trim(serie)) || '-' || correlativo) STORED,
  fecha_emision            date          NOT NULL,
  fecha_vencimiento        date,
  moneda                   text          NOT NULL DEFAULT 'PEN',
  tipo_cambio              numeric(10,4) NOT NULL DEFAULT 1,
  forma_pago               text          NOT NULL DEFAULT 'Contado',
  mto_oper_gravadas        numeric(14,2) NOT NULL DEFAULT 0,
  mto_oper_exoneradas      numeric(14,2) NOT NULL DEFAULT 0,
  mto_oper_inafectas       numeric(14,2) NOT NULL DEFAULT 0,
  mto_igv                  numeric(14,2) NOT NULL DEFAULT 0,
  mto_isc                  numeric(14,2) NOT NULL DEFAULT 0,
  icbper                   numeric(14,2) NOT NULL DEFAULT 0,
  total_impuestos          numeric(14,2) NOT NULL DEFAULT 0,
  valor_venta              numeric(14,2) NOT NULL DEFAULT 0,
  subtotal                 numeric(14,2) NOT NULL DEFAULT 0,
  mto_imp_venta            numeric(14,2) NOT NULL DEFAULT 0,
  descuento_global_monto   numeric(14,2) NOT NULL DEFAULT 0,
  detraccion_cod_bien      text,
  detraccion_porcentaje    numeric(5,2),
  detraccion_monto         numeric(14,2),
  archivo_xml_url          text,
  archivo_pdf_url          text,
  notas                    text,
  estado_pago              text          NOT NULL DEFAULT 'pendiente'
                             CHECK (estado_pago IN ('pendiente', 'parcial', 'pagado')),
  saldo_pendiente          numeric(14,2) NOT NULL DEFAULT 0,
  created_at               timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE comprobantes_compra
  ADD CONSTRAINT comprobantes_compra_proveedor_serie_numero_unique
  UNIQUE (proveedor_id, serie_numero);

-- ── 4. comprobantes_compras_detalles (líneas — espejo de comprobantes_detalles)
CREATE TABLE IF NOT EXISTS comprobantes_compras_detalles (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_compra_id uuid          NOT NULL REFERENCES comprobantes_compra(id) ON DELETE CASCADE,
  producto_id           uuid,
  cod_producto_proveedor text,
  unidad_codigo         text          NOT NULL DEFAULT 'NIU',
  descripcion           text          NOT NULL,
  cantidad              numeric(14,4) NOT NULL DEFAULT 1,
  mto_valor_unitario    numeric(14,4) NOT NULL DEFAULT 0,
  mto_precio_unitario   numeric(14,4) NOT NULL DEFAULT 0,
  mto_valor_venta       numeric(14,2) NOT NULL DEFAULT 0,
  mto_base_igv          numeric(14,2) NOT NULL DEFAULT 0,
  porcentaje_igv        numeric(5,2)  NOT NULL DEFAULT 18,
  igv                   numeric(14,2) NOT NULL DEFAULT 0,
  tip_afe_igv_codigo    text          NOT NULL DEFAULT '10',
  descuento             numeric(14,2) NOT NULL DEFAULT 0,
  total_impuestos       numeric(14,2) NOT NULL DEFAULT 0
);

-- ── 5. pagos_emitidos (pagos al proveedor — espejo de cobros) ────────────────
CREATE TABLE IF NOT EXISTS pagos_emitidos (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_compra_id uuid          NOT NULL REFERENCES comprobantes_compra(id) ON DELETE CASCADE,
  metodo_pago_codigo    text,
  cuenta_bancaria_id    uuid,
  monto_pagado          numeric(14,2) NOT NULL CHECK (monto_pagado > 0),
  fecha_pago            date          NOT NULL DEFAULT CURRENT_DATE,
  referencia_operacion  text,
  comprobante_img_url   text,
  notas                 text,
  registrado_por        uuid          REFERENCES perfiles_usuario(id),
  moneda                text          NOT NULL DEFAULT 'PEN',
  anulado               boolean       NOT NULL DEFAULT false,
  anulado_por           uuid          REFERENCES perfiles_usuario(id),
  fecha_anulacion       timestamptz,
  motivo_anulacion      text,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

-- ── 6. Trigger: recalcula saldo_pendiente y estado_pago ─────────────────────
CREATE OR REPLACE FUNCTION fn_recalcular_saldo_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comprobante_id uuid;
  v_total          numeric(14,2);
  v_pagado         numeric(14,2);
  v_saldo          numeric(14,2);
  v_estado         text;
BEGIN
  v_comprobante_id := COALESCE(NEW.comprobante_compra_id, OLD.comprobante_compra_id);

  SELECT cc.mto_imp_venta, COALESCE(SUM(pe.monto_pagado), 0)
    INTO v_total, v_pagado
    FROM comprobantes_compra cc
    LEFT JOIN pagos_emitidos pe
      ON pe.comprobante_compra_id = cc.id
     AND pe.anulado = false
    WHERE cc.id = v_comprobante_id
    GROUP BY cc.mto_imp_venta;

  v_saldo := GREATEST(v_total - v_pagado, 0);

  IF v_saldo = 0 THEN
    v_estado := 'pagado';
  ELSIF v_pagado > 0 THEN
    v_estado := 'parcial';
  ELSE
    v_estado := 'pendiente';
  END IF;

  UPDATE comprobantes_compra
    SET saldo_pendiente = v_saldo,
        estado_pago     = v_estado
    WHERE id = v_comprobante_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalcular_saldo_compra
AFTER INSERT OR UPDATE OR DELETE ON pagos_emitidos
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_saldo_compra();

-- ── 7. RPC: registrar_comprobante_compra (cabecera + detalles atómicos) ──────
CREATE OR REPLACE FUNCTION registrar_comprobante_compra(
  p_proveedor_id           uuid,
  p_categoria_gasto_id     uuid          DEFAULT NULL,
  p_tipo_doc_codigo        text          DEFAULT '01',
  p_serie                  text          DEFAULT 'F001',
  p_correlativo            text          DEFAULT '1',
  p_fecha_emision          date          DEFAULT CURRENT_DATE,
  p_fecha_vencimiento      date          DEFAULT NULL,
  p_moneda                 text          DEFAULT 'PEN',
  p_tipo_cambio            numeric       DEFAULT 1,
  p_forma_pago             text          DEFAULT 'Contado',
  p_mto_oper_gravadas      numeric       DEFAULT 0,
  p_mto_oper_exoneradas    numeric       DEFAULT 0,
  p_mto_oper_inafectas     numeric       DEFAULT 0,
  p_mto_igv                numeric       DEFAULT 0,
  p_mto_isc                numeric       DEFAULT 0,
  p_icbper                 numeric       DEFAULT 0,
  p_total_impuestos        numeric       DEFAULT 0,
  p_valor_venta            numeric       DEFAULT 0,
  p_subtotal               numeric       DEFAULT 0,
  p_mto_imp_venta          numeric       DEFAULT 0,
  p_descuento_global_monto numeric       DEFAULT 0,
  p_detraccion_cod_bien    text          DEFAULT NULL,
  p_detraccion_porcentaje  numeric       DEFAULT NULL,
  p_detraccion_monto       numeric       DEFAULT NULL,
  p_archivo_xml_url        text          DEFAULT NULL,
  p_archivo_pdf_url        text          DEFAULT NULL,
  p_notas                  text          DEFAULT NULL,
  p_detalles               jsonb         DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id      uuid;
  v_detalle jsonb;
BEGIN
  INSERT INTO comprobantes_compra (
    proveedor_id, categoria_gasto_id, tipo_doc_codigo, serie, correlativo,
    fecha_emision, fecha_vencimiento, moneda, tipo_cambio, forma_pago,
    mto_oper_gravadas, mto_oper_exoneradas, mto_oper_inafectas,
    mto_igv, mto_isc, icbper, total_impuestos, valor_venta, subtotal,
    mto_imp_venta, descuento_global_monto,
    detraccion_cod_bien, detraccion_porcentaje, detraccion_monto,
    archivo_xml_url, archivo_pdf_url, notas,
    saldo_pendiente, estado_pago
  ) VALUES (
    p_proveedor_id, p_categoria_gasto_id, p_tipo_doc_codigo, p_serie, p_correlativo,
    p_fecha_emision, p_fecha_vencimiento, p_moneda, p_tipo_cambio, p_forma_pago,
    p_mto_oper_gravadas, p_mto_oper_exoneradas, p_mto_oper_inafectas,
    p_mto_igv, p_mto_isc, p_icbper, p_total_impuestos, p_valor_venta, p_subtotal,
    p_mto_imp_venta, p_descuento_global_monto,
    p_detraccion_cod_bien, p_detraccion_porcentaje, p_detraccion_monto,
    p_archivo_xml_url, p_archivo_pdf_url, p_notas,
    p_mto_imp_venta, 'pendiente'
  )
  RETURNING id INTO v_id;

  FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles) LOOP
    INSERT INTO comprobantes_compras_detalles (
      comprobante_compra_id,
      cod_producto_proveedor,
      unidad_codigo,
      descripcion,
      cantidad,
      mto_valor_unitario,
      mto_precio_unitario,
      mto_valor_venta,
      mto_base_igv,
      porcentaje_igv,
      igv,
      tip_afe_igv_codigo,
      descuento,
      total_impuestos
    ) VALUES (
      v_id,
      (v_detalle->>'cod_producto_proveedor'),
      COALESCE(v_detalle->>'unidad_codigo', 'NIU'),
      v_detalle->>'descripcion',
      (v_detalle->>'cantidad')::numeric,
      COALESCE((v_detalle->>'mto_valor_unitario')::numeric, 0),
      COALESCE((v_detalle->>'mto_precio_unitario')::numeric, 0),
      COALESCE((v_detalle->>'mto_valor_venta')::numeric, 0),
      COALESCE((v_detalle->>'mto_base_igv')::numeric, 0),
      COALESCE((v_detalle->>'porcentaje_igv')::numeric, 18),
      COALESCE((v_detalle->>'igv')::numeric, 0),
      COALESCE(v_detalle->>'tip_afe_igv_codigo', '10'),
      COALESCE((v_detalle->>'descuento')::numeric, 0),
      COALESCE((v_detalle->>'total_impuestos')::numeric, 0)
    );
  END LOOP;

  RETURN v_id;
END;
$$;

-- ── 8. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE proveedores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_categorias_gasto      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_compra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_compras_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_emitidos            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_proveedores" ON proveedores
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "admin_all_cat_categorias_gasto" ON cat_categorias_gasto
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "admin_all_comprobantes_compra" ON comprobantes_compra
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "admin_all_comprobantes_compras_detalles" ON comprobantes_compras_detalles
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "admin_all_pagos_emitidos" ON pagos_emitidos
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

-- ── 9. Bucket Storage: compras_adjuntos ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compras_adjuntos',
  'compras_adjuntos',
  false,
  10485760,
  ARRAY['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_select_compras_adjuntos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'compras_adjuntos'
    AND EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_insert_compras_adjuntos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compras_adjuntos'
    AND EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_delete_compras_adjuntos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'compras_adjuntos'
    AND EXISTS (SELECT 1 FROM public.perfiles_usuario WHERE id = auth.uid() AND rol = 'admin')
  );

-- ── 10. Seed: cat_categorias_gasto ───────────────────────────────────────────
INSERT INTO cat_categorias_gasto (nombre, descripcion) VALUES
  ('Mercadería',         'Compra de productos para reventa o producción'),
  ('Servicios',          'Servicios profesionales, consultoría, honorarios'),
  ('Planilla',           'Sueldos, beneficios sociales y cargas laborales'),
  ('Servicios Públicos', 'Agua, luz, gas, internet, telefonía'),
  ('Activos Fijos',      'Equipos, maquinaria, mobiliario, vehículos'),
  ('Otros',              'Gastos varios no clasificados')
ON CONFLICT (nombre) DO NOTHING;
