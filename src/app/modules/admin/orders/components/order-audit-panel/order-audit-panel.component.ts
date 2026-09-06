import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { OrderTimelineEntry } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../../../core/enums/payment-status';
import {
  FULFILLMENT_STATUS_LABELS_AR,
  FULFILLMENT_STATUS_LABELS_EN,
  FULFILLMENT_STATUS_TONE,
  PAYMENT_STATUS_LABELS_AR,
  PAYMENT_STATUS_LABELS_EN,
  PAYMENT_STATUS_TONE,
  StatusTone,
} from '../../../../../core/constants/order-status.constants';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US-u-nu-latn', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

@Component({
  selector: 'app-order-audit-panel',
  templateUrl: './order-audit-panel.component.html',
  styleUrl: './order-audit-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderAuditPanelComponent {
  private readonly languageStore = inject(LanguageStoreService);

  @Input({ required: true }) timeline!: OrderTimelineEntry[];

  formattedAt(iso: string): string {
    return TIME_FORMATTER.format(new Date(iso));
  }

  entryLabel(to: string): string {
    const isAr = this.languageStore.lang() === Language.AR;
    if (to in FULFILLMENT_STATUS_TONE) {
      return (isAr ? FULFILLMENT_STATUS_LABELS_AR : FULFILLMENT_STATUS_LABELS_EN)[to as FulfillmentStatus];
    }
    if (to in PAYMENT_STATUS_TONE) {
      return (isAr ? PAYMENT_STATUS_LABELS_AR : PAYMENT_STATUS_LABELS_EN)[to as PaymentStatus];
    }
    return to;
  }

  entryTone(to: string): StatusTone {
    if (to in FULFILLMENT_STATUS_TONE) {
      return FULFILLMENT_STATUS_TONE[to as FulfillmentStatus];
    }
    if (to in PAYMENT_STATUS_TONE) {
      return PAYMENT_STATUS_TONE[to as PaymentStatus];
    }
    return 'info';
  }
}
