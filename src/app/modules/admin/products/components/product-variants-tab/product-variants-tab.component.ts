import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import {
  AttributeAdminResponse,
  VariantAdminResponse,
  VariantPreviewResponse,
  VariantUpsertItem,
  isApiError,
} from '../../../../../core/models';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminVariantApiService } from '../../../../../core/services/api/admin-variant-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ValueLookupEntry } from '../variant-matrix-table/variant-matrix-table.component';

@Component({
  selector: 'app-product-variants-tab',
  templateUrl: './product-variants-tab.component.html',
  styleUrl: './product-variants-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVariantsTabComponent implements OnInit {
  private readonly variantApi = inject(AdminVariantApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input({ required: true }) productId!: number;
  @Output() readonly variantsChanged = new EventEmitter<void>();

  readonly variants = signal<VariantAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly attributes = signal<AttributeAdminResponse[]>([]);
  readonly attributesError = signal(false);

  readonly valueLookup = computed<Map<number, ValueLookupEntry>>(() => {
    const ar = this.languageStore.lang() === Language.AR;
    const map = new Map<number, ValueLookupEntry>();
    for (const attr of this.attributes()) {
      for (const value of attr.values) {
        map.set(value.id, { label: ar ? value.nameAr : value.nameEn, hexColor: value.hexColor ?? null });
      }
    }
    return map;
  });

  readonly bulkSaving = signal(false);
  readonly conflictedSkus = signal<Set<string>>(new Set());

  readonly usedValueIds = computed<Set<number>>(() => {
    const set = new Set<number>();
    for (const v of this.variants()) {
      for (const id of v.attributeValueIds) {
        set.add(id);
      }
    }
    return set;
  });

  readonly generatorOpen = signal(false);
  readonly selections = signal<Record<number, number[]>>({});
  readonly previewLoading = signal(false);
  readonly preview = signal<VariantPreviewResponse | null>(null);
  readonly creating = signal(false);

  ngOnInit(): void {
    this.fetchVariants();
    this.fetchAttributes();
  }

  retry(): void {
    this.fetchVariants();
  }

  localizedName(item: { nameAr: string; nameEn: string }): string {
    return this.languageStore.lang() === Language.AR ? item.nameAr : item.nameEn;
  }

  openGenerator(): void {
    this.selections.set({});
    this.generatorOpen.set(true);
  }

  closeGenerator(): void {
    this.generatorOpen.set(false);
  }

  toggleValue(attributeId: number, valueId: number): void {
    const current = this.selections();
    const list = current[attributeId] ?? [];
    const next = list.includes(valueId) ? list.filter((id) => id !== valueId) : [...list, valueId];
    this.selections.set({ ...current, [attributeId]: next });
  }

  isValueSelected(attributeId: number, valueId: number): boolean {
    return (this.selections()[attributeId] ?? []).includes(valueId);
  }

  isValueInUse(valueId: number): boolean {
    return this.usedValueIds().has(valueId);
  }

  get hasSelection(): boolean {
    return Object.values(this.selections()).some((ids) => ids.length > 0);
  }

  requestPreview(): void {
    const selections = Object.entries(this.selections())
      .filter(([, ids]) => ids.length > 0)
      .map(([attributeId, valueIds]) => ({ attributeId: Number(attributeId), valueIds }));
    if (!selections.length) {
      this.toast.error(this.translate.instant('admin.products.form.variants.generator.noSelection'));
      return;
    }
    this.previewLoading.set(true);
    this.variantApi.preview(this.productId, { selections }).subscribe({
      next: (res) => {
        this.previewLoading.set(false);
        this.preview.set(res);
      },
      error: () => {
        this.previewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.preview.set(null);
  }

  confirmCreate(items: VariantUpsertItem[]): void {
    if (this.creating()) {
      return;
    }
    this.creating.set(true);
    this.conflictedSkus.set(new Set());
    this.variantApi.bulkUpsert(this.productId, { variants: items }).subscribe({
      next: () => {
        this.creating.set(false);
        this.preview.set(null);
        this.generatorOpen.set(false);
        this.toast.success(this.translate.instant('toast.products.variantsGenerated', { count: items.length }));
        this.fetchVariants();
        this.variantsChanged.emit();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.handleBulkError(err, items.map((i) => i.sku));
      },
    });
  }

  saveDirtyRows(items: VariantUpsertItem[]): void {
    if (this.bulkSaving()) {
      return;
    }
    this.bulkSaving.set(true);
    this.conflictedSkus.set(new Set());
    this.variantApi.bulkUpsert(this.productId, { variants: items }).subscribe({
      next: () => {
        this.bulkSaving.set(false);
        this.toast.success(this.translate.instant('toast.products.variantsSaved'));
        this.fetchVariants();
        this.variantsChanged.emit();
      },
      error: (err: unknown) => {
        this.bulkSaving.set(false);
        this.handleBulkError(err, items.map((i) => i.sku));
      },
    });
  }

  deleteVariant(variant: VariantAdminResponse): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.form.variants.deleteConfirm.title'),
        message: this.translate.instant('admin.products.form.variants.deleteConfirm.message'),
        confirmLabel: this.translate.instant('admin.products.form.variants.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.variantApi.archive(variant.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('toast.products.variantArchived'));
            this.fetchVariants();
            this.variantsChanged.emit();
          },
          error: () => {},
        });
      });
  }

  private fetchVariants(): void {
    this.loading.set(true);
    this.error.set(false);
    this.variantApi.listByProduct(this.productId).subscribe({
      next: (v) => {
        this.variants.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private fetchAttributes(): void {
    this.attributesError.set(false);
    this.taxonomyApi.listAttributes(true).subscribe({
      next: (a) => this.attributes.set(a),
      error: () => this.attributesError.set(true),
    });
  }

  private handleBulkError(err: unknown, attemptedSkus: string[]): void {
    if (err instanceof HttpErrorResponse && isApiError(err.error) && err.status === 409 && err.error.code === ErrorCode.SKU_ALREADY_EXISTS) {
      const detail = err.error.detail ?? '';
      const matched = attemptedSkus.filter((sku) => sku && detail.includes(sku));
      if (matched.length) {
        this.conflictedSkus.set(new Set(matched));
      }
    }
  }
}
