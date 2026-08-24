import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';

import { Language } from '../../../../../core/enums/language';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

@Component({
  selector: 'app-issue-invoice-dialog',
  templateUrl: './issue-invoice-dialog.component.html',
  styleUrl: './issue-invoice-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueInvoiceDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);

  @Input() orderId: number | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly issued = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get open(): boolean {
    return this.orderId !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('orderId' in changes)) {
      return;
    }
    if (this.open) {
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
    if (this.saving() || this.orderId === null) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.invoiceApi.issue(this.orderId).subscribe({
      next: () => {
        this.saving.set(false);
        this.issued.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleAdminMutationError(err, this.toast, lang);
        this.errorMessage.set(result.message ?? result.fieldError);
      },
    });
  }
}
