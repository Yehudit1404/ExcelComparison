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

  it('reads the full rows and normalizes the item number', async () => {
    const file = await xlsxFile('ext.xlsx', [
      ['שם', 'מספר פריט', 'כמות'],
      ['א', '0AB123', 4],
      ['ב', 'cd5', 2],
    ]);
    const sheet = await service.readSheet(file);

    expect(sheet.headers).toEqual(['שם', 'מספר פריט', 'כמות']);
    expect(sheet.rows.map((r) => r.key)).toEqual(['ab123', 'cd5']);
    expect(sheet.rows[0].cells.map((c) => c.value)).toEqual(['א', '0AB123', 4]);
  });

  it('skips rows without an item number and counts them', async () => {
    const file = await xlsxFile('ext.xlsx', [
      ['מספר פריט', 'תיאור'],
      ['AB1', 'x'],
      [null, 'no key'],
    ]);
    const sheet = await service.readSheet(file);

    expect(sheet.rows.length).toBe(1);
    expect(sheet.emptyKeyCount).toBe(1);
  });

  it('explains when the item number column is missing', async () => {
    const file = await xlsxFile('bad.xlsx', [['שם', 'כמות']]);
    await expectAsync(service.readSheet(file)).toBeRejectedWithError(
      /לא נמצאה עמודה בשם "מספר פריט"/,
    );
  });

  it('explains when the file is not an xlsx file', async () => {
    const file = new File(['not excel'], 'old.xls');
    await expectAsync(service.readSheet(file)).toBeRejectedWithError(
      /לא ניתן לקרוא את הקובץ "old.xls"/,
    );
  });
});
