import { CellValue } from '../sheet.model';
import { writeZip } from './zip';

export interface WriteCell {
  value: CellValue;
  numFmt?: string;
}

export interface WriteSheet {
  name: string;
  headers: string[];
  rows: WriteCell[][];
  /** Column widths in characters. */
  widths?: number[];
}

const DEFAULT_DATE_FORMAT = 'dd/mm/yyyy';
const FIRST_CUSTOM_FORMAT_ID = 164;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

/** Builds an .xlsx file with right-to-left sheets and a bold header row. */
export async function writeWorkbook(sheets: WriteSheet[]): Promise<Blob> {
  const styles = new StyleTable();
  const sheetXml = sheets.map((sheet) => worksheetXml(sheet, styles));
  const encoder = new TextEncoder();
  const file = (name: string, content: string) => ({
    name,
    data: encoder.encode(XML_HEADER + content),
  });

  return writeZip([
    file('[Content_Types].xml', contentTypesXml(sheets.length)),
    file(
      '_rels/.rels',
      `<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    file('xl/workbook.xml', workbookXml(sheets)),
    file('xl/_rels/workbook.xml.rels', workbookRelsXml(sheets.length)),
    file('xl/styles.xml', styles.toXml()),
    ...sheetXml.map((xml, i) => file(`xl/worksheets/sheet${i + 1}.xml`, xml)),
  ]);
}

function worksheetXml(sheet: WriteSheet, styles: StyleTable): string {
  const header = `<row r="1">${sheet.headers
    .map((h, c) => cellXml(c, 1, { value: h }, StyleTable.BOLD))
    .join('')}</row>`;
  const rows = sheet.rows.map((row, r) => {
    const cells = row.map((cell, c) => cellXml(c, r + 2, cell, styles.styleFor(cell)));
    return `<row r="${r + 2}">${cells.join('')}</row>`;
  });
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : '';

  return (
    `<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    `<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>` +
    cols +
    `<sheetData>${header}${rows.join('')}</sheetData></worksheet>`
  );
}

function cellXml(column: number, row: number, cell: WriteCell, style: number): string {
  const ref = columnName(column) + row;
  const s = style ? ` s="${style}"` : '';
  const { value } = cell;
  if (value === null || value === '') return '';
  if (value instanceof Date) return `<c r="${ref}"${s}><v>${dateToSerial(value)}</v></c>`;
  if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

/** Collects the number formats used by the cells and gives each one a style index. */
class StyleTable {
  static readonly BOLD = 1;
  private readonly formats: string[] = [];

  styleFor(cell: WriteCell): number {
    const format = cell.numFmt ?? (cell.value instanceof Date ? DEFAULT_DATE_FORMAT : undefined);
    if (!format || format === 'General' || typeof cell.value === 'string') return 0;
    let index = this.formats.indexOf(format);
    if (index === -1) index = this.formats.push(format) - 1;
    return index + 2; // after the default style (0) and the bold header (1)
  }

  toXml(): string {
    const numFmts = this.formats
      .map((f, i) => `<numFmt numFmtId="${FIRST_CUSTOM_FORMAT_ID + i}" formatCode="${escapeXml(f)}"/>`)
      .join('');
    const formatXfs = this.formats
      .map(
        (_, i) =>
          `<xf numFmtId="${FIRST_CUSTOM_FORMAT_ID + i}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`,
      )
      .join('');
    return (
      `<styleSheet xmlns="${MAIN_NS}">` +
      (numFmts ? `<numFmts count="${this.formats.length}">${numFmts}</numFmts>` : '') +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${this.formats.length + 2}">` +
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
      `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
      formatXfs +
      `</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`
    );
  }
}

function contentTypesXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  return (
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    sheets +
    `</Types>`
  );
}

function workbookXml(sheets: WriteSheet[]): string {
  const entries = sheets
    .map(
      (sheet, i) =>
        `<sheet name="${escapeXml(safeSheetName(sheet.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('');
  return (
    `<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    `<bookViews><workbookView rightToLeft="1"/></bookViews>` +
    `<sheets>${entries}</sheets></workbook>`
  );
}

function workbookRelsXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');
  return (
    `<Relationships xmlns="${PKG_REL_NS}">${sheets}` +
    `<Relationship Id="rId${sheetCount + 1}" Type="${REL_NS}/styles" Target="styles.xml"/>` +
    `</Relationships>`
  );
}

/** Excel sheet names: at most 31 characters, without : \ / ? * [ ] */
function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';
}

/** 0 -> "A", 27 -> "AB". */
function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** Inverse of serialToDate: a UTC date to an Excel serial number. */
function dateToSerial(date: Date): number {
  return (date.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
}

function escapeXml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
