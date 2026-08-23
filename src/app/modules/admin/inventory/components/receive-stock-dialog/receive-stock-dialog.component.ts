import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReceiveStockRequest, StockPositionResponse } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminInventoryApiService } from '../../../../../core/services/api/admin-inventory-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleInventoryMutationError } from '../../../../../shared/utils/inventory-mutation-error.util';

@Component({
  selector: 'app-receive-stock-dialog',
  templateUrl: './receive-stock-dialog.component.html',
  styleUrl: './receive-stock-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiveStockDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly inventoryApi = inject(AdminInventoryApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input() variantId: number | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  // 409 CONCURRENT_STOCK_CHANGE after the interceptor's own retry also failed — already
  // toasted by the interceptor; parent just needs to close this dialog and refetch the row.
  @Output() readonly conflict = new EventEmitter<void>();

  readonly position = signal<StockPositionResponse | null>(null);
  readonly loadingPosition = signal(false);
  readonly quantity = signal<number | null>(null);
  readonly reference = signal('');
  readonly note = signal('');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get open(): boolean {
    return this.variantId !== null;
  }

  get onHandAfter(): number {
    return (this.position()?.qtyOnHand ?? 0) + (this.quantity() ?? 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('variantId' in changes)) {
      return;
    }
    if (this.open) {
      this.position.set(null);
      this.quantity.set(null);
      this.reference.set('');
      this.note.set('');
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

  submit(): void {
    const variantId = this.variantId;
    const quantity = this.quantity();
    // Receiving is only ever an increase — a zero or negative quantity has no meaning
    // here (the operator uses Adjust to reduce stock).
    if (this.saving() || variantId === null || quantity === null || quantity <= 0) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const body: ReceiveStockRequest = {
      quantity,
      reference: this.reference().trim() || undefined,
      note: this.note().trim() || undefined,
    };

    this.inventoryApi.receive(variantId, body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(
          this.translate.instant('toast.inventory.received', { sku: res.sku, available: res.qtyAvailable }),
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
