import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FileDrop } from './components/file-drop/file-drop';
import { ResultTable } from './components/result-table/result-table';
import { compareSheets } from './core/compare';
import { ExcelService, ExportSheet } from './core/excel.service';
import { ComparisonResult, SheetData } from './core/sheet.model';

type Side = 'external' | 'internal';

const SHEET_NAMES: Record<Side, string> = {
  external: 'רק בחיצוני',
  internal: 'רק בפנימי',
};

@Component({
  selector: 'app-root',
  imports: [FileDrop, ResultTable],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly excel = inject(ExcelService);

  protected readonly sheets = signal<Record<Side, SheetData | null>>({
    external: null,
    internal: null,
  });
  protected readonly loading = signal<Record<Side, string | null>>({
    external: null,
    internal: null,
  });
  protected readonly error = signal('');
  protected readonly result = signal<ComparisonResult | null>(null);

  protected readonly canCompare = computed(
    () => !!this.sheets().external && !!this.sheets().internal,
  );

  protected readonly skippedNote = computed(() => {
    const { external, internal } = this.sheets();
    const notes: string[] = [];
    if (external?.emptyKeyCount) {
      notes.push(`${external.emptyKeyCount} שורות בקובץ החיצוני בלי מספר פריט לא נכללו בהשוואה.`);
    }
    if (internal?.emptyKeyCount) {
      notes.push(`${internal.emptyKeyCount} שורות בקובץ הפנימי בלי מספר פריט לא נכללו בהשוואה.`);
    }
    return notes.join(' ');
  });

  protected status(side: Side): string {
    const loadingName = this.loading()[side];
    if (loadingName) return `${loadingName} - טוען...`;
    const sheet = this.sheets()[side];
    return sheet ? `${sheet.fileName} - ${sheet.rows.length} שורות` : 'לחצי כאן או גררי קובץ לכאן';
  }

  protected async onFile(side: Side, file: File): Promise<void> {
    this.error.set('');
    this.result.set(null);
    this.sheets.update((s) => ({ ...s, [side]: null }));
    this.loading.update((l) => ({ ...l, [side]: file.name }));
    try {
      const sheet = await this.excel.readSheet(file);
      this.sheets.update((s) => ({ ...s, [side]: sheet }));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : `לא ניתן לקרוא את הקובץ "${file.name}".`);
    } finally {
      this.loading.update((l) => ({ ...l, [side]: null }));
    }
  }

  protected compare(): void {
    const { external, internal } = this.sheets();
    if (external && internal) this.result.set(compareSheets(external, internal));
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
      headers: this.sheets()[side]!.headers,
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
