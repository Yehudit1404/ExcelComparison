import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FileDropComponent } from './components/file-drop/file-drop.component';
import { ResultTableComponent } from './components/result-table/result-table.component';
import { compareSheets, keyRows } from './core/compare';
import { ExcelService, ExportSheet } from './core/excel.service';
import { ITEM_COLUMN } from './core/item-key';
import { ComparisonResult, SheetData } from './core/sheet.model';

type Side = 'external' | 'internal';

const SIDES: { side: Side; label: string; fileWord: string }[] = [
  { side: 'external', label: 'קובץ חיצוני', fileWord: 'החיצוני' },
  { side: 'internal', label: 'קובץ פנימי', fileWord: 'הפנימי' },
];

const SHEET_NAMES: Record<Side, string> = {
  external: 'רק בחיצוני',
  internal: 'רק בפנימי',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileDropComponent, ResultTableComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly excel = inject(ExcelService);

  protected readonly sides = SIDES;
  protected readonly itemColumn = ITEM_COLUMN;

  protected readonly sheets = signal<Record<Side, SheetData | null>>({
    external: null,
    internal: null,
  });
  /** The column each file is matched on; -1 until the user picks one. */
  protected readonly keyColumns = signal<Record<Side, number>>({ external: -1, internal: -1 });
  protected readonly loading = signal<Record<Side, string | null>>({
    external: null,
    internal: null,
  });
  protected readonly error = signal('');
  protected readonly result = signal<ComparisonResult | null>(null);

  protected readonly canCompare = computed(() =>
    SIDES.every(({ side }) => this.sheets()[side] && this.keyColumns()[side] >= 0),
  );

  protected readonly skippedNote = computed(() => {
    const result = this.result();
    if (!result) return '';
    return SIDES.filter(({ side }) => result[side].emptyKeyCount)
      .map(
        ({ side, fileWord }) =>
          `${result[side].emptyKeyCount} שורות בקובץ ${fileWord} בלי ערך בעמודת ההשוואה לא נכללו בהשוואה.`,
      )
      .join(' ');
  });

  protected status(side: Side): string {
    const loadingName = this.loading()[side];
    if (loadingName) return `${loadingName} - טוען...`;
    const sheet = this.sheets()[side];
    return sheet ? `${sheet.fileName} - ${sheet.rows.length} שורות` : 'לחצי כאן או גררי קובץ לכאן';
  }

  /** "B - שם" so columns can be told apart even when a header is empty. */
  protected columnLabel(header: string, index: number): string {
    let letters = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
      letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
    }
    return header ? `${letters} - ${header}` : `${letters} (ללא כותרת)`;
  }

  protected async onFile(side: Side, file: File): Promise<void> {
    this.error.set('');
    this.result.set(null);
    this.sheets.update((s) => ({ ...s, [side]: null }));
    this.keyColumns.update((k) => ({ ...k, [side]: -1 }));
    this.loading.update((l) => ({ ...l, [side]: file.name }));
    try {
      const sheet = await this.excel.readSheet(file);
      this.sheets.update((s) => ({ ...s, [side]: sheet }));
      this.keyColumns.update((k) => ({ ...k, [side]: sheet.keyColumn }));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : `לא ניתן לקרוא את הקובץ "${file.name}".`);
    } finally {
      this.loading.update((l) => ({ ...l, [side]: null }));
    }
  }

  protected onKeyColumnChange(side: Side, event: Event): void {
    this.result.set(null);
    const column = Number((event.target as HTMLSelectElement).value);
    this.keyColumns.update((k) => ({ ...k, [side]: column }));
  }

  protected compare(): void {
    const { external, internal } = this.sheets();
    const columns = this.keyColumns();
    if (!external || !internal || !this.canCompare()) return;
    this.result.set(
      compareSheets(keyRows(external, columns.external), keyRows(internal, columns.internal)),
    );
  }

  protected download(side: Side): void {
    this.export(`${SHEET_NAMES[side].replace(' ', '_')}.xlsx`, [this.exportSheet(side)]);
  }

  protected downloadAll(): void {
    this.export('תוצאות_השוואה.xlsx', [this.exportSheet('external'), this.exportSheet('internal')]);
  }

  private exportSheet(side: Side): ExportSheet {
    const result = this.result()!;
    return {
      name: SHEET_NAMES[side],
      headers: result[side].headers,
      rows: side === 'external' ? result.onlyInExternal : result.onlyInInternal,
    };
  }

  private async export(fileName: string, sheets: ExportSheet[]): Promise<void> {
    try {
      await this.excel.exportWorkbook(fileName, sheets);
    } catch {
      this.error.set('יצירת קובץ האקסל נכשלה. נסי שוב.');
    }
  }
}
