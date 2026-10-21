import { TestBed } from '@angular/core/testing';
import { ExcelService } from './excel.service';
import { CellValue } from './sheet.model';
import { writeWorkbook } from './xlsx/xlsx-writer';

async function xlsxFile(name: string, rows: CellValue[][]): Promise<File> {
  const [headers, ...data] = rows;
  const blob = await writeWorkbook([
    {
      name: 'Sheet1',
      headers: headers.map(String),
      rows: data.map((row) => row.map((value) => ({ value }))),
    },
  ]);
  return new File([blob], name);
}

describe('ExcelService.readSheet', () => {
  let service: ExcelService;

  beforeEach(() => {
    service = TestBed.inject(ExcelService);
  });

  it('reads the full rows and finds the item number column', async () => {
    const file = await xlsxFile('ext.xlsx', [
      ['שם', 'מספר פריט', 'כמות'],
      ['א', '0AB123', 4],
      [null, null, null],
      ['ב', 'cd5', 2],
    ]);
    const sheet = await service.readSheet(file);

    expect(sheet.headers).toEqual(['שם', 'מספר פריט', 'כמות']);
    expect(sheet.keyColumn).toBe(1);
    expect(sheet.rows.map((cells) => cells.map((c) => c.value))).toEqual([
      ['א', '0AB123', 4],
      ['ב', 'cd5', 2],
    ]);
  });

  it('reports -1 when there is no item number column, so the user can pick one', async () => {
    const file = await xlsxFile('other.xlsx', [
      ['שם', 'מק"ט'],
      ['א', 'AB1'],
    ]);
    const sheet = await service.readSheet(file);

    expect(sheet.keyColumn).toBe(-1);
    expect(sheet.headers).toEqual(['שם', 'מק"ט']);
    expect(sheet.rows.length).toBe(1);
  });

  it('explains when the file is not an xlsx file', async () => {
    const file = new File(['not excel'], 'old.xls');
    await expectAsync(service.readSheet(file)).toBeRejectedWithError(
      /לא ניתן לקרוא את הקובץ "old.xls"/,
    );
  });
});
