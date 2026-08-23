import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';

import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

// Flat, editor-friendly shape — attribute-form-page converts to/from
// AttributeValueUpsertItem.translations[] at its own boundary (on load and on save).
export interface AttributeValueRow {
  id: number | null;
  code: string;
  hexColor: string | null;
  nameAr: string;
  nameEn: string;
}

let nextDraftId = -1;

@Component({
  selector: 'app-attribute-values-editor',
  templateUrl: './attribute-values-editor.component.html',
  styleUrl: './attribute-values-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeValuesEditorComponent {
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  // The CRITICAL RULE: PUT /admin/attributes/{id} replaces the entire value set — this
  // component owns the complete draft list (every existing value, loaded once by the
  // parent, never trimmed to "just what changed"), and always emits the complete list
  // back, including untouched rows. Same trap as product translations/specifications.
  @Input({ required: true }) rows: AttributeValueRow[] = [];
  @Output() readonly rowsChange = new EventEmitter<AttributeValueRow[]>();

  // p-colorPicker requires a valid hex to render its swatch — falls back to this when a
  // row has no colour yet (non-colour attributes never set one) without writing a value
  // into the row itself; only actually picking a colour does that.
  readonly defaultSwatchColor = '#cccccc';

  // Every row's id is unique regardless of origin — real (positive) ids come from the
  // server, new rows get a unique negative draft id at creation (see nextDraftId), so
  // NgForOf keeps the right DOM node per row across reorders without needing index-based
  // identity (which would misattribute focus/input state after a drag or an up/down move).
  trackByRow(_index: number, row: AttributeValueRow): number {
    return row.id!;
  }

  addRow(): void {
    this.emit([...this.rows, { id: nextDraftId--, code: '', hexColor: null, nameAr: '', nameEn: '' }]);
  }

  removeRow(index: number): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.attributes.valuesEditor.removeConfirm.title'),
        message: this.translate.instant('admin.attributes.valuesEditor.removeConfirm.message'),
        confirmLabel: this.translate.instant('admin.attributes.valuesEditor.removeConfirm.confirm'),
        cancelLabel: this.translate.instant('admin.attributes.valuesEditor.removeConfirm.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.emit(this.rows.filter((_, i) => i !== index));
      });
  }

  updateRow(index: number, patch: Partial<AttributeValueRow>): void {
    this.emit(this.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // Keeps the colour picker (always #rrggbb) and the free-typed hex field in sync without
  // fighting each other — a partial/invalid typed value is kept as-is (not coerced) until
  // it either becomes valid or the picker is used directly.
  updateHexFromPicker(index: number, value: string): void {
    this.updateRow(index, { hexColor: value || null });
  }

  updateHexFromText(index: number, value: string): void {
    this.updateRow(index, { hexColor: value.trim() || null });
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const next = [...this.rows];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    this.emit(next);
  }

  moveDown(index: number): void {
    if (index >= this.rows.length - 1) return;
    const next = [...this.rows];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    this.emit(next);
  }

  onDrop(event: CdkDragDrop<AttributeValueRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = [...this.rows];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.emit(next);
  }

  private emit(rows: AttributeValueRow[]): void {
    this.rows = rows;
    this.rowsChange.emit(rows);
  }
}
