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

CREATE TABLE "empresa_configuracion" (
  "id" uuid PRIMARY KEY,
  "razon_social" varchar NOT NULL,
  "ruc" varchar NOT NULL,
  "direccion" text,
  "cuentas_bancarias" text,
  "terminos_condiciones" text,
  "logo_url" text
);

CREATE TABLE "perfiles_usuario" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL,
  "nombre" text NOT NULL,
  "rol" text DEFAULT 'vendedor',
  "activo" boolean DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "categorias" (
  "id" uuid PRIMARY KEY,
  "nombre" varchar NOT NULL
);

CREATE TABLE "productos" (
  "id" uuid PRIMARY KEY,
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
  "fecha_creacion" timestamp
);

CREATE TABLE "clientes" (
  "id" uuid PRIMARY KEY,
  "tipo_documento" varchar DEFAULT 'RUC',
  "numero_documento" varchar UNIQUE,
  "razon_social" varchar,
  "nombres_contacto" varchar NOT NULL,
  "apellidos_contacto" varchar NOT NULL,
  "email" varchar NOT NULL,
  "telefono" varchar,
  "direccion" text,
  "ubigueo" varchar DEFAULT '150101',
  "comprobante_preferido" varchar DEFAULT 'Factura',
  "activo" boolean DEFAULT true,
  "fecha_creacion" timestamp
);

CREATE TABLE "cotizaciones" (
  "id" uuid PRIMARY KEY,
  "numero_correlativo" bigint,
  "origen" varchar DEFAULT 'Manual',
  "woo_order_id" bigint UNIQUE,
  "cliente_id" uuid NOT NULL,
  "vendedor_id" uuid,
  "fecha_emision" date,
  "fecha_validez" date,
  "estado" varchar DEFAULT 'Por Revisar',
  "observaciones_pdf" text,
  "aplica_igv" boolean DEFAULT true,
  "subtotal" numeric(10,2),
  "descuento_global_monto" numeric(10,2),
  "igv_monto" numeric(10,2),
  "total_final" numeric(10,2),
  "seguimiento_automatico" boolean DEFAULT true,
  "fecha_creacion" timestamp,
  "ultima_actualizacion" timestamp
);

CREATE TABLE "cotizaciones_lineas" (
  "id" uuid PRIMARY KEY,
  "cotizacion_id" uuid NOT NULL,
  "producto_id" uuid,
  "nombre_producto_historico" varchar NOT NULL,
  "cantidad" integer NOT NULL DEFAULT 1,
  "precio_unitario" numeric(10,2) NOT NULL,
  "descuento_linea_monto" numeric(10,2),
  "subtotal_linea" numeric(10,2) NOT NULL
);

CREATE TABLE "cotizacion_envios" (
  "id" uuid PRIMARY KEY,
  "cotizacion_id" uuid NOT NULL,
  "enviado_a_email" text NOT NULL,
  "fecha_envio" timestamp
);

CREATE TABLE "pedidos" (
  "id" uuid PRIMARY KEY,
  "cotizacion_id" uuid UNIQUE,
  "cliente_id" uuid NOT NULL,
  "vendedor_id" uuid,
  "numero_pedido" integer NOT NULL DEFAULT nextval('pedidos_numero_seq'),
  "nro_oc_cliente" varchar,
  "sustento_url" text NOT NULL,
  "sustento_nombre" varchar,
  "observaciones" text,
  "direccion_facturacion" text,
  "fecha_pedido" date,
  "aplica_igv" boolean DEFAULT true,
  "subtotal" numeric(10,2) DEFAULT 0,
  "descuento_global_monto" numeric(10,2) DEFAULT 0,
  "igv_monto" numeric(10,2) DEFAULT 0,
  "total_final" numeric(10,2) DEFAULT 0,
  "estado" varchar DEFAULT 'pendiente_facturacion',
  "fecha_creacion" timestamp,
  "ultima_actualizacion" timestamp
);

