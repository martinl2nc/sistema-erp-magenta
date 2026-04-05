-- ============================================================
-- MIGRATION 007: Fix mto_precio_unitario calculation in RPC
-- Bug: The RPC was saving precio_unitario (without IGV) instead
-- of the correct mto_precio_unitario (with IGV included).
-- 
-- SUNAT expects mto_precio_unitario to be the SALE PRICE
-- with taxes included ( precio_venta_unitario ).
--
-- Formula:
--   - For taxable items (afectacion_igv = '10'):
--     mto_precio_unitario = mto_base_igv / cantidad * 1.18
--   - For exempt/untaxed (afectacion_igv IN ('20', '21', '30', '31', '32', '33', '34', '35', '36'):
--     mto_precio_unitario = mto_valor_unitario (no IGV)
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
  p_icbper                    NUMERIC DEFAULT NULL,
  p_mto_isc                   NUMERIC DEFAULT NULL,
  p_mto_oper_gravadas         NUMERIC DEFAULT NULL,
  p_mto_oper_exoneradas       NUMERIC DEFAULT NULL
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
    v_afectacion_igv text;
    v_mto_base_igv   numeric;
    v_mto_valor_unitario numeric;
    v_mto_precio_unitario numeric;
    v_descuento_linea numeric;
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
        mto_oper_gravadas,         -- caller-supplied for accuracy; RPC fallback if NULL
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
        COALESCE(p_mto_oper_gravadas,
            CASE WHEN v_afecta_base
                THEN p_subtotal - COALESCE(p_descuento_global_monto, 0)
                ELSE p_subtotal
            END),
        COALESCE(p_mto_oper_exoneradas, 0),
        0,
        p_igv_monto,
        p_igv_monto,
        p_subtotal,
        p_subtotal,
        p_total,
        'borrador',
        COALESCE(p_descuento_global_monto, 0),
        COALESCE(p_descuento_global_codigo, '03'),
        '0000',
        p_icbper,
        p_mto_isc
    ) RETURNING id INTO v_comprobante_id;

    -- 4. Insertar detalles
    FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
    LOOP
        -- Extract values for calculation
        v_afectacion_igv := COALESCE(v_linea->>'afectacion_igv', '10');
        v_mto_base_igv := COALESCE((v_linea->>'mto_base_igv')::numeric, 0);
        v_mto_valor_unitario := COALESCE((v_linea->>'mto_valor_unitario')::numeric, 0);
        v_descuento_linea := COALESCE((v_linea->>'descuento_linea_monto')::numeric, 0);
        
        -- Calculate mto_precio_unitario (sale price with taxes)
        -- For taxable items (10, 11, 12, 17): multiply base by 1.18
        -- For exempt (20, 21) and untaxed (30-36, 40): no IGV, use valor_unitario
        IF v_afectacion_igv IN ('10', '11', '12', '17') THEN
            -- Taxable: base_igv already has the discount deducted
            v_mto_precio_unitario := ROUND(v_mto_base_igv * 1.18, 4);
        ELSE
            -- Exempt/Untaxed: no IGV, price is the same as valor_unitario
            v_mto_precio_unitario := v_mto_valor_unitario;
        END IF;

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
            v_mto_precio_unitario,
            v_mto_valor_unitario,
            v_mto_base_igv,
            (v_linea->>'mto_igv')::numeric,
            (v_linea->>'subtotal')::numeric,
            v_afectacion_igv,
            (v_linea->>'mto_igv')::numeric,
            NULLIF(v_linea->>'cod_prod_sunat', ''),
            NULLIF(v_linea->>'cod_prod_gs1', ''),
            CASE
                WHEN v_descuento_linea > 0 THEN v_descuento_linea
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

-- Verify the function was updated
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'emitir_comprobante';
