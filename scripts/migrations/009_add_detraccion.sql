-- ============================================================
-- MIGRATION 009: Soporte de Detracciones SUNAT
-- Sistema de Cotizaciones v2
--
-- RETROCOMPATIBILIDAD GARANTIZADA:
--   - Todas las columnas nuevas son NULL (no rompe registros existentes)
--   - Nuevos params del RPC tienen DEFAULT → llamadas existentes no cambian
--   - FK en detraccion_cod_bien es opcional (NULL allowed)
-- ============================================================

-- ─── 1. Catálogo 51: Tipos de Operación SUNAT ────────────────

CREATE TABLE IF NOT EXISTS public.cat_tipo_operacion (
  codigo      VARCHAR(4) NOT NULL,
  descripcion TEXT       NOT NULL,
  activo      BOOLEAN    NOT NULL DEFAULT true,
  CONSTRAINT cat_tipo_operacion_pkey PRIMARY KEY (codigo)
);

INSERT INTO public.cat_tipo_operacion (codigo, descripcion) VALUES
  ('0101', 'Venta interna'),
  ('1001', 'Operación Sujeta a Detracción'),
  ('1002', 'Operación Sujeta a Detracción - Recursos Hidrobiológicos'),
  ('1003', 'Operación Sujeta a Detracción - Servicios de Transporte Pasajeros'),
  ('1004', 'Operación Sujeta a Detracción - Servicios de Transporte Carga')
ON CONFLICT (codigo) DO NOTHING;

-- ─── 2. Catálogo 54: Bienes y Servicios de Detracción ────────

CREATE TABLE IF NOT EXISTS public.cat_bien_servicio_detraccion (
  codigo      VARCHAR(3) NOT NULL,
  descripcion TEXT       NOT NULL,
  activo      BOOLEAN    NOT NULL DEFAULT true,
  CONSTRAINT cat_bien_servicio_detraccion_pkey PRIMARY KEY (codigo)
);

INSERT INTO public.cat_bien_servicio_detraccion (codigo, descripcion) VALUES
  ('001', 'Azúcar y melaza de caña'),
  ('002', 'Arroz'),
  ('003', 'Alcohol etílico'),
  ('004', 'Recursos hidrobiológicos'),
  ('005', 'Maíz amarillo duro'),
  ('007', 'Caña de azúcar'),
  ('008', 'Madera'),
  ('009', 'Arena y piedra'),
  ('010', 'Residuos, subproductos, desechos, recortes y desperdicios'),
  ('011', 'Bienes gravados con el IGV, o renuncia a la exoneración'),
  ('012', 'Intermediación laboral y tercerización'),
  ('013', 'Animales vivos'),
  ('014', 'Carnes y despojos comestibles'),
  ('015', 'Abonos, cueros y pieles de origen animal'),
  ('016', 'Aceite de pescado'),
  ('017', 'Harina, polvo y pellets de pescado, crustáceos, moluscos y demás invertebrados acuáticos'),
  ('019', 'Arrendamiento de bienes muebles'),
  ('020', 'Mantenimiento y reparación de bienes muebles'),
  ('021', 'Movimiento de carga'),
  ('022', 'Otros servicios empresariales'),
  ('023', 'Leche'),
  ('024', 'Comisión mercantil'),
  ('025', 'Fabricación de bienes por encargo'),
  ('026', 'Servicio de transporte de personas'),
  ('027', 'Servicio de transporte de carga'),
  ('028', 'Transporte de pasajeros'),
  ('030', 'Contratos de construcción'),
  ('031', 'Oro gravado con el IGV'),
  ('034', 'Minerales metálicos no auríferos'),
  ('035', 'Bienes exonerados del IGV'),
  ('036', 'Oro y demás minerales metálicos exonerados del IGV'),
  ('037', 'Demás servicios gravados con el IGV'),
  ('039', 'Minerales no metálicos'),
  ('040', 'Bien inmueble gravado con IGV')
