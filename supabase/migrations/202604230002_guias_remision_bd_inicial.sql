-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo de Guías de Remisión Electrónica — Fase 1
-- Tablas: cat_ubigeo, cat_motivo_traslado, guias_remision, guias_remision_lineas
-- Catalogos: cat_tipo_documento (09), configuracion_series (T001)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. cat_ubigeo ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_ubigeo (
  codigo        VARCHAR(6)   PRIMARY KEY,
  departamento  VARCHAR(100) NOT NULL,
  provincia     VARCHAR(100) NOT NULL,
  distrito      VARCHAR(100) NOT NULL,
  texto_busqueda TEXT GENERATED ALWAYS AS (
    departamento || ' ' || provincia || ' ' || distrito
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_ubigeo_fts ON cat_ubigeo
  USING gin(to_tsvector('spanish', texto_busqueda));

CREATE INDEX IF NOT EXISTS idx_ubigeo_departamento ON cat_ubigeo (departamento);
CREATE INDEX IF NOT EXISTS idx_ubigeo_provincia ON cat_ubigeo (departamento, provincia);

-- Vistas de apoyo para los selects en cascada
CREATE OR REPLACE VIEW cat_ubigeo_departamentos AS
  SELECT DISTINCT departamento
  FROM cat_ubigeo
  ORDER BY departamento;

CREATE OR REPLACE VIEW cat_ubigeo_provincias AS
  SELECT DISTINCT departamento, provincia
  FROM cat_ubigeo
  ORDER BY departamento, provincia;

-- ── 2. cat_motivo_traslado ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_motivo_traslado (
  codigo                      VARCHAR(2)   PRIMARY KEY,
  descripcion                 VARCHAR(100) NOT NULL,
  requiere_descripcion_libre  BOOLEAN      NOT NULL DEFAULT false,
  activo                      BOOLEAN      NOT NULL DEFAULT true
);

INSERT INTO cat_motivo_traslado (codigo, descripcion, requiere_descripcion_libre) VALUES
  ('01', 'Venta',                                                          false),
  ('02', 'Compra',                                                         false),
  ('04', 'Traslado entre establecimientos de la misma empresa',            false),
  ('05', 'Consignación',                                                   false),
  ('06', 'Devolución',                                                     false),
  ('07', 'Recojo de bienes transformados',                                 false),
  ('08', 'Importación',                                                    false),
  ('09', 'Exportación',                                                    false),
  ('13', 'Otros',                                                          true),
  ('14', 'Venta sujeta a confirmación del comprador',                      false),
  ('18', 'Traslado de bienes para transformación',                         false)
ON CONFLICT (codigo) DO NOTHING;

-- ── 3. guias_remision ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guias_remision (
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Numeración
  serie                        VARCHAR(4)    NOT NULL,
  correlativo                  INTEGER       NOT NULL,
  serie_numero                 VARCHAR(20)   NOT NULL,
  fecha_emision                DATE          NOT NULL,
  fecha_inicio_traslado        DATE          NOT NULL,
  observacion                  TEXT,

  -- Origen del traslado
  pedido_id                    UUID          REFERENCES pedidos(id),
  comprobante_id               UUID          REFERENCES comprobantes(id),
  nro_doc_relacionado          VARCHAR(20),
  tipo_doc_relacionado         VARCHAR(2),

  -- Destinatario
  cliente_id                   UUID          NOT NULL REFERENCES clientes(id),
  destinatario_tipo_doc        VARCHAR(2)    NOT NULL,
  destinatario_num_doc         VARCHAR(20)   NOT NULL,
  destinatario_razon_social    VARCHAR(200)  NOT NULL,

  -- Dirección de llegada
  dir_llegada_ubigueo          VARCHAR(6)    NOT NULL REFERENCES cat_ubigeo(codigo),
  dir_llegada_departamento     VARCHAR(100)  NOT NULL,
  dir_llegada_provincia        VARCHAR(100)  NOT NULL,
  dir_llegada_distrito         VARCHAR(100)  NOT NULL,
  dir_llegada_direccion        TEXT          NOT NULL,

  -- Dirección de partida
  dir_partida_ubigueo          VARCHAR(6)    NOT NULL REFERENCES cat_ubigeo(codigo),
  dir_partida_departamento     VARCHAR(100)  NOT NULL,
  dir_partida_provincia        VARCHAR(100)  NOT NULL,
  dir_partida_distrito         VARCHAR(100)  NOT NULL,
  dir_partida_direccion        TEXT          NOT NULL,

  -- Datos del envío
  motivo_traslado_codigo       VARCHAR(2)    NOT NULL REFERENCES cat_motivo_traslado(codigo),
  motivo_traslado_desc         TEXT,
  modalidad_traslado           VARCHAR(2)    NOT NULL CHECK (modalidad_traslado IN ('01', '02')),
  peso_bruto_total             NUMERIC(10,3) NOT NULL,
  unidad_peso                  VARCHAR(5)    NOT NULL DEFAULT 'KGM',
  numero_bultos                INTEGER,
  numero_contenedor            VARCHAR(50),

  -- Transportista (modalidad 01 — transporte público)
  transportista_tipo_doc       VARCHAR(2),
  transportista_num_doc        VARCHAR(20),
  transportista_razon_social   VARCHAR(200),
  transportista_placa          VARCHAR(10),
  conductor_tipo_doc           VARCHAR(2),
  conductor_num_doc            VARCHAR(12),

  -- Vehículo propio (modalidad 02 — transporte privado)
  vehiculo_propio_placa        VARCHAR(10),
  vehiculo_propio_conductor_doc VARCHAR(12),

  -- Estado SUNAT
  estado_sunat                 VARCHAR(50)   NOT NULL DEFAULT 'borrador',
  enlace_pdf                   TEXT,
  enlace_xml                   TEXT,
  enlace_cdr                   TEXT,
  apisperu_response            JSONB,

  -- Auditoría
  creado_por                   UUID          REFERENCES perfiles_usuario(id),
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT uq_guia_serie_correlativo UNIQUE (serie, correlativo),
  CONSTRAINT uq_guia_serie_numero      UNIQUE (serie_numero)
);

CREATE INDEX IF NOT EXISTS idx_guias_remision_cliente    ON guias_remision (cliente_id);
CREATE INDEX IF NOT EXISTS idx_guias_remision_pedido     ON guias_remision (pedido_id) WHERE pedido_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guias_remision_estado     ON guias_remision (estado_sunat);
CREATE INDEX IF NOT EXISTS idx_guias_remision_fecha      ON guias_remision (fecha_emision DESC);

-- ── 4. guias_remision_lineas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guias_remision_lineas (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  guia_id          UUID           NOT NULL REFERENCES guias_remision(id) ON DELETE CASCADE,
  orden            INTEGER        NOT NULL,
  pedido_linea_id  UUID           REFERENCES pedidos_lineas(id),
  producto_id      UUID           REFERENCES productos(id),
  descripcion      VARCHAR(500)   NOT NULL,
  unidad_codigo    VARCHAR(10)    NOT NULL DEFAULT 'NIU',
  cantidad         NUMERIC(12,3)  NOT NULL,
  codigo_producto  VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_guias_lineas_guia ON guias_remision_lineas (guia_id);

-- ── 5. Catalogos — nuevos registros ─────────────────────────────────────────
INSERT INTO cat_tipo_documento (codigo, descripcion, categoria)
VALUES ('09', 'Guía de Remisión Remitente', 'guia')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO configuracion_series (tipo_doc_codigo, serie, correlativo_actual)
VALUES ('09', 'T001', 0)
ON CONFLICT DO NOTHING;

-- ── 6. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE cat_ubigeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_motivo_traslado ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias_remision      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias_remision_lineas ENABLE ROW LEVEL SECURITY;

-- cat_ubigeo y cat_motivo_traslado son catálogos de solo lectura para usuarios autenticados
CREATE POLICY "cat_ubigeo_select" ON cat_ubigeo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_motivo_traslado_select" ON cat_motivo_traslado
  FOR SELECT TO authenticated USING (true);

-- guias_remision — lectura y escritura para autenticados (admin gestiona via service role)
CREATE POLICY "guias_remision_select" ON guias_remision
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "guias_remision_insert" ON guias_remision
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "guias_remision_update" ON guias_remision
  FOR UPDATE TO authenticated USING (true);

-- guias_remision_lineas — acceso completo para autenticados
CREATE POLICY "guias_remision_lineas_select" ON guias_remision_lineas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "guias_remision_lineas_insert" ON guias_remision_lineas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "guias_remision_lineas_update" ON guias_remision_lineas
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "guias_remision_lineas_delete" ON guias_remision_lineas
  FOR DELETE TO authenticated USING (true);
