# Plan de Implementación: Facturación a Crédito

## 1. Características Generales
- **Objetivo**: Habilitar en el módulo de facturación la emisión de comprobantes bajo la modalidad de pago a "Crédito".
- **Comportamiento Esperado**: Mostrar un selector en la interfaz y, en el caso de seleccionar "Crédito", obligar al usuario a definir cuántas cuotas y sus respectivas fechas/montos.
- **Validación Núcleo**: La sumatoria exacta de todas las cuotas ingresadas debe equivaler al Monto Neto Pendiente de Pago (es decir, el total de venta menos detracción si hubiese).

---

## 2. Especificaciones y Requisitos (Specs)

### 2.1 Modificación de Módulo Existente: Generación Payload ApisPeru
- **Escenario 1 (Contado)**: Mantener retrocompatibilidad total. Si la factura es al contado, el Payload JSON sigue operando como lo hace actualmente.
- **Escenario 2 (Crédito)**: Cuando la forma de pago sea "Crédito", el sistema requiere inyectar obligatoriamente dentro del elemento `forma_de_pago` del payload el array JSON `cuotas`. Dicho array constará de `monto` (pen) y `fecha` límite de pago.

### 2.2 Nuevas Capacidades: Facturación y Distribución
- **Alternador de Forma de Pago**: El UI exhibirá la posibilidad de cambiar de Contado (Default) a Crédito de manera dinámica en la página transaccional y el modal.
- **Auto-distribución Equitativa**: Al seleccionar, por ejemplo, 3 cuotas, el balance matemático se fracciona automáticamente intentando una división simétrica ideal. Los diferenciales de Céntimos (+/- 0.01) recaerán automáticamente en la última o en la primera cuota.
- **Ajuste Manual Editable**: El usuario podrá desajustar las porciones porcentuales de cuota manualmente según su conveniencia cobratoria, siempre que el gran total de las partes concuerde con el neto adeudado tras retenciones.
- **Integridad ACID (Base de Datos)**: La inserción final via `emitir_comprobante` se modificará para actuar transaccionalmente. Creará el encabezado del comprobante e insertará masiva/individualmente hijos en la tabla paralela `comprobantes_cuotas` con su ID padre inyectado, reseteando la propiedad `fecha_vencimiento` del registro padre con el techo de la última cuota.

---

## 3. Descomposición de Tareas (Tasks)

### Fase 1: Capa de Base de Datos y Servicios (Backend / API)
- [ ] 1.1 Modificar el RPC PostgreSQL `public.emitir_comprobante` para admitir `p_forma_pago text` con valor por defecto 'Contado' y procesar la inserción de un payload en formato JSON (`p_cuotas`) directo sobre `public.comprobantes_cuotas`.
- [ ] 1.2 Actualizar el archivo `src/services/facturas.service.ts` para extender la interface/tipo de entrada `EmitirComprobantePayload` adaptándolo a los nuevos modificadores.
- [ ] 1.3 Refactorizar la abstracción de TanStack/Supabase Call (en `facturas.service.ts`) de modo que acepte la nueva data y se comunique limpiamente con el RPC adaptado.

### Fase 2: Armado del Emisor de Integración (ApisPeru)
- [ ] 2.1 Alterar la función `buildInvoicePayload` referenciada nativamente en `src/lib/apisperuFacturacion.ts` para identificar en vivo la inserción crediticia.
- [ ] 2.2 Reestructurar el object sub-node de `forma_de_pago` y map del array `cuotas` asegurando estricto formato de fecha `YYYY-MM-DD` que exige SUNAT.

### Fase 3: Estado UI, Lógica y Funciones Utilitarias Compartidas
- [ ] 3.1 Agregar la lógica defensiva y validadora estricta a `src/features/facturacion/nuevaFactura.utils.ts` que determine que _Sum(Cuotas) == Total Adeudado_ y blinde un error anticipado.
- [ ] 3.2 Ampliar los reducers / setState de `src/features/facturacion/useNuevaFacturaState.ts` adjuntando las nuevas variables de control (`formaPago`, `listaCuotasActivas`).
- [ ] 3.3 Construir el algoritmo "Helper" que fragmenta por defecto en montos limpios y calcula el diferencial de redondeo automático sin romper SUNAT.

### Fase 4: Experiencia e Interfaz de Usuario (UI Components)
- [ ] 4.1 Añadir al Formulario de "Emitir Comprobante" (`NuevaFacturaForm.tsx` & `EmitirComprobanteModal.tsx`) un selector radio control o dropdown para el método de cuotificación.
- [ ] 4.2 Levantar una Data Table nativa Tailwind editable o sub-lista dinámica para acomodar y observar en tiempo real la sumatoria fraccionada en el form de Emisión.
- [ ] 4.3 Vincular y blindar visualmente el botón principal Submit si la sumatoria calculada marca error en rojo en la pantalla.

### Fase 5: Pruebas y Certificación de Flujo (QA)
- [ ] 5.1 Testear 1 registro "Contado" y certificar retrocompatibilidad 100%.
- [ ] 5.2 Testear 1 registro "Crédito" (3 cuotas asíncronas), verificar inserción exitosa en Supabase sub-tabla, retrollamada exitosa RPC, e integración real al portal API SUNAT Demo con Estado Aceptado.
- [ ] 5.3 Simular factura con Detracción y cerciorarse de que el fraccionamiento neto en UI excluye de la base crediticia el dinero de cuenta BN (neto a pagar).
