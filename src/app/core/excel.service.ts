import { Injectable } from '@angular/core';
import { ITEM_COLUMN, cleanHeader, normalizeItemKey } from './item-key';
import { CellValue, SheetCell, SheetData, SheetRow } from './sheet.model';
import { RawCell, readFirstSheet } from './xlsx/xlsx-reader';
import { writeWorkbook } from './xlsx/xlsx-writer';

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: SheetRow[];
}

/** Reads and writes Excel files in the browser. Nothing is sent to a server. */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  async readSheet(file: File): Promise<SheetData> {
    let raw: (RawCell | undefined)[][];
    try {
      raw = await readFirstSheet(await file.arrayBuffer());
    } catch {
      throw new Error(
        `לא ניתן לקרוא את הקובץ "${file.name}". יש להעלות קובץ אקסל בפורמט ‎.xlsx` +
          ' (קובץ ‎.xls ישן אפשר לשמור מחדש כ-‎.xlsx מתוך אקסל).',
      );
    }

    const firstRow = raw.findIndex((row) => row?.some(Boolean));
    if (firstRow === -1) throw new Error(`הקובץ "${file.name}" ריק.`);

    const columnCount = raw.reduce((max, row) => Math.max(max, row?.length ?? 0), 0);
    const columns = Array.from({ length: columnCount }, (_, c) => c);
    const headers = columns.map((c) => cleanHeader(toSheetCell(raw[firstRow][c]).text));
    const keyColumn = headers.indexOf(ITEM_COLUMN);
    if (keyColumn === -1) {
      const found = headers.filter(Boolean).join(', ') || '(אין)';
      throw new Error(
        `בקובץ "${file.name}" לא נמצאה עמודה בשם "${ITEM_COLUMN}" בשורה הראשונה.\nהעמודות שנמצאו: ${found}`,
      );
    }

    const rows: SheetRow[] = [];
    let emptyKeyCount = 0;
    for (const row of raw.slice(firstRow + 1)) {
      if (!row?.some(Boolean)) continue;
      const cells = columns.map((c) => toSheetCell(row[c]));
      const key = normalizeItemKey(cells[keyColumn].text);
      if (key) rows.push({ key, cells });
      else emptyKeyCount++;
    }

    return { fileName: file.name, headers, rows, emptyKeyCount };
  }

  async exportWorkbook(fileName: string, sheets: ExportSheet[]): Promise<void> {
    const blob = await writeWorkbook(
      sheets.map((sheet) => ({
        name: sheet.name,
        headers: sheet.headers,
        rows: sheet.rows.map((row) => row.cells),
        widths: sheet.headers.map((header, i) => {
          const longest = sheet.rows.reduce(
            (max, row) => Math.max(max, row.cells[i]?.text.length ?? 0),
            header.length,
          );
          return Math.min(Math.max(longest + 2, 10), 60);
        }),
      })),
    );
    downloadBlob(blob, fileName);
  }
}

function toSheetCell(cell: RawCell | undefined): SheetCell {
  const value = cell?.value ?? null;
  return { value, text: displayText(value), numFmt: cell?.numFmt };
}

function displayText(value: CellValue): string {
  if (value === null) return '';
  if (value instanceof Date) return value.toLocaleDateString('he-IL', { timeZone: 'UTC' });
  // Hide floating point noise such as 0.1 + 0.2 = 0.30000000000000004.
  if (typeof value === 'number') return String(Number(value.toPrecision(15)));
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return value.trim();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
