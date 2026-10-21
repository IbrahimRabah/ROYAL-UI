import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { ErrorCode } from '../../../../../core/enums/error-code';
import { isApiError } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { AdminOrderApiService } from '../../../../../core/services/api/admin-order-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const REASON_MAX_LENGTH = 255;

function isCancelConflict(err: unknown): boolean {
  return (
    err instanceof HttpErrorResponse &&
    err.status === 409 &&
    isApiError(err.error) &&
    (err.error.code === ErrorCode.ORDER_CANNOT_BE_CANCELLED || err.error.code === ErrorCode.INVALID_STATUS_TRANSITION)
  );
}

@Component({
  selector: 'app-admin-cancel-dialog',
  templateUrl: './admin-cancel-dialog.component.html',
  styleUrl: './admin-cancel-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCancelDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly orderApi = inject(AdminOrderApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input() orderId: number | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly conflict = new EventEmitter<void>();

  readonly reason = signal('');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly reasonMaxLength = REASON_MAX_LENGTH;

  get open(): boolean {
    return this.orderId !== null;
  }

  get canSubmit(): boolean {
    return this.reason().trim().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('orderId' in changes)) {
      return;
    }
    if (this.open) {
      this.reason.set('');
      this.saving.set(false);
      this.errorMessage.set(null);
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
    if (this.saving() || this.orderId === null || !this.canSubmit) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.orderApi.cancel(this.orderId, { reason: this.reason().trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant('toast.orders.cancelled'));
        this.cancelled.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (isCancelConflict(err)) {
          this.errorMessage.set(this.translate.instant('admin.orders.cancelDialog.cannotCancel'));
          this.conflict.emit();
          return;
        }
        const result = handleAdminMutationError(err, this.toast, lang);
        if (result.isConflict) {
          this.errorMessage.set(result.message);
          this.conflict.emit();
        } else if (result.fieldError) {
          this.errorMessage.set(result.fieldError);
        }
      },
    });
  }
}