ON CONFLICT (codigo) DO NOTHING;

-- ─── 3. empresa_configuracion: cuenta BN por defecto ─────────

ALTER TABLE public.empresa_configuracion
  ADD COLUMN IF NOT EXISTS detraccion_cuenta_bn VARCHAR(20) NULL;

-- ─── 4. comprobantes: columnas de detracción ──────────────────

ALTER TABLE public.comprobantes
  ADD COLUMN IF NOT EXISTS detraccion_cod_bien       VARCHAR(3)    NULL,
  ADD COLUMN IF NOT EXISTS detraccion_cod_medio_pago VARCHAR(3)    NULL,
  ADD COLUMN IF NOT EXISTS detraccion_porcentaje     NUMERIC(5,2)  NULL,
  ADD COLUMN IF NOT EXISTS detraccion_monto          NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS detraccion_cuenta_bn      VARCHAR(20)   NULL;

-- FK opcional (ON DELETE SET NULL para no romper si se borra un catálogo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comprobantes_detraccion_cod_bien_fkey'
  ) THEN
    ALTER TABLE public.comprobantes
      ADD CONSTRAINT comprobantes_detraccion_cod_bien_fkey
      FOREIGN KEY (detraccion_cod_bien)
      REFERENCES public.cat_bien_servicio_detraccion(codigo)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 5. RPC emitir_comprobante: agregar params de detracción ──
