import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Language } from '../../../../../core/enums/language';
import { AdminOrderApiService } from '../../../../../core/services/api/admin-order-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const NOTE_MAX_LENGTH = 255;

@Component({
  selector: 'app-confirm-call-dialog',
  templateUrl: './confirm-call-dialog.component.html',
  styleUrl: './confirm-call-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmCallDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly orderApi = inject(AdminOrderApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input() orderId: number | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly conflict = new EventEmitter<void>();

  readonly note = signal('');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly noteMaxLength = NOTE_MAX_LENGTH;

  get open(): boolean {
    return this.orderId !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('orderId' in changes)) {
      return;
    }
    if (this.open) {
      this.note.set('');
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
    this.orderApi.confirm(this.orderId, this.note().trim() || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant('toast.orders.confirmed'));
        this.confirmed.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;
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
