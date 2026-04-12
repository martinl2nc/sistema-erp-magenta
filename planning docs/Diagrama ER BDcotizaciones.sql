-- ==========================================
-- CATALOG TABLES (SUNAT & SYSTEM)
-- ==========================================

CREATE TABLE "cat_tipo_documento" (
  "codigo" varchar(2) PRIMARY KEY,
  "descripcion" varchar(255) NOT NULL,
  "categoria" varchar(50) NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_unidades_medida" (
  "codigo" varchar(5) PRIMARY KEY,
  "descripcion" varchar(100) NOT NULL
);

CREATE TABLE "cat_tipo_afectacion_igv" (
  "codigo" varchar(2) PRIMARY KEY,
  "descripcion" varchar(255) NOT NULL,
  "tipo" varchar(50)
);

CREATE TABLE "cat_tipo_nota_credito" (
  "codigo" varchar(2) PRIMARY KEY,
  "descripcion" varchar(255) NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_tipo_nota_debito" (
  "codigo" varchar(2) PRIMARY KEY,
  "descripcion" varchar(255) NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_tipo_sistema_isc" (
  "codigo" varchar(2) PRIMARY KEY,
  "descripcion" varchar(255) NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_tipo_operacion" (
  "codigo" varchar(4) PRIMARY KEY,
  "descripcion" text NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_bien_servicio_detraccion" (
  "codigo" varchar(4) PRIMARY KEY,
  "descripcion" text NOT NULL,
  "activo" boolean DEFAULT true
);

CREATE TABLE "cat_cargos_descuentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo" varchar UNIQUE NOT NULL,
  "descripcion" text NOT NULL,
  "tipo" text CHECK (tipo IN ('cargo', 'descuento')),
  "active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

-- ==========================================
-- CONFIGURATION TABLES
-- ==========================================

CREATE TABLE "empresa_configuracion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "razon_social" varchar NOT NULL,
  "ruc" varchar NOT NULL,
  "nombre_comercial" varchar,
  "direccion" text,
  "ubigueo" varchar DEFAULT '150101',
  "cod_establecimiento_anexo" varchar DEFAULT '0000',
  "cuentas_bancarias" text,
  "terminos_condiciones" text,
  "logo_url" text,
  "detraccion_cuenta_bn" varchar
);

CREATE TABLE "configuracion_empresa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ruc" varchar NOT NULL,
  "razon_social" varchar NOT NULL,
  "nombre_comercial" varchar,
  "direccion" text,
  "ubigueo" varchar DEFAULT '150101',
  "departamento" varchar,
  "provincia" varchar,
  "distrito" varchar,
  "cod_establecimiento" varchar DEFAULT '0000',
  "apisperu_token" text,
  "apisperu_environment" varchar DEFAULT 'beta' CHECK (apisperu_environment IN ('beta', 'produccion')),
  "sol_user" text,
  "sol_pass" text,
  "certificado_pem" text,
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "configuracion_series" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tipo_doc_codigo" varchar(2),
  "serie" varchar(4) UNIQUE NOT NULL,
  "correlativo_actual" integer NOT NULL DEFAULT 0,
  "prefijo_esperado" varchar,
  "activo" boolean DEFAULT true,
  "fecha_creacion" timestamp with time zone DEFAULT now()
);

-- ==========================================
-- CORE ENTITIES
-- ==========================================

CREATE TABLE "perfiles_usuario" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL,
  "nombre" text NOT NULL,
  "rol" text DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor')),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "categorias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar NOT NULL
);

CREATE TABLE "productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "woo_product_id" bigint UNIQUE,
  "sku" varchar UNIQUE,
  "nombre" varchar NOT NULL,
  "descripcion" text,
  "categoria_id" uuid,
  "precio_base" numeric(10,2) NOT NULL DEFAULT 0,
  "activo" boolean DEFAULT true,
  "unidad_medida" varchar(5) NOT NULL DEFAULT 'NIU',
  "afectacion_igv" varchar(2) NOT NULL DEFAULT '10',
  "fraccionable" boolean DEFAULT false,
  "cod_prod_sunat" varchar,
  "cod_prod_gs1" varchar,
  "fecha_creacion" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE "clientes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tipo_documento" varchar DEFAULT 'RUC',
  "numero_documento" varchar UNIQUE,
  "razon_social" varchar,
  "nombres_contacto" varchar NOT NULL,
  "apellidos_contacto" varchar NOT NULL,
  "email" varchar NOT NULL UNIQUE,
  "telefono" varchar,
  "direccion" text,
  "ubigueo" varchar DEFAULT '150101',
  "comprobante_preferido" varchar DEFAULT 'Factura',
  "activo" boolean DEFAULT true,
  "fecha_creacion" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- TRANSACTIONAL: QUOTES & ORDERS
