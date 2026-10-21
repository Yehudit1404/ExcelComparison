import { CellValue } from '../sheet.model';
import { readZip } from './zip';

export interface RawCell {
  value: CellValue;
  numFmt?: string;
}

/** Rows of the first worksheet. `rows[r][c]` is undefined for empty cells. */
export type RawSheet = (RawCell | undefined)[][];

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Excel's built-in number formats that show dates or times. */
const BUILT_IN_DATE_FORMATS: Record<number, string> = {
  14: 'dd/mm/yyyy',
  15: 'd-mmm-yy',
  16: 'd-mmm',
  17: 'mmm-yy',
  18: 'h:mm AM/PM',
  19: 'h:mm:ss AM/PM',
  20: 'h:mm',
  21: 'h:mm:ss',
  22: 'dd/mm/yyyy h:mm',
  45: 'mm:ss',
  46: '[h]:mm:ss',
  47: 'mm:ss.0',
};

/** Reads the first worksheet of an .xlsx file. Throws if the file is not a valid .xlsx. */
export async function readFirstSheet(buffer: ArrayBuffer): Promise<RawSheet> {
  const files = await readZip(buffer);
  const xml = (path: string): Document | null => {
    const data = files.get(path);
    return data ? new DOMParser().parseFromString(new TextDecoder().decode(data), 'text/xml') : null;
  };

  const workbook = xml('xl/workbook.xml');
  const firstSheet = workbook && elements(workbook, 'sheet')[0];
  if (!firstSheet) throw new Error('Not an xlsx file');
  const date1904 = ['1', 'true'].includes(
    elements(workbook, 'workbookPr')[0]?.getAttribute('date1904') ?? '',
  );

  const relId = firstSheet.getAttributeNS(REL_NS, 'id') ?? firstSheet.getAttribute('r:id');
  const rel = elements(xml('xl/_rels/workbook.xml.rels'), 'Relationship').find(
    (r) => r.getAttribute('Id') === relId,
  );
  const target = rel?.getAttribute('Target') ?? 'worksheets/sheet1.xml';
  const sheet = xml(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  if (!sheet) throw new Error('Not an xlsx file');

  const sharedStrings = elements(xml('xl/sharedStrings.xml'), 'si').map(stringItemText);
  const styleFormats = readStyleFormats(xml('xl/styles.xml'));

  const rows: RawSheet = [];
  let nextRow = 0;
  for (const rowEl of elements(sheet, 'row')) {
    const rowIndex = Number(rowEl.getAttribute('r') ?? nextRow + 1) - 1;
    nextRow = rowIndex + 1;
    const row: (RawCell | undefined)[] = (rows[rowIndex] = []);

    let nextColumn = 0;
    for (const cellEl of childElements(rowEl, 'c')) {
      const ref = cellEl.getAttribute('r');
      const column = ref ? columnIndex(ref) : nextColumn;
      nextColumn = column + 1;

      const numFmt = styleFormats[Number(cellEl.getAttribute('s') ?? 0)];
      const value = cellValue(cellEl, sharedStrings, numFmt, date1904);
      if (value !== null) row[column] = { value, numFmt };
    }
  }
  return rows;
}

function cellValue(
  cell: Element,
  sharedStrings: string[],
  numFmt: string | undefined,
  date1904: boolean,
): CellValue {
  const type = cell.getAttribute('t') ?? 'n';
  const raw = childElements(cell, 'v')[0]?.textContent ?? null;

  switch (type) {
    case 'inlineStr': {
      const inline = childElements(cell, 'is')[0];
      return inline ? stringItemText(inline) : null;
    }
    case 's':
      return raw === null ? null : (sharedStrings[Number(raw)] ?? '');
    case 'str':
    case 'e':
      return raw;
    case 'b':
      return raw === null ? null : raw === '1';
    case 'd':
      return raw === null ? null : new Date(raw);
    default: {
      if (raw === null || raw === '') return null;
      const number = Number(raw);
      return numFmt && isDateFormat(numFmt) ? serialToDate(number, date1904) : number;
    }
  }
}

/** Text of a shared/inline string, skipping phonetic hints (<rPh>). */
function stringItemText(item: Element): string {
  return elements(item, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('');
}

/** Maps each cell style index to its number format code. */
function readStyleFormats(styles: Document | null): (string | undefined)[] {
  const custom = new Map<number, string>();
  for (const fmt of elements(styles, 'numFmt')) {
    custom.set(Number(fmt.getAttribute('numFmtId')), fmt.getAttribute('formatCode') ?? '');
  }
  const cellXfs = elements(styles, 'cellXfs')[0];
  if (!cellXfs) return [];
  return childElements(cellXfs, 'xf').map((xf) => {
    const id = Number(xf.getAttribute('numFmtId') ?? 0);
    return custom.get(id) ?? BUILT_IN_DATE_FORMATS[id];
  });
}

/** True when a number format shows a date or time (e.g. "dd/mm/yyyy", "h:mm"). */
export function isDateFormat(format: string): boolean {
  const withoutLiterals = format
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '');
  return /[dmyhs]/i.test(withoutLiterals) && !/^General$/i.test(format);
}

/** Converts an Excel date serial number to a Date (in UTC, so the day never shifts). */
export function serialToDate(serial: number, date1904 = false): Date {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(serial * 86400000));
}

/** "B12" -> 1 (zero-based column). */
function columnIndex(ref: string): number {
  let index = 0;
  for (const ch of ref.replace(/\d+$/, '').toUpperCase()) index = index * 26 + ch.charCodeAt(0) - 64;
  return index - 1;
}

function elements(root: Document | Element | null, localName: string): Element[] {
  return root ? Array.from(root.getElementsByTagNameNS('*', localName)) : [];
}

function childElements(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}
