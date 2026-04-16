import { formatCurrency } from '@/utils/formatters';

export interface CobroFormData {
  monto_cobrado: number | '';
  metodo_pago_codigo: string;
  cuenta_bancaria_id: string;
  fecha_pago: string;
  referencia_operacion: string;
  notas: string;
}

export const initialCobroFormData: CobroFormData = {
  monto_cobrado: '',
  metodo_pago_codigo: '',
  cuenta_bancaria_id: '',
  fecha_pago: new Date().toISOString().split('T')[0],
  referencia_operacion: '',
  notas: '',
};

/**
 * Validates the cobro form data.
 * Returns an error message string or null if valid.
 * Pattern: manual validation (not Zod) per project convention.
 */
export function validateCobroForm(
  form: CobroFormData,
  saldoPendiente: number,
  requiereReferencia: boolean
): string | null {
  const monto = Number(form.monto_cobrado);

  if (!form.monto_cobrado || isNaN(monto) || monto <= 0) {
    return 'El monto es obligatorio y debe ser mayor a 0.';
  }

  if (monto > saldoPendiente) {
    return `El monto no puede exceder el saldo pendiente (${formatCurrency(saldoPendiente)}).`;
  }

  if (!form.metodo_pago_codigo) {
    return 'Seleccioná un método de pago.';
  }

  if (!form.cuenta_bancaria_id) {
    return 'Seleccioná una cuenta bancaria de destino.';
  }

  if (!form.fecha_pago) {
    return 'La fecha de pago es obligatoria.';
  }

  // No future dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (new Date(form.fecha_pago) > today) {
    return 'La fecha de pago no puede ser futura.';
  }

  if (requiereReferencia && !form.referencia_operacion.trim()) {
    return 'Este método de pago requiere un número de referencia/operación.';
  }

  return null;
}
