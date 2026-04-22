-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: RPC para Editar Comprobante de Compra Completo
-- Permite modificar toda la cabecera y reemplazar los detalles SI Y SOLO SI
-- el estado_pago es 'pendiente'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION editar_comprobante_compra_completo(
  p_id                     uuid,
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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estado_pago text;
  v_detalle     jsonb;
BEGIN
  -- Verificar el estado de pago
  SELECT estado_pago INTO v_estado_pago
  FROM comprobantes_compra
  WHERE id = p_id;

  IF v_estado_pago != 'pendiente' THEN
    RAISE EXCEPTION 'No se puede editar completamente un comprobante que ya tiene pagos asociados o está pagado.';
  END IF;

  -- Actualizar cabecera
  UPDATE comprobantes_compra
  SET
    proveedor_id           = p_proveedor_id,
    categoria_gasto_id     = p_categoria_gasto_id,
    tipo_doc_codigo        = p_tipo_doc_codigo,
    serie                  = p_serie,
    correlativo            = p_correlativo,
    fecha_emision          = p_fecha_emision,
    fecha_vencimiento      = p_fecha_vencimiento,
    moneda                 = p_moneda,
    tipo_cambio            = p_tipo_cambio,
    forma_pago             = p_forma_pago,
    mto_oper_gravadas      = p_mto_oper_gravadas,
    mto_oper_exoneradas    = p_mto_oper_exoneradas,
    mto_oper_inafectas     = p_mto_oper_inafectas,
    mto_igv                = p_mto_igv,
    mto_isc                = p_mto_isc,
    icbper                 = p_icbper,
    total_impuestos        = p_total_impuestos,
    valor_venta            = p_valor_venta,
    subtotal               = p_subtotal,
    mto_imp_venta          = p_mto_imp_venta,
    descuento_global_monto = p_descuento_global_monto,
    detraccion_cod_bien    = p_detraccion_cod_bien,
    detraccion_porcentaje  = p_detraccion_porcentaje,
    detraccion_monto       = p_detraccion_monto,
    archivo_xml_url        = COALESCE(p_archivo_xml_url, archivo_xml_url),
    archivo_pdf_url        = COALESCE(p_archivo_pdf_url, archivo_pdf_url),
    notas                  = p_notas,
    saldo_pendiente        = p_mto_imp_venta
  WHERE id = p_id;

  -- Eliminar detalles anteriores
  DELETE FROM comprobantes_compras_detalles
  WHERE comprobante_compra_id = p_id;

  -- Insertar nuevos detalles
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
      p_id,
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

END;
$$;
