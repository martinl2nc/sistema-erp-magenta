-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo de Compras — Reporte de Antigüedad de Deuda por Proveedor
-- RPCs: get_aging_report_compras, get_aging_detalle_compras
-- ─────────────────────────────────────────────────────────────────────────────

-- ── get_aging_report_compras ─────────────────────────────────────────────────
-- Agrupa comprobantes_compra pendientes por proveedor y calcula buckets de
-- antigüedad idénticos a get_aging_report (cobros).

CREATE OR REPLACE FUNCTION get_aging_report_compras()
RETURNS TABLE (
  proveedor_id       uuid,
  razon_social       text,
  nombres_contacto   text,
  apellidos_contacto text,
  deuda_total        numeric,
  por_vencer         numeric,
  vencido_1_30       numeric,
  vencido_31_60      numeric,
  vencido_61_90      numeric,
  vencido_mas_90     numeric,
  count_comprobantes bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cc.proveedor_id,
    p.razon_social,
    p.nombres_contacto,
    p.apellidos_contacto,
    SUM(cc.saldo_pendiente) AS deuda_total,
    SUM(CASE
      WHEN cc.fecha_vencimiento IS NULL OR cc.fecha_vencimiento >= CURRENT_DATE
      THEN cc.saldo_pendiente ELSE 0
    END) AS por_vencer,
    SUM(CASE
      WHEN cc.fecha_vencimiento IS NOT NULL
       AND CURRENT_DATE - cc.fecha_vencimiento BETWEEN 1 AND 30
      THEN cc.saldo_pendiente ELSE 0
    END) AS vencido_1_30,
    SUM(CASE
      WHEN cc.fecha_vencimiento IS NOT NULL
       AND CURRENT_DATE - cc.fecha_vencimiento BETWEEN 31 AND 60
      THEN cc.saldo_pendiente ELSE 0
    END) AS vencido_31_60,
    SUM(CASE
      WHEN cc.fecha_vencimiento IS NOT NULL
       AND CURRENT_DATE - cc.fecha_vencimiento BETWEEN 61 AND 90
      THEN cc.saldo_pendiente ELSE 0
    END) AS vencido_61_90,
    SUM(CASE
      WHEN cc.fecha_vencimiento IS NOT NULL
       AND CURRENT_DATE - cc.fecha_vencimiento > 90
      THEN cc.saldo_pendiente ELSE 0
    END) AS vencido_mas_90,
    COUNT(*) AS count_comprobantes
  FROM comprobantes_compra cc
  JOIN proveedores p ON p.id = cc.proveedor_id
  WHERE cc.saldo_pendiente > 0
    AND cc.estado_pago IN ('pendiente', 'parcial')
  GROUP BY cc.proveedor_id, p.razon_social, p.nombres_contacto, p.apellidos_contacto
  ORDER BY deuda_total DESC;
$$;

-- ── get_aging_detalle_compras ────────────────────────────────────────────────
-- Retorna los comprobantes individuales de un proveedor con su bucket calculado.

CREATE OR REPLACE FUNCTION get_aging_detalle_compras(p_proveedor_id uuid)
RETURNS TABLE (
  comprobante_id    uuid,
  serie_numero      text,
  fecha_emision     date,
  fecha_vencimiento date,
  forma_pago        text,
  total_facturado   numeric,
  saldo_pendiente   numeric,
  dias_vencido      integer,
  bucket            text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cc.id                                                     AS comprobante_id,
    cc.serie_numero,
    cc.fecha_emision,
    cc.fecha_vencimiento,
    cc.forma_pago,
    cc.mto_imp_venta                                          AS total_facturado,
    cc.saldo_pendiente,
    CASE
      WHEN cc.fecha_vencimiento IS NULL THEN 0
      ELSE (CURRENT_DATE - cc.fecha_vencimiento)::integer
    END                                                       AS dias_vencido,
    CASE
      WHEN cc.fecha_vencimiento IS NULL OR cc.fecha_vencimiento >= CURRENT_DATE
        THEN 'por_vencer'
      WHEN CURRENT_DATE - cc.fecha_vencimiento BETWEEN 1 AND 30
        THEN 'vencido_1_30'
      WHEN CURRENT_DATE - cc.fecha_vencimiento BETWEEN 31 AND 60
        THEN 'vencido_31_60'
      WHEN CURRENT_DATE - cc.fecha_vencimiento BETWEEN 61 AND 90
        THEN 'vencido_61_90'
      ELSE 'vencido_mas_90'
    END                                                       AS bucket
  FROM comprobantes_compra cc
  WHERE cc.proveedor_id = p_proveedor_id
    AND cc.saldo_pendiente > 0
    AND cc.estado_pago IN ('pendiente', 'parcial')
  ORDER BY cc.fecha_vencimiento ASC NULLS LAST;
$$;
