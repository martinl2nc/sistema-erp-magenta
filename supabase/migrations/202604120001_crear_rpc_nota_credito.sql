-- ==========================================
-- RPC: crear_nota_credito
-- Crea una Nota de Crédito (tipo_doc_codigo='07') que referencia un comprobante original.
-- Copia 1:1 los importes monetarios del comprobante original (para anulaciones totales).
-- Clona todas las líneas de comprobantes_detalles.
-- Consume el correlativo de configuracion_series según el tipo (FC01 para facturas, BC01 para boletas).
-- Actualiza el comprobante original a estado_sunat='anulada'.
-- TODO: Ajustar la lógica de series FC01/BC01 si la configuración en configuracion_series 
--       usa prefijos diferentes a los estándar SUNAT.
-- ==========================================

CREATE OR REPLACE FUNCTION crear_nota_credito(
  p_comprobante_id    uuid,
  p_motivo            text,
  p_tipo_nota_codigo  varchar(2) DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- Necesita acceder a las tablas del esquema public
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
  -- 1. Obtener el comprobante original con bloqueo FOR UPDATE para evitar race conditions
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

  IF v_original.estado_sunat = 'anulada' THEN
    RAISE EXCEPTION 'El comprobante ya se encuentra anulado';
  END IF;

  -- 3. Determinar la serie de la NC según el primer carácter de la serie original
  --    Fxxx → FC01 (Nota de Crédito de Factura)
  --    Bxxx → BC01 (Nota de Crédito de Boleta)
  v_serie_original := UPPER(v_original.serie);
  v_primer_caracter := SUBSTRING(v_serie_original FROM 1 FOR 1);

  IF v_primer_caracter = 'F' THEN
    v_serie_nc := 'FC01';
  ELSIF v_primer_caracter = 'B' THEN
    v_serie_nc := 'BC01';
  ELSE
    -- Fallback: si no empieza con F ni B, usar FC01 por defecto
    v_serie_nc := 'FC01';
  END IF;

  -- 4. Obtener y bloquear la configuración de serie para la NC
  --    tipo_doc_codigo = '07' para Notas de Crédito
  SELECT * INTO v_config_serie
  FROM configuracion_series
  WHERE tipo_doc_codigo = '07'
    AND serie = v_serie_nc
    AND activo = true
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Si no existe la configuración, crear una nueva con correlativo inicial 1
    INSERT INTO configuracion_series (tipo_doc_codigo, serie, correlativo_actual, activo)
    VALUES ('07', v_serie_nc, 1, true)
    ON CONFLICT (serie) DO UPDATE
      SET correlativo_actual = configuracion_series.correlativo_actual + 1
    RETURNING * INTO v_config_serie;
    
    v_correlativo_nc := 1;
  ELSE
    -- Incrementar correlativo
    v_correlativo_nc := v_config_serie.correlativo_actual + 1;
    UPDATE configuracion_series
    SET correlativo_actual = v_correlativo_nc
    WHERE id = v_config_serie.id;
  END IF;

  -- 5. Insertar la Nota de Crédito con los importes copiados del original
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
    -- Importes monetarios: se copian tal cual para anulación total
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
    -- Campos de detracción (copiados del original)
    detraccion_cod_bien,
    detraccion_cod_medio_pago,
    detraccion_porcentaje,
    detraccion_monto,
    detraccion_cuenta_bn
  ) VALUES (
    v_original.pedido_id,
    v_original.cliente_id,
    v_original.tipo_operacion,
    '07',  -- Código de Nota de Crédito
    v_serie_nc,
    v_correlativo_nc,
    v_serie_nc || '-' || LPAD(v_correlativo_nc::text, 8, '0'),
    p_comprobante_id,  -- Referencia al comprobante anulado
    p_motivo,
    p_tipo_nota_codigo,
    NOW(),
    v_original.fecha_vencimiento,
    v_original.tipo_moneda,
    v_original.forma_pago,
    -- Importes copiados del original
    v_original.mto_oper_gravadas,
    v_original.mto_oper_exoneradas,
    v_original.mto_oper_inafectas,
    v_original.mto_oper_gratuitas,
    v_original.mto_igv,
    v_original.mto_igv_gratuitas,
    v_original.icbper,
    v_original.mto_isc,
    v_original.total_impuestos,
    v_original.valor_venta,
    v_original.subtotal,
    v_original.mto_imp_venta,
    v_original.descuento_global_monto,
    v_original.descuento_global_codigo,
    v_original.leyendas,
    v_original.cod_establecimiento_anexo,
    'borrador',  -- La NC se crea en borrador, lista para enviar a SUNAT
    -- Detracción
    v_original.detraccion_cod_bien,
    v_original.detraccion_cod_medio_pago,
    v_original.detraccion_porcentaje,
    v_original.detraccion_monto,
    v_original.detraccion_cuenta_bn
  )
  RETURNING id INTO v_nc_id;

  -- 6. Copiar las líneas de detalle del comprobante original a la NC
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
    v_nc_id,  -- Nuevo comprobante (la NC)
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
  FROM comprobantes_detalles
  WHERE comprobante_id = p_comprobante_id;

  -- 7. Marcar el comprobante original como anulado
  UPDATE comprobantes
  SET estado_sunat = 'anulada'
  WHERE id = p_comprobante_id;

  -- 8. Retornar el UUID de la NC creada
  RETURN v_nc_id;

END;
$$;

-- ==========================================
-- Permisos: allow authenticated users to execute
-- ==========================================
GRANT EXECUTE ON FUNCTION crear_nota_credito(uuid, text, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION crear_nota_credito(uuid, text, varchar) TO anon;
