/**
 * Utilidades de formateo para la aplicación
 * Centraliza lógica de formato de moneda, fechas y nombres de clientes
 */

/**
 * Formatea un número como moneda peruana (PEN)
 * 
 * @param value - Valor numérico a formatear
 * @returns String formateado como "S/ 1,234.56"
 * 
 * @example
 * formatCurrency(1234.56) // "S/ 1,234.56"
 * formatCurrency(0) // "S/ 0.00"
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-PE', { 
    style: 'currency', 
    currency: 'PEN' 
  }).format(value);
};

/**
 * Formatea una fecha en formato español peruano
 * 
 * @param date - Fecha como string ISO o objeto Date
 * @returns String formateado como "15 ene 2024"
 * 
 * @example
 * formatDate('2024-01-15') // "15 ene 2024"
 * formatDate(new Date()) // Fecha actual formateada
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Formatea una fecha en formato corto (dd/mm/yyyy)
 * 
 * @param date - Fecha como string ISO o objeto Date
 * @returns String formateado como "15/01/2024"
 */
export const formatDateShort = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Obtiene el nombre para mostrar de un cliente
 * Prioriza razón social, luego nombres completos, luego fallback
 * 
 * @param client - Objeto con datos del cliente
 * @returns Nombre a mostrar
 * 
 * @example
 * getClientDisplayName({ razon_social: 'ACME Corp' }) // "ACME Corp"
 * getClientDisplayName({ nombres_contacto: 'Juan', apellidos_contacto: 'Pérez' }) // "Juan Pérez"
 * getClientDisplayName({}) // "Sin Nombre"
 */
export const getClientDisplayName = (client: {
  razon_social?: string | null;
  nombres_contacto?: string | null;
  apellidos_contacto?: string | null;
}): string => {
  // Prioridad 1: Razón social
  if (client.razon_social?.trim()) {
    return client.razon_social.trim();
  }
  
  // Prioridad 2: Nombres y apellidos
  const fullName = `${client.nombres_contacto || ''} ${client.apellidos_contacto || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  
  // Fallback
  return 'Sin Nombre';
};

/**
 * Formatea un número de teléfono peruano
 * 
 * @param phone - Número de teléfono
 * @returns Número formateado
 * 
 * @example
 * formatPhone('987654321') // "987 654 321"
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 9) {
    // Celular: 987 654 321
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  if (cleaned.length === 7) {
    // Fijo: 123 4567
    return cleaned.replace(/(\d{3})(\d{4})/, '$1 $2');
  }
  
  return phone;
};

/**
 * Formatea un número de documento (DNI o RUC)
 * 
 * @param doc - Número de documento
 * @param type - Tipo de documento ('DNI' o 'RUC')
 * @returns Documento formateado
 * 
 * @example
 * formatDocument('12345678', 'DNI') // "12345678"
 * formatDocument('20123456789', 'RUC') // "20123456789"
 */
export const formatDocument = (doc: string, type: 'DNI' | 'RUC' = 'DNI'): string => {
  const cleaned = doc.replace(/\D/g, '');
  
  if (type === 'DNI' && cleaned.length === 8) {
    return cleaned;
  }
  
  if (type === 'RUC' && cleaned.length === 11) {
    return cleaned;
  }
  
  return doc;
};
