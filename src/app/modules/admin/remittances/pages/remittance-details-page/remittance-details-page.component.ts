import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { Money, RemittanceResponse, money } from '../../../../../core/models';
import { RemittanceStatus } from '../../../../../core/enums/remittance-status';
import { Language } from '../../../../../core/enums/language';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import {
  REMITTANCE_STATUS_LABELS_AR,
  REMITTANCE_STATUS_LABELS_EN,
  REMITTANCE_STATUS_TONE,
} from '../../../../../core/constants/remittance-status.constants';
import { AdminRemittanceApiService } from '../../../../../core/services/api/admin-remittance-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const REASON_MAX_LENGTH = 255;

@Component({
  selector: 'app-remittance-details-page',
  templateUrl: './remittance-details-page.component.html',
  styleUrl: './remittance-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemittanceDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly remittanceApi = inject(AdminRemittanceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly remittanceId = Number(this.route.snapshot.paramMap.get('id'));
  readonly RemittanceStatus = RemittanceStatus;
  readonly reasonMaxLength = REASON_MAX_LENGTH;

  readonly remittance = signal<RemittanceResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly cancelDialogOpen = signal(false);
  readonly cancelReason = signal('');
  readonly cancelling = signal(false);
  readonly cancelError = signal<string | null>(null);

  get canSubmitCancel(): boolean {
    return this.cancelReason().trim().length > 0;
  }

  constructor() {
    this.fetch();
  }

  statusLabel(status: RemittanceStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? REMITTANCE_STATUS_LABELS_AR : REMITTANCE_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: RemittanceStatus): StatusTone {
    return REMITTANCE_STATUS_TONE[status];
  }

  formatAmount(value: Money): string {
    return NUMBER_FORMATTER.format(money(value));
  }

  diffClass(rem: RemittanceResponse): string {
    const diff = money(rem.difference);
    if (Math.abs(diff) < 0.005) return 'rdp__diff--ok';
    return diff < 0 ? 'rdp__diff--stop' : 'rdp__diff--warn';
  }

  diffSign(rem: RemittanceResponse): string {
    return money(rem.difference) > 0 ? '+' : '';
  }

  retry(): void {
    this.fetch();
  }

  openCancelDialog(): void {
    this.cancelReason.set('');
    this.cancelError.set(null);
    this.cancelDialogOpen.set(true);
  }

  closeCancelDialog(): void {
    if (this.cancelling()) {
      return;
    }
    this.cancelDialogOpen.set(false);
  }

  submitCancel(): void {
    if (this.cancelling() || !this.canSubmitCancel) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.remittanceApi.cancel(this.remittanceId, this.cancelReason().trim()).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelDialogOpen.set(false);
        this.toast.success(this.translate.instant('toast.remittances.cancelled'));
        this.fetch();
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        const result = handleAdminMutationError(err, this.toast, lang);
        this.cancelError.set(result.message ?? result.fieldError);
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.remittanceApi.get(this.remittanceId).subscribe({
      next: (rem) => {
        this.remittance.set(rem);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
