import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { AdjustStockRequest, StockPositionResponse } from '../../../../../core/models';
import { StockMovement, MANUAL_MOVEMENT_TYPES, movementTypeLabelKey } from '../../../../../core/enums/stock-movement';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminInventoryApiService } from '../../../../../core/services/api/admin-inventory-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleInventoryMutationError } from '../../../../../shared/utils/inventory-mutation-error.util';

interface ReasonChip {
  labelKey: string;
  textAr: string;
  textEn: string;
}
const REASON_CHIPS: ReasonChip[] = [
  { labelKey: 'admin.inventory.adjustDialog.reasonChips.stocktake', textAr: 'تصحيح جرد', textEn: 'Stocktake correction' },
  { labelKey: 'admin.inventory.adjustDialog.reasonChips.damaged', textAr: 'بضاعة تالفة', textEn: 'Damaged goods' },
  { labelKey: 'admin.inventory.adjustDialog.reasonChips.shortage', textAr: 'نقص من المورّد', textEn: 'Supplier shortage' },
  { labelKey: 'admin.inventory.adjustDialog.reasonChips.found', textAr: 'وُجدت في المخزن', textEn: 'Found in warehouse' },
];

@Component({
  selector: 'app-adjust-stock-dialog',
  templateUrl: './adjust-stock-dialog.component.html',
  styleUrl: './adjust-stock-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdjustStockDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly inventoryApi = inject(AdminInventoryApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input() variantId: number | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly conflict = new EventEmitter<void>();

  readonly reasonChips = REASON_CHIPS;
  readonly movementTypeOptions = MANUAL_MOVEMENT_TYPES.map((type) => ({ type, labelKey: movementTypeLabelKey(type) }));

  readonly position = signal<StockPositionResponse | null>(null);
  readonly loadingPosition = signal(false);
  readonly quantityDelta = signal<number | null>(null);
  readonly reason = signal('');
  readonly movementType = signal<StockMovement | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get open(): boolean {
    return this.variantId !== null;
  }

  get onHandAfter(): number {
    return (this.position()?.qtyOnHand ?? 0) + (this.quantityDelta() ?? 0);
  }

  get willGoBelowSafe(): boolean {
    const p = this.position();
    if (!p || this.quantityDelta() === null) {
      return false;
    }
    return this.onHandAfter < 0 || this.onHandAfter < p.qtyReserved;
  }

  get canSubmit(): boolean {
    return this.quantityDelta() !== null && this.quantityDelta() !== 0 && this.reason().trim().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('variantId' in changes)) {
      return;
    }
    if (this.open) {
      this.position.set(null);
      this.quantityDelta.set(null);
      this.reason.set('');
      this.movementType.set(null);
      this.saving.set(false);
      this.errorMessage.set(null);
      this.fetchPosition();
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  applyReasonChip(chip: ReasonChip): void {
    const text = this.languageStore.lang() === Language.AR ? chip.textAr : chip.textEn;
    this.reason.set(text);
  }

  submit(): void {
    const variantId = this.variantId;
    const quantityDelta = this.quantityDelta();
    if (this.saving() || variantId === null || !this.canSubmit || quantityDelta === null) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const body: AdjustStockRequest = {
      quantityDelta,
      reason: this.reason().trim(),
      movementType: this.movementType() ?? undefined,
    };

    this.inventoryApi.adjust(variantId, body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(
          this.translate.instant('toast.inventory.adjusted', { sku: res.sku, available: res.qtyAvailable }),
        );
        this.saved.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleInventoryMutationError(err, this.toast, lang);
        if (result.staleConflict) {
          this.conflict.emit();
        } else if (result.inlineMessage) {
          this.errorMessage.set(result.inlineMessage);
        }
      },
    });
  }

  private fetchPosition(): void {
    const variantId = this.variantId;
    if (variantId === null) {
      return;
    }
    this.loadingPosition.set(true);
    this.inventoryApi.getPosition(variantId).subscribe({
      next: (pos) => {
        this.position.set(pos);
        this.loadingPosition.set(false);
      },
      error: () => this.loadingPosition.set(false),
    });
  }
}
