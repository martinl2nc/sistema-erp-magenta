-- Nota de Venta: comprobante interno (no viaja a SUNAT)
INSERT INTO cat_tipo_documento (codigo, descripcion, categoria)
VALUES ('80', 'Nota de Venta', 'comprobante')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO configuracion_series (tipo_doc_codigo, serie, correlativo_actual, activo)
VALUES ('80', 'NV01', 0, true)
ON CONFLICT DO NOTHING;
