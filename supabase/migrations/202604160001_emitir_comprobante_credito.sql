-- ==========================================
-- RPC: emitir_comprobante (Actualizado para Facturas a Crédito)
-- Agrega soporte para forma_pago = 'Credito' con inserción transaccional
-- de cuotas en comprobantes_cuotas y actualización de fecha_vencimiento.
-- Cambios retrocompatibles: p_forma_pago DEFAULT 'Contado', p_cuotas DEFAULT NULL.
-- ==========================================

CREATE OR REPLACE FUNCTION public.emitir_comprobante(
  p_pedido_id                 uuid DEFAULT NULL,
  p_tipo_doc_codigo           text DEFAULT NULL,
  p_cliente_id                uuid DEFAULT NULL,
  p_fecha_emision             date DEFAULT NULL,
  p_subtotal                  numeric DEFAULT NULL,
  p_igv_monto                 numeric DEFAULT NULL,
  p_total                     numeric DEFAULT NULL,
  p_lineas                    jsonb DEFAULT NULL,
  p_direccion_facturacion     text DEFAULT NULL,
  p_descuento_global_monto    numeric DEFAULT 0,
  p_descuento_global_codigo   text DEFAULT '03',
  p_icbper                    numeric DEFAULT NULL,
  p_mto_isc                   numeric DEFAULT NULL,
  p_tipo_operacion            text DEFAULT '0101',
  p_detraccion_cod_bien       text DEFAULT NULL,
  p_detraccion_cod_medio_pago text DEFAULT NULL,
  p_detraccion_porcentaje     numeric DEFAULT NULL,
  p_detraccion_monto          numeric DEFAULT NULL,
  p_detraccion_cuenta_bn      text DEFAULT NULL,
  p_forma_pago                text DEFAULT 'Contado',
  p_cuotas                    jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comprobante_id uuid;
  v_serie          text;
  v_correlativo    integer;
  v_serie_numero   text;
  v_linea          jsonb;
  v_cuota          jsonb;
  v_afecta_base    boolean := false;
  v_num_cuota      smallint := 1;
  v_max_fecha      date;
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
    cod_establecimiento_anexo,
    icbper,
    mto_isc,
    detraccion_cod_bien,
    detraccion_cod_medio_pago,
    detraccion_porcentaje,
    detraccion_monto,
    detraccion_cuenta_bn
  ) VALUES (
    p_pedido_id,
    p_cliente_id,
    p_tipo_doc_codigo,
    p_tipo_operacion,
    v_serie,
    v_correlativo,
    v_serie_numero,
    p_fecha_emision,
    'PEN',
    COALESCE(p_forma_pago, 'Contado'),
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
    '0000',
    p_icbper,
    p_mto_isc,
    p_detraccion_cod_bien,
    p_detraccion_cod_medio_pago,
    p_detraccion_porcentaje,
    p_detraccion_monto,
    p_detraccion_cuenta_bn
  ) RETURNING id INTO v_comprobante_id;

  -- 4. Insertar detalles de línea
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    INSERT INTO comprobantes_detalles (
      comprobante_id,
      producto_id,
      cod_producto,
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
      NULLIF(v_linea->>'sku', '')::text,
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

  -- 5. Insertar cuotas si corresponde (forma_pago = 'Credito')
  IF p_cuotas IS NOT NULL AND jsonb_array_length(p_cuotas) > 0 THEN
    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
      INSERT INTO comprobantes_cuotas (
        comprobante_id,
        numero_cuota,
        moneda,
        monto,
        fecha_pago
      ) VALUES (
        v_comprobante_id,
        v_num_cuota,
        COALESCE(v_cuota->>'moneda', 'PEN'),
        (v_cuota->>'monto')::numeric,
        (v_cuota->>'fecha')::timestamptz
      );
      v_num_cuota := v_num_cuota + 1;
    END LOOP;

    -- Actualizar fecha_vencimiento del comprobante con la fecha de la última cuota
    SELECT MAX((c->>'fecha')::date)
    INTO v_max_fecha
    FROM jsonb_array_elements(p_cuotas) AS c;

    UPDATE comprobantes
    SET fecha_vencimiento = v_max_fecha
    WHERE id = v_comprobante_id;
  END IF;

  -- 6. Actualizar correlativo de la serie
  UPDATE configuracion_series
  SET correlativo_actual = v_correlativo
  WHERE tipo_doc_codigo = p_tipo_doc_codigo AND serie = v_serie;

  -- 7. Marcar pedido como facturado (no-op cuando p_pedido_id IS NULL)
  UPDATE pedidos
  SET estado = 'facturado'
  WHERE id = p_pedido_id;

  RETURN v_comprobante_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.emitir_comprobante(uuid, text, uuid, date, numeric, numeric, numeric, jsonb, text, numeric, text, numeric, numeric, text, text, text, numeric, numeric, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emitir_comprobante(uuid, text, uuid, date, numeric, numeric, numeric, jsonb, text, numeric, text, numeric, numeric, text, text, text, numeric, numeric, text, text, jsonb) TO anon;
