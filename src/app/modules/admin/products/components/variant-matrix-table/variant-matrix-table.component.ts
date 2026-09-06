import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';

import { VariantAdminResponse, VariantUpsertItem, money } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { PRODUCT_STATUS_LABELS_AR, PRODUCT_STATUS_LABELS_EN, PRODUCT_STATUS_TONE } from '../../../../../core/constants/product-status.constants';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

export interface ValueLookupEntry {
  label: string;
  hexColor: string | null;
}

interface VariantRowDraft {
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  taxRate: number;
  weightGrams: number | null;
  minStockLevel: number;
}

@Component({
  selector: 'app-variant-matrix-table',
  templateUrl: './variant-matrix-table.component.html',
  styleUrl: './variant-matrix-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariantMatrixTableComponent implements OnChanges {
  private readonly languageStore = inject(LanguageStoreService);

  @Input() variants: VariantAdminResponse[] = [];
  @Input() valueLookup: Map<number, ValueLookupEntry> = new Map();
  @Input() saving = false;
  @Input() conflictedSkus: Set<string> = new Set();

  @Output() readonly save = new EventEmitter<VariantUpsertItem[]>();
  @Output() readonly delete = new EventEmitter<VariantAdminResponse>();

  private readonly drafts = signal<Record<number, VariantRowDraft>>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (!('variants' in changes)) {
      return;
    }
    const next: Record<number, VariantRowDraft> = {};
    for (const v of this.variants) {
      next[v.id] = this.snapshotOf(v);
    }
    this.drafts.set(next);
  }

  draft(variantId: number): VariantRowDraft {
    return this.drafts()[variantId] ?? { price: 0, compareAtPrice: null, costPrice: null, taxRate: 0, weightGrams: null, minStockLevel: 0 };
  }

  updateDraft(variantId: number, patch: Partial<VariantRowDraft>): void {
    this.drafts.update((all) => ({ ...all, [variantId]: { ...this.draft(variantId), ...patch } }));
  }

  isDirty(variant: VariantAdminResponse): boolean {
    const draft = this.drafts()[variant.id];
    if (!draft) {
      return false;
    }
    const original = this.snapshotOf(variant);
    return (
      draft.price !== original.price ||
      draft.compareAtPrice !== original.compareAtPrice ||
      draft.costPrice !== original.costPrice ||
      draft.taxRate !== original.taxRate ||
      draft.weightGrams !== original.weightGrams ||
      draft.minStockLevel !== original.minStockLevel
    );
  }

  get hasDirtyRows(): boolean {
    return this.variants.some((v) => this.isDirty(v));
  }

  valueBadges(variant: VariantAdminResponse): ValueLookupEntry[] {
    return variant.attributeValueIds
      .map((id) => this.valueLookup.get(id))
      .filter((v): v is ValueLookupEntry => !!v);
  }

  statusLabel(variant: VariantAdminResponse): string {
    const labels = this.languageStore.lang() === Language.AR ? PRODUCT_STATUS_LABELS_AR : PRODUCT_STATUS_LABELS_EN;
    return labels[variant.status];
  }

  statusTone(variant: VariantAdminResponse): StatusTone {
    return PRODUCT_STATUS_TONE[variant.status];
  }

  availableTone(variant: VariantAdminResponse): 'stop' | 'warn' | null {
    if (variant.qtyAvailable === 0) {
      return 'stop';
    }
    if (variant.qtyAvailable <= variant.minStockLevel) {
      return 'warn';
    }
    return null;
  }

  isConflicted(variant: VariantAdminResponse): boolean {
    return this.conflictedSkus.has(variant.sku);
  }

  submitSave(): void {
    if (this.saving) {
      return;
    }
    const items: VariantUpsertItem[] = this.variants
      .filter((v) => this.isDirty(v))
      .map((v) => {
        const d = this.draft(v.id);
        return {
          id: v.id,
          sku: v.sku,
          barcode: v.barcode ?? null,
          price: d.price,
          compareAtPrice: d.compareAtPrice,
          costPrice: d.costPrice,
          taxRate: d.taxRate,
          weightGrams: d.weightGrams,
          attributeValueIds: v.attributeValueIds,
          minStockLevel: d.minStockLevel,
        };
      });
    if (items.length) {
      this.save.emit(items);
    }
  }

  confirmDelete(variant: VariantAdminResponse): void {
    this.delete.emit(variant);
  }

  private snapshotOf(v: VariantAdminResponse): VariantRowDraft {
    return {
      price: money(v.price),
      compareAtPrice: v.compareAtPrice != null ? money(v.compareAtPrice) : null,
      costPrice: v.costPrice != null ? money(v.costPrice) : null,
      taxRate: v.taxRate,
      weightGrams: v.weightGrams ?? null,
      minStockLevel: v.minStockLevel,
    };
  }
}
