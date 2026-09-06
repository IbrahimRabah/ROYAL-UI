import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { CreateRemittanceRequest, Money, OutstandingRemittanceOrder, money } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { AdminRemittanceApiService } from '../../../../../core/services/api/admin-remittance-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  maximumFractionDigits: 2,
});

type DiffState = 'equal' | 'short' | 'over';

@Component({
  selector: 'app-remittance-form-page',
  templateUrl: './remittance-form-page.component.html',
  styleUrl: './remittance-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemittanceFormPageComponent {
  private readonly router = inject(Router);
  private readonly remittanceApi = inject(AdminRemittanceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly selectedOrders =
    (this.router.getCurrentNavigation()?.extras.state?.['selectedOrders'] as OutstandingRemittanceOrder[] | undefined) ?? [];

  readonly courierName = signal('');
  readonly courierReference = signal('');
  readonly settlementDate = signal<Date | null>(new Date());
  readonly receivedAmount = signal<number | null>(null);
  readonly note = signal('');
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly noteFieldError = signal<string | null>(null);

  readonly expectedTotal = computed(() =>
    this.selectedOrders.reduce((sum, o) => sum + money(o.amount), 0),
  );

  readonly difference = computed(() => {
    const received = this.receivedAmount();
    if (received === null) {
      return 0;
    }
    return received - this.expectedTotal();
  });

  readonly diffState = computed<DiffState>(() => {
    if (this.receivedAmount() === null) {
      return 'equal';
    }
    const diff = this.difference();
    if (Math.abs(diff) < 0.005) {
      return 'equal';
    }
    return diff < 0 ? 'short' : 'over';
  });

  readonly noteRequired = computed(() => this.receivedAmount() !== null && this.diffState() !== 'equal');

  readonly canSubmit = computed(() => {
    if (this.saving() || !this.selectedOrders.length) {
      return false;
    }
    if (!this.courierName().trim() || !this.settlementDate() || this.receivedAmount() === null) {
      return false;
    }
    if (this.noteRequired() && !this.note().trim()) {
      return false;
    }
    return true;
  });

  formatAmount(value: Money | number): string {
    return NUMBER_FORMATTER.format(money(value as Money));
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.noteFieldError.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const body: CreateRemittanceRequest = {
      courierName: this.courierName().trim(),
      courierReference: this.courierReference().trim() || undefined,
      settlementDate: toIsoDate(this.settlementDate()!),
      orderIds: this.selectedOrders.map((o) => o.orderId),
      receivedAmount: this.receivedAmount()!,
      note: this.note().trim() || undefined,
    };

    this.remittanceApi.create(body).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.toast.success(this.translate.instant('toast.remittances.created'));
        this.router.navigate(['/admin/remittances', created.id]);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleAdminMutationError(err, this.toast, lang);
        if (result.message) {
          this.errorMessage.set(result.message);
        } else if (result.fieldError) {
          this.noteFieldError.set(result.fieldError);
        }
      },
    });
  }
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
