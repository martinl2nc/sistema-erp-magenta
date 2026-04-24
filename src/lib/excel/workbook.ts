import ExcelJS from 'exceljs';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFE2E8F0' },
  size: 10,
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
};

export const TIPO_DOC: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de Crédito',
};

export function getClientName(c: {
  razon_social?: string | null;
  nombres_contacto: string;
  apellidos_contacto: string;
}): string {
  return c.razon_social || `${c.nombres_contacto} ${c.apellidos_contacto}`.trim();
}

export function applyHeaderRow(
  row: ExcelJS.Row,
  columns: { header: string; width: number; numFmt?: string }[],
  sheet: ExcelJS.Worksheet,
): void {
  sheet.columns = columns.map((c) => ({
    header: c.header,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_STYLE;
    cell.alignment = { vertical: 'middle', wrapText: false };
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function createWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CotizadorPro';
  wb.created = new Date();
  return wb;
}

export const CURRENCY_FMT = '"S/"#,##0.00';
export const DATE_FMT = 'DD/MM/YYYY';