-- Dropar TODOS los overloads existentes antes de recrear
-- (evita error 42725 "function name is not unique" con CREATE OR REPLACE)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'emitir_comprobante'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.emitir_comprobante(
  p_pedido_id                 UUID,
  p_tipo_doc_codigo           TEXT,
  p_cliente_id                UUID,
  p_fecha_emision             DATE,
  p_subtotal                  NUMERIC,
  p_igv_monto                 NUMERIC,
  p_total                     NUMERIC,
  p_lineas                    JSONB,
  p_direccion_facturacion     TEXT    DEFAULT NULL,
  p_descuento_global_monto    NUMERIC DEFAULT 0,
  p_descuento_global_codigo   TEXT    DEFAULT '03',
  -- Phase 2 SUNAT (previos)
  p_icbper                    NUMERIC DEFAULT NULL,
  p_mto_isc                   NUMERIC DEFAULT NULL,
  -- Phase 3: Detracción (todos opcionales)
  p_tipo_operacion            TEXT    DEFAULT '0101',
  p_detraccion_cod_bien       TEXT    DEFAULT NULL,
  p_detraccion_cod_medio_pago TEXT    DEFAULT NULL,
  p_detraccion_porcentaje     NUMERIC DEFAULT NULL,
  p_detraccion_monto          NUMERIC DEFAULT NULL,
  p_detraccion_cuenta_bn      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comprobante_id uuid;
    v_serie          text;
    v_correlativo    integer;
    v_serie_numero   text;
    v_linea          jsonb;
    v_afecta_base    boolean := false;
BEGIN
    -- 1. Determinar si el descuento afecta la base imponible
    SELECT EXISTS (
        SELECT 1 FROM cat_cargos_descuentos
        WHERE codigo = COALESCE(p_descuento_global_codigo, '03') AND tipo = 'descuento'
    ) INTO v_afecta_base;

    -- 2. Obtener serie y próximo correlativo
    SELECT serie, correlativo_actual + 1
    INTO v_serie, v_correlativo
    FROM configuracion_series
    WHERE tipo_doc_codigo = p_tipo_doc_codigo AND activo = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró una serie activa para el tipo de documento %', p_tipo_doc_codigo;
    END IF;

    v_serie_numero := v_serie || '-' || LPAD(v_correlativo::text, 8, '0');

    -- 3. Insertar cabecera del comprobante
    INSERT INTO comprobantes (
        pedido_id,
        cliente_id,
        tipo_doc_codigo,
        tipo_operacion,
        serie,
        correlativo,
        serie_numero,
        fecha_emision,
        tipo_moneda,
        forma_pago,
        mto_oper_gravadas,
        mto_oper_exoneradas,
        mto_oper_inafectas,
        mto_igv,
        total_impuestos,
        valor_venta,
        subtotal,
        mto_imp_venta,
        estado_sunat,
        descuento_global_monto,
        descuento_global_codigo,
        -- Phase 2 SUNAT
        cod_establecimiento_anexo,
        icbper,
        mto_isc,
        -- Detracción
        detraccion_cod_bien,
        detraccion_cod_medio_pago,
        detraccion_porcentaje,
        detraccion_monto,
        detraccion_cuenta_bn
    ) VALUES (
        p_pedido_id,
        p_cliente_id,
        p_tipo_doc_codigo,
        COALESCE(p_tipo_operacion, '0101'),
        v_serie,
        v_correlativo,
        v_serie_numero,
        p_fecha_emision,
        'PEN',
        'Contado',
        CASE WHEN v_afecta_base
            THEN p_subtotal - COALESCE(p_descuento_global_monto, 0)
            ELSE p_subtotal
        END,
        0,
        0,
        p_igv_monto,
        p_igv_monto,
        p_subtotal,
        p_subtotal,
        p_total,
        'borrador',
        COALESCE(p_descuento_global_monto, 0),
        COALESCE(p_descuento_global_codigo, '03'),
        -- Phase 2
        '0000',
        p_icbper,
        p_mto_isc,
        -- Detracción
        p_detraccion_cod_bien,
        p_detraccion_cod_medio_pago,
        p_detraccion_porcentaje,
        p_detraccion_monto,
        p_detraccion_cuenta_bn
    ) RETURNING id INTO v_comprobante_id;

    -- 4. Insertar detalles
    FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
    LOOP
        INSERT INTO comprobantes_detalles (
            comprobante_id,
            producto_id,
            descripcion,
            cantidad,
            unidad_codigo,
            mto_precio_unitario,
            mto_valor_unitario,
            mto_base_igv,
            igv,
            mto_valor_venta,
            tip_afe_igv_codigo,
            total_impuestos,
            cod_prod_sunat,
            cod_prod_gs1,
            descuento
        ) VALUES (
            v_comprobante_id,
            (v_linea->>'producto_id')::uuid,
            v_linea->>'nombre_producto',
            (v_linea->>'cantidad')::numeric,
            COALESCE(v_linea->>'unidad_sunat', v_linea->>'unidad_medida', 'NIU'),
            (v_linea->>'precio_unitario')::numeric,
            (v_linea->>'mto_valor_unitario')::numeric,
            (v_linea->>'mto_base_igv')::numeric,
            (v_linea->>'mto_igv')::numeric,
            (v_linea->>'subtotal')::numeric,
            v_linea->>'afectacion_igv',
            (v_linea->>'mto_igv')::numeric,
            NULLIF(v_linea->>'cod_prod_sunat', ''),
            NULLIF(v_linea->>'cod_prod_gs1', ''),
            CASE
                WHEN v_linea->>'descuento_linea' IS NOT NULL
                THEN (v_linea->>'descuento_linea')::numeric
                ELSE NULL
            END
        );
    END LOOP;

    -- 5. Actualizar correlativo de la serie
    UPDATE configuracion_series
    SET correlativo_actual = v_correlativo
    WHERE tipo_doc_codigo = p_tipo_doc_codigo AND serie = v_serie;

    -- 6. Marcar pedido como facturado
    UPDATE pedidos
    SET estado = 'facturado'
    WHERE id = p_pedido_id;

    RETURN v_comprobante_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emitir_comprobante TO authenticated;
GRANT EXECUTE ON FUNCTION public.emitir_comprobante TO service_role;
