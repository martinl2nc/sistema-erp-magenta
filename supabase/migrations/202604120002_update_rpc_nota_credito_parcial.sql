-- ==========================================
-- RPC: crear_nota_credito (Actualizado para Notas Parciales)
-- Añade soporte para no anular la factura original cuando el tipo de nota no es 01/02
-- e inyectar detalles editados custom para descuentos y devoluciones por item.
-- ==========================================

CREATE OR REPLACE FUNCTION crear_nota_credito(
  p_comprobante_id      uuid,
  p_motivo              text,
  p_tipo_nota_codigo    varchar(2) DEFAULT NULL,
  p_lineas              jsonb DEFAULT NULL,
  p_mto_oper_gravadas   numeric DEFAULT NULL,
  p_mto_igv             numeric DEFAULT NULL,
  p_mto_imp_venta       numeric DEFAULT NULL,
  p_valor_venta         numeric DEFAULT NULL,
  p_subtotal            numeric DEFAULT NULL,
  p_total_impuestos     numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original         comprobantes%ROWTYPE;
  v_serie_nc         varchar(4);
  v_correlativo_nc   integer;
  v_config_serie     configuracion_series%ROWTYPE;
  v_nc_id            uuid;
  v_serie_original   varchar(4);
  v_primer_caracter  char(1);
BEGIN
  -- 1. Obtener el comprobante original con bloqueo FOR UPDATE
  SELECT * INTO v_original
  FROM comprobantes
  WHERE id = p_comprobante_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprobante original no encontrado: %', p_comprobante_id;
  END IF;

  -- 2. Validar que no sea ya una Nota de Crédito ni esté anulado
  IF v_original.tipo_doc_codigo = '07' THEN
    RAISE EXCEPTION 'No se puede crear nota de crédito sobre otra nota de crédito';
  END IF;

  -- Solo validamos que esté anulado si queremos anularla (ej 01 o 02)
  -- Para NC parciales como 04 o 07, podríamos aceptarlas (dependiendo de regla de negocio), 
  -- pero por defecto si la original ya está anulada no se le pueden hacer notas parciales válidas.
  IF v_original.estado_sunat = 'anulada' THEN
    RAISE EXCEPTION 'El comprobante ya se encuentra anulado';
  END IF;

  -- 3. Determinar la serie de la NC
  v_serie_original := UPPER(v_original.serie);
  v_primer_caracter := SUBSTRING(v_serie_original FROM 1 FOR 1);

  IF v_primer_caracter = 'F' THEN
    v_serie_nc := 'FC01';
  ELSIF v_primer_caracter = 'B' THEN
    v_serie_nc := 'BC01';
  ELSE
    v_serie_nc := 'FC01';
  END IF;

  -- 4. Nueva config serie
  SELECT * INTO v_config_serie
  FROM configuracion_series
  WHERE tipo_doc_codigo = '07'
    AND serie = v_serie_nc
    AND activo = true
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO configuracion_series (tipo_doc_codigo, serie, correlativo_actual, activo)
    VALUES ('07', v_serie_nc, 1, true)
    ON CONFLICT (serie) DO UPDATE
      SET correlativo_actual = configuracion_series.correlativo_actual + 1
    RETURNING * INTO v_config_serie;
    
    v_correlativo_nc := 1;
  ELSE
    v_correlativo_nc := v_config_serie.correlativo_actual + 1;
    UPDATE configuracion_series
    SET correlativo_actual = v_correlativo_nc
    WHERE id = v_config_serie.id;
  END IF;

  -- 5. Insertar la NC
  INSERT INTO comprobantes (
    pedido_id,
    cliente_id,
    tipo_operacion,
    tipo_doc_codigo,
    serie,
    correlativo,
    serie_numero,
    comprobante_referencia_id,
    motivo_nota,
    tipo_nota_codigo,
    fecha_emision,
    fecha_vencimiento,
    tipo_moneda,
    forma_pago,
    mto_oper_gravadas,
    mto_oper_exoneradas,
    mto_oper_inafectas,
    mto_oper_gratuitas,
    mto_igv,
    mto_igv_gratuitas,
    icbper,
    mto_isc,
    total_impuestos,
    valor_venta,
    subtotal,
    mto_imp_venta,
    descuento_global_monto,
    descuento_global_codigo,
    leyendas,
    cod_establecimiento_anexo,
    estado_sunat,
    detraccion_cod_bien,
    detraccion_cod_medio_pago,
    detraccion_porcentaje,
    detraccion_monto,
    detraccion_cuenta_bn
  ) VALUES (
    v_original.pedido_id,
    v_original.cliente_id,
    v_original.tipo_operacion,
    '07',
    v_serie_nc,
    v_correlativo_nc,
    v_serie_nc || '-' || LPAD(v_correlativo_nc::text, 8, '0'),
    p_comprobante_id,
    p_motivo,
    p_tipo_nota_codigo,
    NOW(),
    v_original.fecha_vencimiento,
    v_original.tipo_moneda,
    v_original.forma_pago,
    COALESCE(p_mto_oper_gravadas, v_original.mto_oper_gravadas),
    v_original.mto_oper_exoneradas,
    v_original.mto_oper_inafectas,
    v_original.mto_oper_gratuitas,
    COALESCE(p_mto_igv, v_original.mto_igv),
    v_original.mto_igv_gratuitas,
    v_original.icbper,
    v_original.mto_isc,
    COALESCE(p_total_impuestos, v_original.total_impuestos),
    COALESCE(p_valor_venta, v_original.valor_venta),
    COALESCE(p_subtotal, v_original.subtotal),
    COALESCE(p_mto_imp_venta, v_original.mto_imp_venta),
    -- Descuentos globales originales no aplican necesariamente si se modifica la fra, 
    -- pero por defecto los conservaremos as-is a menos que un requerimiento en el futuro pida quitarlos.
    v_original.descuento_global_monto,
    v_original.descuento_global_codigo,
    v_original.leyendas,
    v_original.cod_establecimiento_anexo,
    'borrador',
    v_original.detraccion_cod_bien,
    v_original.detraccion_cod_medio_pago,
    v_original.detraccion_porcentaje,
    v_original.detraccion_monto,
    v_original.detraccion_cuenta_bn
  )
  RETURNING id INTO v_nc_id;

  -- 6. Insertar las líneas
  IF p_lineas IS NOT NULL THEN
     INSERT INTO comprobantes_detalles (
      comprobante_id,
      producto_id,
      cod_producto,
      cod_prod_sunat,
      cod_prod_gs1,
      unidad_codigo,
      descripcion,
      cantidad,
      mto_valor_unitario,
      mto_valor_gratuito,
      mto_precio_unitario,
      mto_valor_venta,
      mto_base_igv,
      porcentaje_igv,
      igv,
      tip_afe_igv_codigo,
      descuento,
      tipo_sis_isc_codigo,
      mto_base_isc,
      porcentaje_isc,
      isc,
      factor_icbper,
      icbper,
      total_impuestos
    )
    SELECT
      v_nc_id,
      -- Nullify uuid si viene vacío para evitar error de casteo
      NULLIF(l->>'producto_id','')::uuid,
      l->>'cod_producto',
      l->>'cod_prod_sunat',
      l->>'cod_prod_gs1',
      l->>'unidad_codigo',
      l->>'descripcion',
      (l->>'cantidad')::numeric,
      (l->>'mto_valor_unitario')::numeric,
      (l->>'mto_valor_gratuito')::numeric,
      (l->>'mto_precio_unitario')::numeric,
      (l->>'mto_valor_venta')::numeric,
      (l->>'mto_base_igv')::numeric,
      (l->>'porcentaje_igv')::numeric,
      (l->>'igv')::numeric,
      l->>'tip_afe_igv_codigo',
      (l->>'descuento')::numeric,
      l->>'tipo_sis_isc_codigo',
      (l->>'mto_base_isc')::numeric,
      (l->>'porcentaje_isc')::numeric,
      (l->>'isc')::numeric,
      (l->>'factor_icbper')::numeric,
      (l->>'icbper')::numeric,
      (l->>'total_impuestos')::numeric
    FROM jsonb_array_elements(p_lineas) AS l;
  ELSE
    INSERT INTO comprobantes_detalles (
      comprobante_id, producto_id, cod_producto, cod_prod_sunat, cod_prod_gs1,
      unidad_codigo, descripcion, cantidad, mto_valor_unitario, mto_valor_gratuito,
      mto_precio_unitario, mto_valor_venta, mto_base_igv, porcentaje_igv, igv,
      tip_afe_igv_codigo, descuento, tipo_sis_isc_codigo, mto_base_isc, 
      porcentaje_isc, isc, factor_icbper, icbper, total_impuestos
    )
    SELECT
      v_nc_id, producto_id, cod_producto, cod_prod_sunat, cod_prod_gs1,
      unidad_codigo, descripcion, cantidad, mto_valor_unitario, mto_valor_gratuito,
      mto_precio_unitario, mto_valor_venta, mto_base_igv, porcentaje_igv, igv,
      tip_afe_igv_codigo, descuento, tipo_sis_isc_codigo, mto_base_isc, 
      porcentaje_isc, isc, factor_icbper, icbper, total_impuestos
    FROM comprobantes_detalles
    WHERE comprobante_id = p_comprobante_id;
  END IF;

  -- 7. Marcar original como anulado (Anulaciones totales)
  IF p_tipo_nota_codigo IN ('01', '02', '03', '06', '10', '13') THEN
    UPDATE comprobantes
    SET estado_sunat = 'anulada'
    WHERE id = p_comprobante_id;
  END IF;

  RETURN v_nc_id;

END;
$$;

GRANT EXECUTE ON FUNCTION crear_nota_credito(uuid, text, varchar, jsonb, numeric, numeric, numeric, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION crear_nota_credito(uuid, text, varchar, jsonb, numeric, numeric, numeric, numeric, numeric, numeric) TO anon;
