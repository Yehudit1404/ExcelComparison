/** A value as it is written back to Excel. */
export type CellValue = string | number | boolean | Date | null;

export interface SheetCell {
  /** The value to export (formulas are replaced by their result). */
  value: CellValue;
  /** The value as Excel displays it, used for the on-screen table. */
  text: string;
  /** Excel number format, kept so dates and amounts look the same after export. */
  numFmt?: string;
}

/** An uploaded sheet, before a column is chosen for matching. */
export interface SheetData {
  fileName: string;
  headers: string[];
  /** Every non-empty row under the header row. */
  rows: SheetCell[][];
  /** Index of the "מספר פריט" column, or -1 when the file has no such column. */
  keyColumn: number;
}

export interface SheetRow {
  /** Normalized value of the matching column. */
  key: string;
  cells: SheetCell[];
}

/** A sheet with its rows keyed by the chosen column. */
export interface KeyedSheet {
  headers: string[];
  rows: SheetRow[];
  /** Rows that were skipped because the matching column is empty. */
  emptyKeyCount: number;
}

export interface ComparisonResult {
  external: KeyedSheet;
  internal: KeyedSheet;
  onlyInExternal: SheetRow[];
  onlyInInternal: SheetRow[];
}
