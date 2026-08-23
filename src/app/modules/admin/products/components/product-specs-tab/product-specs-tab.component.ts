import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';

import { AttributeAdminResponse, ProductSpecificationInput } from '../../../../../core/models';
import { AttributeDataType } from '../../../../../core/enums/attribute-data-type';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';

// A row with neither a selected value nor typed text is meaningless to save — it would
// send { attributeId, attributeValueId: null, valueText: null } and just occupy a slot.
// Exported so product-form-page can block its single Save action on the same rule.
export function isSpecRowIncomplete(row: ProductSpecificationInput): boolean {
  return row.attributeValueId == null && !row.valueText?.trim();
}

@Component({
  selector: 'app-product-specs-tab',
  templateUrl: './product-specs-tab.component.html',
  styleUrl: './product-specs-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSpecsTabComponent implements OnInit {
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);

  // Specifications ride the same full-replace product PUT as translations/category/etc —
  // there's no dedicated specs endpoint, and this tab no longer has its own Save button
  // (see product-form-page: the one "Save" action reads the draft back out via
  // rowsChange and sends it in the same PUT as everything else). This tab is purely a
  // draft editor: seed once from the product's saved specifications on ngOnInit, then
  // every local edit both updates the internal signal and emits upward so the parent
  // always has the current draft ready to send.
  @Input({ required: true, alias: 'rows' }) initialRows: ProductSpecificationInput[] = [];
  @Output() readonly rowsChange = new EventEmitter<ProductSpecificationInput[]>();

  readonly specAttributes = signal<AttributeAdminResponse[]>([]);
  readonly attributesError = signal(false);
  readonly loading = signal(true);

  readonly rows = signal<ProductSpecificationInput[]>([]);
  readonly pendingAttributeId = signal<number | null>(null);

  readonly availableAttributes = computed(() =>
    this.specAttributes().filter((a) => !this.rows().some((r) => r.attributeId === a.id)),
  );

  readonly hasIncompleteRow = computed(() => this.rows().some(isSpecRowIncomplete));

  readonly AttributeDataType = AttributeDataType;

  ngOnInit(): void {
    this.rows.set(this.initialRows);

    this.loading.set(true);
    this.attributesError.set(false);
    this.taxonomyApi.listAttributes(false).subscribe({
      next: (attrs) => {
        this.specAttributes.set(attrs);
        this.loading.set(false);
      },
      error: () => {
        this.attributesError.set(true);
        this.loading.set(false);
      },
    });
  }

  localizedName(item: { nameAr: string; nameEn: string }): string {
    return this.languageStore.lang() === Language.AR ? item.nameAr : item.nameEn;
  }

  attributeFor(row: ProductSpecificationInput): AttributeAdminResponse | undefined {
    return this.specAttributes().find((a) => a.id === row.attributeId);
  }

  isRowIncomplete(row: ProductSpecificationInput): boolean {
    return isSpecRowIncomplete(row);
  }

  // Without this, NgForOf's default identity-based tracking sees a *different* object on
  // every keystroke (updateRowText/updateRowValueId replace the row via .map(), which is
  // correct for signal immutability but changes the object reference) and destroys +
  // recreates that row's DOM — including the focused <input> — after every character.
  // attributeId is stable for a row's whole lifetime, so keying on it keeps the same DOM
  // node across edits and only its bindings update.
  trackByAttributeId(_index: number, row: ProductSpecificationInput): number {
    return row.attributeId;
  }

  addRow(): void {
    const attributeId = this.pendingAttributeId();
    if (attributeId == null) {
      return;
    }
    this.emit([...this.rows(), { attributeId, attributeValueId: null, valueText: null }]);
    this.pendingAttributeId.set(null);
  }

  removeRow(index: number): void {
    this.emit(this.rows().filter((_, i) => i !== index));
  }

  updateRowValueId(index: number, attributeValueId: number | null): void {
    this.emit(this.rows().map((r, i) => (i === index ? { ...r, attributeValueId, valueText: null } : r)));
  }

  updateRowText(index: number, valueText: string): void {
    this.emit(this.rows().map((r, i) => (i === index ? { ...r, valueText: valueText || null, attributeValueId: null } : r)));
  }

  private emit(list: ProductSpecificationInput[]): void {
    this.rows.set(list);
    this.rowsChange.emit(list);
  }
}
