import { compareSheets, keyRows } from './compare';
import { KeyedSheet, SheetData } from './sheet.model';

function keyed(...keys: string[]): KeyedSheet {
  return {
    headers: ['מספר פריט'],
    rows: keys.map((key) => ({ key, cells: [{ value: key, text: key }] })),
    emptyKeyCount: 0,
  };
}

describe('keyRows', () => {
  const sheet: SheetData = {
    fileName: 'test.xlsx',
    headers: ['שם', 'מק"ט'],
    rows: [
      [
        { value: 'א', text: 'א' },
        { value: '0AB1', text: '0AB1' },
      ],
      [
        { value: 'ב', text: 'ב' },
        { value: null, text: '' },
      ],
    ],
    keyColumn: -1,
  };

  it('keys rows by the chosen column and counts rows where it is empty', () => {
    const result = keyRows(sheet, 1);
    expect(result.rows.map((r) => r.key)).toEqual(['ab1']);
    expect(result.emptyKeyCount).toBe(1);
  });

  it('can key by any column', () => {
    expect(keyRows(sheet, 0).rows.map((r) => r.key)).toEqual(['א', 'ב']);
  });
});

describe('compareSheets', () => {
  it('returns the rows found in only one of the sheets', () => {
    const result = compareSheets(keyed('a1', 'b2', 'c3'), keyed('b2', 'd4'));
    expect(result.onlyInExternal.map((r) => r.key)).toEqual(['a1', 'c3']);
    expect(result.onlyInInternal.map((r) => r.key)).toEqual(['d4']);
  });

  it('keeps every row of a repeated item number', () => {
    const result = compareSheets(keyed('a1', 'a1'), keyed());
    expect(result.onlyInExternal.length).toBe(2);
  });

  it('returns nothing when both sheets have the same items', () => {
    const result = compareSheets(keyed('a1', 'b2'), keyed('b2', 'a1'));
    expect(result.onlyInExternal).toEqual([]);
    expect(result.onlyInInternal).toEqual([]);
  });
});
