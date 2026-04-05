-- ============================================================
-- MIGRATION 004: Actualizar RPC emitir_comprobante
-- Sistema de Cotizaciones v2 — Fase 2 SUNAT
--
-- RETROCOMPATIBILIDAD GARANTIZADA:
--   - Firma existente sin cambios (mismos parámetros y defaults)
--   - Nuevos parámetros opcionales con DEFAULT NULL
--   - Nuevos campos en p_lineas JSONB leídos con NULLIF (NULL si no se envían)
--
-- LÓGICA PRESERVADA DEL ORIGINAL:
--   - v_afecta_base para descuento que afecta base imponible
--   - CASE para mto_oper_gravadas con descuento
--   - Todos los campos originales del INSERT comprobantes
--   - Loop de detalles con mismos campos
--   - UPDATE correlativo y pedido.estado
-- ============================================================

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
  -- Nuevos parámetros opcionales (Phase 2 SUNAT)
  p_icbper                    NUMERIC DEFAULT NULL,
  p_mto_isc                   NUMERIC DEFAULT NULL
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
        -- Nuevas columnas Phase 2 SUNAT
        cod_establecimiento_anexo,
        icbper,
        mto_isc
    ) VALUES (
        p_pedido_id,
        p_cliente_id,
        p_tipo_doc_codigo,
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
        -- Nuevos valores
        '0000',
        p_icbper,
        p_mto_isc
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
            -- Nuevas columnas Phase 2 SUNAT (opcionales — NULL si no se envían)
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
            -- Nuevos: leídos opcionalmente del JSONB, NULL si no existen
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
