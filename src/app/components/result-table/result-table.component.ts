import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SheetRow } from '../../core/sheet.model';

/** Large results are only partly drawn on screen; the download always has every row. */
export const MAX_VISIBLE_ROWS = 500;

@Component({
  selector: 'app-result-table',
  standalone: true,
  templateUrl: './result-table.component.html',
  styleUrl: './result-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'variant()' },
})
export class ResultTableComponent {
  readonly title = input.required<string>();
  readonly variant = input.required<'external' | 'internal'>();
  readonly headers = input.required<string[]>();
  readonly rows = input.required<SheetRow[]>();

  readonly download = output<void>();

  protected readonly visibleRows = computed(() => this.rows().slice(0, MAX_VISIBLE_ROWS));
  protected readonly hiddenCount = computed(() => this.rows().length - this.visibleRows().length);
}
