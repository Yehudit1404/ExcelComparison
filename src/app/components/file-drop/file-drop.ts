import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/** A box that accepts one Excel file, by click or by drag and drop. */
@Component({
  selector: 'app-file-drop',
  templateUrl: './file-drop.html',
  styleUrl: './file-drop.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'variant()',
    '[class.loaded]': 'loaded()',
    '[class.over]': 'dragOver()',
  },
})
export class FileDrop {
  readonly label = input.required<string>();
  readonly variant = input.required<'external' | 'internal'>();
  /** Shown under the label: a hint, the file name, or "loading". */
  readonly status = input.required<string>();
  readonly loaded = input(false);

  readonly fileSelected = output<File>();

  protected readonly dragOver = signal(false);

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    // Allow choosing the same file again after it was changed on disk.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.fileSelected.emit(file);
  }
}
