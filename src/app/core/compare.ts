import { normalizeItemKey } from './item-key';
import { ComparisonResult, KeyedSheet, SheetData, SheetRow } from './sheet.model';

/** Keys every row by the value in `column`; rows where it is empty are counted and left out. */
export function keyRows(sheet: SheetData, column: number): KeyedSheet {
  const rows: SheetRow[] = [];
  let emptyKeyCount = 0;
  for (const cells of sheet.rows) {
    const key = normalizeItemKey(cells[column]?.text);
    if (key) rows.push({ key, cells });
    else emptyKeyCount++;
  }
  return { headers: sheet.headers, rows, emptyKeyCount };
}

/** Rows of `source` whose key does not appear anywhere in `other`. */
export function rowsMissingFrom(source: KeyedSheet, other: KeyedSheet): SheetRow[] {
  const otherKeys = new Set(other.rows.map((row) => row.key));
  return source.rows.filter((row) => !otherKeys.has(row.key));
}

export function compareSheets(external: KeyedSheet, internal: KeyedSheet): ComparisonResult {
  return {
    external,
    internal,
    onlyInExternal: rowsMissingFrom(external, internal),
    onlyInInternal: rowsMissingFrom(internal, external),
  };
}
