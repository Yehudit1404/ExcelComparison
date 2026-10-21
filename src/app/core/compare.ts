import { ComparisonResult, SheetData, SheetRow } from './sheet.model';

/** Rows of `source` whose item number does not appear anywhere in `other`. */
export function rowsMissingFrom(source: SheetData, other: SheetData): SheetRow[] {
  const otherKeys = new Set(other.rows.map((row) => row.key));
  return source.rows.filter((row) => !otherKeys.has(row.key));
}

export function compareSheets(external: SheetData, internal: SheetData): ComparisonResult {
  return {
    onlyInExternal: rowsMissingFrom(external, internal),
    onlyInInternal: rowsMissingFrom(internal, external),
  };
}
