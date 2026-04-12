// Convierte un monto numérico a texto en español (formato facturas Perú)
// Ejemplo: 1250.50 → "SON MIL DOSCIENTOS CINCUENTA Y 50/100 SOLES"

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];

const VEINTENAS = [
  '', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO',
  'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];

const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];

const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirMenorMil(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const r = n % 100;
  const centPart = c > 0 ? CENTENAS[c] : '';

  let unitPart = '';
  if (r === 0) {
    unitPart = '';
  } else if (r < 20) {
    unitPart = UNIDADES[r];
  } else if (r < 30) {
    unitPart = VEINTENAS[r - 20];
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    unitPart = u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
  }

  return [centPart, unitPart].filter(Boolean).join(' ');
}

function convertirMiles(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return convertirMenorMil(n);

  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const milesPart = miles === 1 ? 'MIL' : `${convertirMenorMil(miles)} MIL`;
  const restoPart = convertirMenorMil(resto);

  return [milesPart, restoPart].filter(Boolean).join(' ');
}

export function numeroALetras(monto: number): string {
  const entero = Math.floor(Math.abs(monto));
  const centavos = Math.round((Math.abs(monto) - entero) * 100);

  let letras: string;

  if (entero === 0) {
    letras = 'CERO';
  } else if (entero < 1_000_000) {
    letras = convertirMiles(entero);
  } else {
    const millones = Math.floor(entero / 1_000_000);
    const resto = entero % 1_000_000;
    const millonesPart = millones === 1 ? 'UN MILLÓN' : `${convertirMiles(millones)} MILLONES`;
    const restoPart = convertirMiles(resto);
    letras = [millonesPart, restoPart].filter(Boolean).join(' ');
  }

  return `SON ${letras} Y ${centavos.toString().padStart(2, '0')}/100 SOLES`;
}