CREATE TABLE "pedidos_lineas" (
  "id" uuid PRIMARY KEY,
  "pedido_id" uuid NOT NULL,
  "producto_id" uuid,
  "nombre_producto_historico" varchar NOT NULL,
  "cantidad" numeric(10,2) NOT NULL DEFAULT 1,
  "precio_unitario" numeric(10,2) NOT NULL,
  "descuento_linea_monto" numeric(10,2),
  "subtotal_linea" numeric(10,2) NOT NULL
);

CREATE TABLE "comprobantes" (
  "id" uuid PRIMARY KEY,
  "pedido_id" uuid NOT NULL,
  "cliente_id" uuid NOT NULL,
  "tipo_operacion" varchar(4) DEFAULT '0101',
  "tipo_doc_codigo" varchar(2) NOT NULL,
  "serie" varchar(4) NOT NULL,
  "correlativo" integer NOT NULL,
  "serie_numero" varchar NOT NULL,
  "comprobante_referencia_id" uuid,
  "motivo_nota" text,
  "fecha_emision" timestamp,
  "fecha_vencimiento" timestamp,
  "tipo_moneda" varchar(3) DEFAULT 'PEN',
  "forma_pago" varchar(50) DEFAULT 'Contado',
  "mto_oper_gravadas" numeric(10,2) DEFAULT 0,
  "mto_oper_exoneradas" numeric(10,2) DEFAULT 0,
  "mto_oper_inafectas" numeric(10,2) DEFAULT 0,
  "mto_oper_gratuitas" numeric(10,2) DEFAULT 0,
  "mto_igv" numeric(10,2) DEFAULT 0,
  "mto_igv_gratuitas" numeric(10,2) DEFAULT 0,
  "total_impuestos" numeric(10,2) DEFAULT 0,
  "valor_venta" numeric(10,2) DEFAULT 0,
  "subtotal" numeric(10,2) DEFAULT 0,
  "mto_imp_venta" numeric(10,2) DEFAULT 0,
  "leyendas" jsonb,
  "enlace_pdf" text,
  "enlace_xml" text,
  "enlace_cdr" text,
  "apisperu_response" jsonb,
  "estado_sunat" varchar DEFAULT 'borrador'
);

CREATE TABLE "comprobantes_detalles" (
  "id" uuid PRIMARY KEY,
  "comprobante_id" uuid NOT NULL,
  "producto_id" uuid,
  "cod_producto" varchar,
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
  "total_impuestos" numeric(10,2) NOT NULL
);

CREATE TABLE "configuracion_series" (
  "id" uuid PRIMARY KEY,
  "tipo_doc_codigo" varchar(2),
  "serie" varchar(4) UNIQUE NOT NULL,
  "correlativo_actual" integer NOT NULL DEFAULT 0,
  "activo" boolean DEFAULT true
);

ALTER TABLE "productos" ADD FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "productos" ADD FOREIGN KEY ("unidad_medida") REFERENCES "cat_unidades_medida" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "productos" ADD FOREIGN KEY ("afectacion_igv") REFERENCES "cat_tipo_afectacion_igv" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cotizaciones" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cotizaciones" ADD FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cotizaciones_lineas" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cotizaciones_lineas" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cotizacion_envios" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pedidos" ADD FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pedidos" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pedidos" ADD FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes" ADD FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes" ADD FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes" ADD FOREIGN KEY ("tipo_doc_codigo") REFERENCES "cat_tipo_documento" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes" ADD FOREIGN KEY ("comprobante_referencia_id") REFERENCES "comprobantes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("unidad_codigo") REFERENCES "cat_unidades_medida" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comprobantes_detalles" ADD FOREIGN KEY ("tip_afe_igv_codigo") REFERENCES "cat_tipo_afectacion_igv" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pedidos_lineas" ADD FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pedidos_lineas" ADD FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

-- (Removed erroneous FK: sustento_url is a text URL, not a foreign key)

ALTER TABLE "configuracion_series" ADD FOREIGN KEY ("tipo_doc_codigo") REFERENCES "cat_tipo_documento" ("codigo") DEFERRABLE INITIALLY IMMEDIATE;
