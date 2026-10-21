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

export interface SheetRow {
  /** Normalized item number used for matching. */
  key: string;
  cells: SheetCell[];
}

export interface SheetData {
  fileName: string;
  headers: string[];
  rows: SheetRow[];
  /** Rows that were skipped because their item number is empty. */
  emptyKeyCount: number;
}

export interface ComparisonResult {
  onlyInExternal: SheetRow[];
  onlyInInternal: SheetRow[];
}