-- ==========================================

CREATE TABLE "cotizaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "numero_correlativo" bigint GENERATED BY DEFAULT AS IDENTITY,
  "origen" varchar DEFAULT 'Manual',
  "woo_order_id" bigint UNIQUE,
  "cliente_id" uuid NOT NULL,
  "vendedor_id" uuid,
  "fecha_emision" date DEFAULT CURRENT_DATE,
  "fecha_validez" date DEFAULT (CURRENT_DATE + 15),
  "estado" varchar DEFAULT 'Por Revisar',
  "observaciones_pdf" text,
  "aplica_igv" boolean DEFAULT true,
  "subtotal" numeric(10,2) DEFAULT 0,
  "descuento_global_monto" numeric(10,2) DEFAULT 0,
  "igv_monto" numeric(10,2) DEFAULT 0,
  "total_final" numeric(10,2) DEFAULT 0,
  "seguimiento_automatico" boolean DEFAULT true,
  "fecha_creacion" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "ultima_actualizacion" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE "cotizaciones_lineas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cotizacion_id" uuid NOT NULL,
  "producto_id" uuid,
  "nombre_producto_historico" varchar NOT NULL,
  "cantidad" integer NOT NULL DEFAULT 1,
  "precio_unitario" numeric(10,2) NOT NULL DEFAULT 0,
  "descuento_linea_monto" numeric(10,2) DEFAULT 0,
  "subtotal_linea" numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE "cotizacion_envios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cotizacion_id" uuid NOT NULL,
  "enviado_a_email" text NOT NULL,
  "fecha_envio" timestamp with time zone DEFAULT now()
);

CREATE TABLE "pedidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cotizacion_id" uuid UNIQUE,
  "cliente_id" uuid NOT NULL,
  "vendedor_id" uuid,
  "numero_pedido" bigint DEFAULT nextval('pedidos_numero_seq'),
  "nro_oc_cliente" varchar,
  "sustento_url" text NOT NULL,
  "sustento_nombre" varchar,
  "observaciones" text,
  "direccion_facturacion" text,
  "fecha_pedido" date,
  "aplica_igv" boolean DEFAULT true,
  "subtotal" numeric(10,2) DEFAULT 0,
  "descuento_global_monto" numeric(10,2) DEFAULT 0,
  "descuento_global_codigo" text,
  "igv_monto" numeric(10,2) DEFAULT 0,
  "total_final" numeric(10,2) DEFAULT 0,
  "estado" varchar DEFAULT 'pendiente_facturacion' CHECK (estado IN ('pendiente_facturacion', 'procesando_facturacion', 'facturado', 'error_facturacion', 'anulado')),
  "fecha_creacion" timestamp with time zone DEFAULT now(),
  "ultima_actualizacion" timestamp with time zone DEFAULT now()
);

CREATE TABLE "pedidos_lineas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pedido_id" uuid NOT NULL,
  "producto_id" uuid,
  "nombre_producto_historico" varchar NOT NULL,
  "cantidad" numeric(10,2) NOT NULL,
  "precio_unitario" numeric(10,2) NOT NULL,
  "descuento_linea_monto" numeric(10,2) DEFAULT 0,
  "subtotal_linea" numeric(10,2) NOT NULL
);

-- ==========================================
-- TRANSACTIONAL: BILLING (COMPROBANTES)
-- ==========================================

