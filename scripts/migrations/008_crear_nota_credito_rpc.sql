-- ============================================================
-- MIGRATION 008: RPC atómica para crear nota de crédito
-- Reemplaza el INSERT + UPDATE no atómico en facturas.service.ts
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_nota_credito(
  p_comprobante_id     UUID,
  p_motivo             TEXT,
  p_tipo_nota_codigo   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nota_id    UUID;
  v_pedido_id  UUID;
  v_cliente_id UUID;
BEGIN
  SELECT pedido_id, cliente_id
  INTO   v_pedido_id, v_cliente_id
  FROM   comprobantes
  WHERE  id = p_comprobante_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprobante % no encontrado', p_comprobante_id;
  END IF;

  INSERT INTO comprobantes (
    pedido_id, cliente_id,
    tipo_doc_codigo, serie, correlativo, serie_numero,
    comprobante_referencia_id, motivo_nota, tipo_nota_codigo,
    estado_sunat
  ) VALUES (
    v_pedido_id, v_cliente_id,
    '07', 'NC01', 0, 'NC-PENDIENTE',
    p_comprobante_id, p_motivo, p_tipo_nota_codigo,
    'borrador'
  ) RETURNING id INTO v_nota_id;

  UPDATE comprobantes
  SET    estado_sunat = 'anulada'
  WHERE  id = p_comprobante_id;

  RETURN v_nota_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_nota_credito TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_nota_credito TO service_role;
