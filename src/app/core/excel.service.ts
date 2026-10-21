import { Injectable } from '@angular/core';
import type { Cell, CellValue as ExcelCellValue } from 'exceljs';
import { ITEM_COLUMN, cleanHeader, normalizeItemKey } from './item-key';
import { CellValue, SheetCell, SheetData, SheetRow } from './sheet.model';

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: SheetRow[];
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Reads and writes Excel files in the browser. Nothing is sent to a server. */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  async readSheet(file: File): Promise<SheetData> {
    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
      throw new Error(
        `לא ניתן לקרוא את הקובץ "${file.name}". יש להעלות קובץ אקסל בפורמט ‎.xlsx` +
          ' (קובץ ‎.xls ישן אפשר לשמור מחדש כ-‎.xlsx מתוך אקסל).',
      );
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.actualRowCount === 0) {
      throw new Error(`הקובץ "${file.name}" ריק.`);
    }

    // worksheet.columnCount also counts empty columns that only have formatting.
    let columnCount = 0;
    worksheet.eachRow((row) =>
      row.eachCell((_, column) => (columnCount = Math.max(columnCount, column))),
    );
    const headerRow = worksheet.getRow(1);
    const headers = range(columnCount).map((c) => cleanHeader(headerRow.getCell(c).text));
    const keyColumn = headers.indexOf(ITEM_COLUMN);
    if (keyColumn === -1) {
      const found = headers.filter(Boolean).join(', ') || '(אין)';
      throw new Error(
        `בקובץ "${file.name}" לא נמצאה עמודה בשם "${ITEM_COLUMN}" בשורה הראשונה.\nהעמודות שנמצאו: ${found}`,
      );
    }

    const rows: SheetRow[] = [];
    let emptyKeyCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cells = range(columnCount).map((c) => toSheetCell(row.getCell(c)));
      const key = normalizeItemKey(cells[keyColumn].text);
      if (!key) {
        emptyKeyCount++;
        return;
      }
      rows.push({ key, cells });
    });

    return { fileName: file.name, headers, rows, emptyKeyCount };
  }

  async exportWorkbook(fileName: string, sheets: ExportSheet[]): Promise<void> {
    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name, { views: [{ rightToLeft: true }] });
      worksheet.addRow(sheet.headers).font = { bold: true };
      for (const row of sheet.rows) {
        const added = worksheet.addRow(row.cells.map((cell) => cell.value));
        row.cells.forEach((cell, i) => {
          if (cell.numFmt) added.getCell(i + 1).numFmt = cell.numFmt;
        });
      }
      worksheet.columns.forEach((column, i) => {
        const longest = Math.max(
          sheet.headers[i]?.length ?? 0,
          ...sheet.rows.map((row) => row.cells[i]?.text.length ?? 0),
        );
        column.width = Math.min(Math.max(longest + 2, 10), 60);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: XLSX_MIME }), fileName);
  }
}

/** ExcelJS is large, so it is only downloaded when a file is first used. */
async function loadExcelJs() {
  return (await import('exceljs')).default;
}

/** 1-based column numbers, as ExcelJS uses them. */
function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

function toSheetCell(cell: Cell): SheetCell {
  const value = toPlainValue(cell.value);
  return { value, text: displayText(value), numFmt: cell.numFmt || undefined };
}

/** Flattens formulas, rich text, hyperlinks and errors into a plain value. */
function toPlainValue(value: ExcelCellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value !== 'object') return value;
  if ('result' in value) return toPlainValue((value.result ?? null) as ExcelCellValue);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value) return toPlainValue(value.text as ExcelCellValue);
  if ('error' in value) return value.error;
  return String(value);
}

function displayText(value: CellValue): string {
  if (value === null) return '';
  if (value instanceof Date) return value.toLocaleDateString('he-IL', { timeZone: 'UTC' });
  return String(value).trim();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
