export interface RegistrarExternaState {
  cliente_id: string;
  tipo_doc_codigo: string;
  serie: string;
  correlativo: string;
  fecha_emision: string;
  subtotal: string;
  igv_monto: string;
  total: string;
  pedido_id: string;
}

export function validateRegistrarExterna(
  state: RegistrarExternaState,
  files: { pdf: File | null; xml: File | null }
): string | null {
  if (!state.cliente_id) return 'Seleccioná un cliente';
  if (!state.tipo_doc_codigo) return 'Seleccioná el tipo de comprobante';
  if (!state.serie.trim()) return 'Ingresá la serie del comprobante';
  if (!state.correlativo.trim() || isNaN(parseInt(state.correlativo, 10)) || parseInt(state.correlativo, 10) <= 0)
    return 'Ingresá un número correlativo válido';
  if (!state.fecha_emision) return 'Seleccioná la fecha de emisión';
  if (!state.subtotal.trim() || isNaN(parseFloat(state.subtotal)) || parseFloat(state.subtotal) < 0)
    return 'Ingresá un subtotal válido';
  if (!state.igv_monto.trim() || isNaN(parseFloat(state.igv_monto)) || parseFloat(state.igv_monto) < 0)
    return 'Ingresá un monto de IGV válido';
  if (!state.total.trim() || isNaN(parseFloat(state.total)) || parseFloat(state.total) <= 0)
    return 'Ingresá un total válido';
  if (!files.pdf) return 'Adjuntá el archivo PDF del comprobante';
  if (!files.xml) return 'Adjuntá el archivo XML del comprobante';
  return null;
}
