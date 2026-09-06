import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';

import { VariantCombinationPreview, VariantPreviewResponse, VariantUpsertItem } from '../../../../../core/models';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';

interface RowDetailDraft {
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  taxRate: number;
  weightGrams: number | null;
  initialStock: number;
  minStockLevel: number;
}

const DEFAULT_ROW: RowDetailDraft = {
  price: null,
  compareAtPrice: null,
  costPrice: null,
  taxRate: 0.14,
  weightGrams: null,
  initialStock: 0,
  minStockLevel: 0,
};

@Component({
  selector: 'app-variant-preview-dialog',
  templateUrl: './variant-preview-dialog.component.html',
  styleUrl: './variant-preview-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariantPreviewDialogComponent extends DialogPortalBase implements OnChanges {
  @Input() preview: VariantPreviewResponse | null = null;
  @Input() creating = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly create = new EventEmitter<VariantUpsertItem[]>();

  readonly step = signal<'preview' | 'details'>('preview');
  readonly skuDrafts = signal<Record<number, string>>({});
  readonly rowDrafts = signal<Record<number, RowDetailDraft>>({});
  readonly bulkFill = signal<RowDetailDraft>({ ...DEFAULT_ROW });

  get open(): boolean {
    return this.preview !== null;
  }

  get creatableIndexes(): number[] {
    return (this.preview?.combinations ?? [])
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.alreadyExists)
      .map(({ i }) => i);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('preview' in changes)) {
      return;
    }
    if (this.preview) {
      this.step.set('preview');
      const skus: Record<number, string> = {};
      const rows: Record<number, RowDetailDraft> = {};
      this.preview.combinations.forEach((combo, i) => {
        if (!combo.alreadyExists) {
          skus[i] = combo.suggestedSku;
          rows[i] = { ...DEFAULT_ROW };
        }
      });
      this.skuDrafts.set(skus);
      this.rowDrafts.set(rows);
      this.bulkFill.set({ ...DEFAULT_ROW });
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.creating) {
      return;
    }
    this.closed.emit();
  }

  updateSku(index: number, value: string): void {
    this.skuDrafts.update((all) => ({ ...all, [index]: value }));
  }

  rowDraft(index: number): RowDetailDraft {
    return this.rowDrafts()[index] ?? { ...DEFAULT_ROW };
  }

  updateRow(index: number, patch: Partial<RowDetailDraft>): void {
    this.rowDrafts.update((all) => ({ ...all, [index]: { ...this.rowDraft(index), ...patch } }));
  }

  updateBulkFill(patch: Partial<RowDetailDraft>): void {
    this.bulkFill.update((v) => ({ ...v, ...patch }));
  }

  applyBulkFill(): void {
    const fill = this.bulkFill();
    const next: Record<number, RowDetailDraft> = {};
    for (const i of this.creatableIndexes) {
      next[i] = { ...fill };
    }
    this.rowDrafts.set(next);
  }

  goToDetails(): void {
    if (!this.creatableIndexes.length) {
      return;
    }
    this.step.set('details');
  }

  backToPreview(): void {
    this.step.set('preview');
  }

  isRowInvalid(index: number): boolean {
    const draft = this.rowDraft(index);
    return draft.price === null || draft.price < 0;
  }

  get allRowsValid(): boolean {
    return this.creatableIndexes.every((i) => !this.isRowInvalid(i));
  }

  comboAt(index: number): VariantCombinationPreview | undefined {
    return this.preview?.combinations[index];
  }

  submitCreate(): void {
    if (this.creating || !this.allRowsValid) {
      return;
    }
    const items: VariantUpsertItem[] = this.creatableIndexes.map((i) => {
      const combo = this.comboAt(i)!;
      const draft = this.rowDraft(i);
      return {
        id: null,
        sku: (this.skuDrafts()[i] || combo.suggestedSku).trim(),
        price: draft.price!,
        compareAtPrice: draft.compareAtPrice,
        costPrice: draft.costPrice,
        taxRate: draft.taxRate,
        weightGrams: draft.weightGrams,
        attributeValueIds: combo.attributeValueIds,
        initialStock: draft.initialStock,
        minStockLevel: draft.minStockLevel,
      };
    });
    this.create.emit(items);
  }
}
