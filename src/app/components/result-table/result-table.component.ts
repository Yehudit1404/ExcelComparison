import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  signal,
} from '@angular/core';
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

  @Output() readonly download = new EventEmitter<void>();

  /** The table starts closed and opens when the title is clicked. */
  protected readonly expanded = signal(false);

  protected readonly visibleRows = computed(() => this.rows().slice(0, MAX_VISIBLE_ROWS));
  protected readonly hiddenCount = computed(() => this.rows().length - this.visibleRows().length);
}
