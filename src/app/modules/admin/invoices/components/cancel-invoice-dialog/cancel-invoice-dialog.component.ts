import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';

import { Language } from '../../../../../core/enums/language';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const REASON_MAX_LENGTH = 255;

@Component({
  selector: 'app-cancel-invoice-dialog',
  templateUrl: './cancel-invoice-dialog.component.html',
  styleUrl: './cancel-invoice-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CancelInvoiceDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);

  @Input() invoiceId: number | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly reason = signal('');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly reasonMaxLength = REASON_MAX_LENGTH;

  get open(): boolean {
    return this.invoiceId !== null;
  }

  get canSubmit(): boolean {
    return this.reason().trim().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('invoiceId' in changes)) {
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
    if (this.saving() || this.invoiceId === null || !this.canSubmit) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.invoiceApi.cancel(this.invoiceId, { reason: this.reason().trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelled.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleAdminMutationError(err, this.toast, lang);
        this.errorMessage.set(result.message ?? result.fieldError);
      },
    });
  }
}