CREATE TABLE "comprobantes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pedido_id" uuid NOT NULL,
  "cliente_id" uuid NOT NULL,
  "tipo_operacion" varchar(4) DEFAULT '0101',
  "tipo_doc_codigo" varchar(2) NOT NULL,
  "serie" varchar(4) NOT NULL,
  "correlativo" integer NOT NULL,
  "serie_numero" varchar UNIQUE NOT NULL,
  "comprobante_referencia_id" uuid,
  "motivo_nota" text,
  "tipo_nota_codigo" varchar(2),
  "tipo_nota_debito_codigo" varchar(2),
  "fecha_emision" timestamp with time zone DEFAULT now(),
  "fecha_vencimiento" timestamp with time zone,
  "tipo_moneda" varchar(3) DEFAULT 'PEN',
  "forma_pago" varchar(50) DEFAULT 'Contado',
  "mto_oper_gravadas" numeric(10,2) DEFAULT 0,
  "mto_oper_exoneradas" numeric(10,2) DEFAULT 0,
  "mto_oper_inafectas" numeric(10,2) DEFAULT 0,
  "mto_oper_gratuitas" numeric(10,2) DEFAULT 0,
  "mto_igv" numeric(10,2) DEFAULT 0,
  "mto_igv_gratuitas" numeric(10,2) DEFAULT 0,
  "icbper" numeric(10,2),
  "mto_isc" numeric(10,2),
  "total_impuestos" numeric(10,2) DEFAULT 0,
  "valor_venta" numeric(10,2) DEFAULT 0,
  "subtotal" numeric(10,2) DEFAULT 0,
  "mto_imp_venta" numeric(10,2) DEFAULT 0,
  "descuento_global_monto" numeric(10,2) DEFAULT 0,
  "descuento_global_codigo" text,
  "leyendas" jsonb,
  "cod_establecimiento_anexo" varchar DEFAULT '0000',
  "enlace_pdf" text,
  "enlace_xml" text,
  "enlace_cdr" text,
  "apisperu_response" jsonb,
  "estado_sunat" varchar DEFAULT 'borrador',
  "detraccion_cod_bien" varchar,
  "detraccion_cod_medio_pago" varchar,
  "detraccion_porcentaje" numeric(10,2),
  "detraccion_monto" numeric(10,2),
  "detraccion_cuenta_bn" varchar
);

CREATE TABLE "comprobantes_detalles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "comprobante_id" uuid NOT NULL,
  "producto_id" uuid,
  "cod_producto" varchar,
  "cod_prod_sunat" varchar,
  "cod_prod_gs1" varchar,
  "unidad_codigo" varchar(5) DEFAULT 'NIU',
  "descripcion" varchar NOT NULL,
  "cantidad" numeric(10,2) NOT NULL,
  "mto_valor_unitario" numeric(10,4) NOT NULL,
  "mto_valor_gratuito" numeric(10,4) DEFAULT 0,
  "mto_precio_unitario" numeric(10,4) NOT NULL,
  "mto_valor_venta" numeric(10,2) NOT NULL,
  "mto_base_igv" numeric(10,2) NOT NULL,
  "porcentaje_igv" numeric(5,2) DEFAULT 18,
  "igv" numeric(10,2) NOT NULL,
  "tip_afe_igv_codigo" varchar(2) DEFAULT '10',
  "descuento" numeric(10,2),
  "tipo_sis_isc_codigo" varchar(2),
  "mto_base_isc" numeric(10,2),
  "porcentaje_isc" numeric(10,2),
  "isc" numeric(10,2),
  "factor_icbper" numeric(10,2),
  "icbper" numeric(10,2),
  "total_impuestos" numeric(10,2) NOT NULL
);

CREATE TABLE "comprobantes_cuotas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "comprobante_id" uuid NOT NULL,
  "numero_cuota" smallint DEFAULT 1,
  "moneda" varchar DEFAULT 'PEN',
  "monto" numeric NOT NULL,
  "fecha_pago" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- ==========================================
-- SUNAT: BAJAS & RESUMENES
-- ==========================================

CREATE TABLE "comunicacion_baja" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "correlativo" varchar NOT NULL,
  "fec_generacion" date NOT NULL,
  "fec_comunicacion" date DEFAULT CURRENT_DATE,
  "ticket" varchar,
  "estado" varchar DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'aceptada_sunat', 'rechazada_sunat', 'error')),
  "apisperu_response" jsonb,
  "enlace_xml" text,
  "enlace_cdr" text,
  "sunat_ticket_response" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "comunicacion_baja_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "comunicacion_baja_id" uuid NOT NULL,
  "comprobante_id" uuid NOT NULL,
  "tipo_doc" varchar NOT NULL,
  "serie" varchar NOT NULL,
  "correlativo_str" varchar NOT NULL,
  "des_motivo_baja" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "resumen_boletas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "correlativo" varchar NOT NULL,
  "fec_generacion" date DEFAULT CURRENT_DATE,
  "fec_resumen" date NOT NULL,
  "moneda" varchar DEFAULT 'PEN',
  "ticket" varchar,
  "estado" varchar DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'aceptada_sunat', 'rechazada_sunat', 'error')),
  "apisperu_response" jsonb,
  "enlace_xml" text,
  "enlace_cdr" text,
  "sunat_ticket_response" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "resumen_boletas_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "resumen_id" uuid NOT NULL,
  "comprobante_id" uuid NOT NULL,
  "tipo_doc" varchar NOT NULL,
  "serie_nro" varchar NOT NULL,
  "estado" varchar DEFAULT '1' CHECK (estado IN ('1', '2', '3')),
  "cliente_tipo_doc" varchar DEFAULT '1',
  "cliente_nro_doc" varchar DEFAULT '00000000',
  "total" numeric DEFAULT 0,
  "mto_oper_gravadas" numeric DEFAULT 0,
  "mto_oper_exoneradas" numeric DEFAULT 0,
  "mto_oper_inafectas" numeric DEFAULT 0,
  "mto_igv" numeric DEFAULT 0,
  "mto_isc" numeric,
  "mto_icbper" numeric,
  "doc_referencia_tipo" varchar,
  "doc_referencia_nro" varchar,
  "created_at" timestamp with time zone DEFAULT now()
);

