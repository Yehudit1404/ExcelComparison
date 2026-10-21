import { compareSheets } from './compare';
import { SheetData } from './sheet.model';

function sheet(...keys: string[]): SheetData {
  return {
    fileName: 'test.xlsx',
    headers: ['מספר פריט'],
    rows: keys.map((key) => ({ key, cells: [{ value: key, text: key }] })),
    emptyKeyCount: 0,
  };
}

describe('compareSheets', () => {
  it('returns the rows found in only one of the sheets', () => {
    const result = compareSheets(sheet('a1', 'b2', 'c3'), sheet('b2', 'd4'));
    expect(result.onlyInExternal.map((r) => r.key)).toEqual(['a1', 'c3']);
    expect(result.onlyInInternal.map((r) => r.key)).toEqual(['d4']);
  });

  it('keeps every row of a repeated item number', () => {
    const result = compareSheets(sheet('a1', 'a1'), sheet());
    expect(result.onlyInExternal).toHaveLength(2);
  });

  it('returns nothing when both sheets have the same items', () => {
    const result = compareSheets(sheet('a1', 'b2'), sheet('b2', 'a1'));
    expect(result.onlyInExternal).toEqual([]);
    expect(result.onlyInInternal).toEqual([]);
  });
});
