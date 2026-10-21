import { isDateFormat, readFirstSheet, serialToDate } from './xlsx-reader';
import { writeWorkbook } from './xlsx-writer';
import { readZip, writeZip } from './zip';

describe('zip', () => {
  it('reads back what it writes', async () => {
    const text = 'שלום '.repeat(1000);
    const blob = await writeZip([{ name: 'a/b.txt', data: new TextEncoder().encode(text) }]);
    const files = await readZip(await blob.arrayBuffer());
    expect(new TextDecoder().decode(files.get('a/b.txt'))).toBe(text);
  });

  it('rejects files that are not ZIP archives', async () => {
    await expectAsync(readZip(new TextEncoder().encode('not a zip').buffer)).toBeRejected();
  });
});

describe('xlsx reader and writer', () => {
  it('keep text, numbers, booleans, dates and number formats', async () => {
    const date = new Date(Date.UTC(2026, 4, 3));
    const blob = await writeWorkbook([
      {
        name: 'גיליון',
        headers: ['שם', 'מספר פריט', 'כמות', 'תאריך', 'פעיל'],
        rows: [
          [
            { value: 'א & <ב>' },
            { value: '0AB123' },
            { value: 1234.5, numFmt: '#,##0.00' },
            { value: date, numFmt: 'dd/mm/yyyy' },
            { value: true },
          ],
        ],
      },
    ]);

    const rows = await readFirstSheet(await blob.arrayBuffer());
    expect(rows[0].map((c) => c?.value)).toEqual(['שם', 'מספר פריט', 'כמות', 'תאריך', 'פעיל']);
    expect(rows[1].map((c) => c?.value)).toEqual(['א & <ב>', '0AB123', 1234.5, date, true]);
    expect(rows[1][2]?.numFmt).toBe('#,##0.00');
  });

  it('only reads the first sheet', async () => {
    const blob = await writeWorkbook([
      { name: 'one', headers: ['first'], rows: [] },
      { name: 'two', headers: ['second'], rows: [] },
    ]);
    const rows = await readFirstSheet(await blob.arrayBuffer());
    expect(rows[0][0]?.value).toBe('first');
  });
});

describe('date helpers', () => {
  it('recognize date formats', () => {
    expect(isDateFormat('dd/mm/yyyy')).toBeTrue();
    expect(isDateFormat('h:mm')).toBeTrue();
    expect(isDateFormat('#,##0.00')).toBeFalse();
    expect(isDateFormat('0.00 "days"')).toBeFalse();
    expect(isDateFormat('[Red]0')).toBeFalse();
  });

  it('convert Excel serial numbers to dates', () => {
    expect(serialToDate(46145)).toEqual(new Date(Date.UTC(2026, 4, 3)));
  });
});
