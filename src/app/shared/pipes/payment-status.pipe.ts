import { Pipe, PipeTransform, inject } from '@angular/core';

import { Language } from '../../core/enums/language';
import { LanguageStoreService } from '../../core/state/language-store.service';
import { PaymentStatus } from '../../core/enums/payment-status';
import {
  PAYMENT_STATUS_LABELS_AR,
  PAYMENT_STATUS_LABELS_EN,
} from '../../core/constants/order-status.constants';

@Pipe({
  name: 'paymentStatus',
  pure: false,
})
export class PaymentStatusPipe implements PipeTransform {
  private readonly languageStore = inject(LanguageStoreService);

  transform(value: PaymentStatus | string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const labels = this.languageStore.lang() === Language.AR ? PAYMENT_STATUS_LABELS_AR : PAYMENT_STATUS_LABELS_EN;
    return labels[value as PaymentStatus] ?? value;
  }
}
