import { TestBed } from '@angular/core/testing';
import ExcelJS from 'exceljs';
import { ExcelService } from './excel.service';

async function xlsxFile(name: string, rows: unknown[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1').addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name);
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
      ['ב', { formula: '"CD"&"5"', result: 'CD5' }, 2],
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
      ['', 'no key'],
    ]);
    const sheet = await service.readSheet(file);

    expect(sheet.rows).toHaveLength(1);
    expect(sheet.emptyKeyCount).toBe(1);
  });

  it('ignores empty columns that only have formatting', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRows([['מספר פריט'], ['AB1']]);
    worksheet.getCell('E2').numFmt = '0.00';
    const file = new File([await workbook.xlsx.writeBuffer()], 'styled.xlsx');

    const sheet = await service.readSheet(file);
    expect(sheet.headers).toEqual(['מספר פריט']);
    expect(sheet.rows[0].cells).toHaveLength(1);
  });

  it('explains when the item number column is missing', async () => {
    const file = await xlsxFile('bad.xlsx', [['שם', 'כמות']]);
    await expect(service.readSheet(file)).rejects.toThrow('לא נמצאה עמודה בשם "מספר פריט"');
  });

  it('explains when the file is not an xlsx file', async () => {
    const file = new File(['not excel'], 'old.xls');
    await expect(service.readSheet(file)).rejects.toThrow('לא ניתן לקרוא את הקובץ "old.xls"');
  });
});