-- ==========================================
-- LOGGING & SYSTEM
-- ==========================================

CREATE TABLE "apisperu_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "comprobante_id" uuid,
  "endpoint" varchar NOT NULL,
  "http_method" varchar DEFAULT 'POST',
  "request_payload" jsonb,
  "response_status" smallint,
  "response_body" jsonb,
  "error_message" text,
  "duration_ms" integer,
  "emisor_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

-- ==========================================
-- RELATIONSHIPS (FOREIGN KEYS)
-- ==========================================

ALTER TABLE "productos" ADD FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id");
ALTER TABLE "productos" ADD FOREIGN KEY ("unidad_medida") REFERENCES "cat_unidades_medida" ("codigo");
ALTER TABLE "productos" ADD FOREIGN KEY ("afectacion_igv") REFERENCES "cat_tipo_afectacion_igv" ("codigo");

ALTER TABLE "cotizaciones" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id");
ALTER TABLE "cotizaciones" ADD FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_usuario" ("id");

ALTER TABLE "cotizaciones_lineas" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") ON DELETE CASCADE;
ALTER TABLE "cotizaciones_lineas" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id");

ALTER TABLE "cotizacion_envios" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") ON DELETE CASCADE;

ALTER TABLE "pedidos" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id");
ALTER TABLE "pedidos" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id");
ALTER TABLE "pedidos" ADD FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_usuario" ("id");

ALTER TABLE "pedidos_lineas" ADD FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE CASCADE;
ALTER TABLE "pedidos_lineas" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id");

ALTER TABLE "comprobantes" ADD FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("tipo_doc_codigo") REFERENCES "cat_tipo_documento" ("codigo");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("comprobante_referencia_id") REFERENCES "comprobantes" ("id");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("tipo_nota_codigo") REFERENCES "cat_tipo_nota_credito" ("codigo");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("tipo_nota_debito_codigo") REFERENCES "cat_tipo_nota_debito" ("codigo");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("detraccion_cod_bien") REFERENCES "cat_bien_servicio_detraccion" ("codigo");
ALTER TABLE "comprobantes" ADD FOREIGN KEY ("descuento_global_codigo") REFERENCES "cat_cargos_descuentos" ("codigo");

ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id") ON DELETE CASCADE;
ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id");
ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("unidad_codigo") REFERENCES "cat_unidades_medida" ("codigo");
ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("tip_afe_igv_codigo") REFERENCES "cat_tipo_afectacion_igv" ("codigo");
ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("tipo_sis_isc_codigo") REFERENCES "cat_tipo_sistema_isc" ("codigo");

ALTER TABLE "comprobantes_cuotas" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id") ON DELETE CASCADE;

ALTER TABLE "comunicacion_baja_items" ADD FOREIGN KEY ("comunicacion_baja_id") REFERENCES "comunicacion_baja" ("id") ON DELETE CASCADE;
ALTER TABLE "comunicacion_baja_items" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id");

ALTER TABLE "resumen_boletas_items" ADD FOREIGN KEY ("resumen_id") REFERENCES "resumen_boletas" ("id") ON DELETE CASCADE;
ALTER TABLE "resumen_boletas_items" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id");

ALTER TABLE "apisperu_logs" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id");
ALTER TABLE "apisperu_logs" ADD FOREIGN KEY ("emisor_user_id") REFERENCES "perfiles_usuario" ("id");

ALTER TABLE "configuracion_series" ADD FOREIGN KEY ("tipo_doc_codigo") REFERENCES "cat_tipo_documento" ("codigo");
