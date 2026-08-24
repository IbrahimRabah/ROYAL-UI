import { Pipe, PipeTransform, inject } from '@angular/core';

import { Language } from '../../core/enums/language';
import { LanguageStoreService } from '../../core/state/language-store.service';
import { FulfillmentStatus } from '../../core/enums/fulfillment-status';
import {
  FULFILLMENT_STATUS_LABELS_AR,
  FULFILLMENT_STATUS_LABELS_EN,
} from '../../core/constants/order-status.constants';

@Pipe({
  name: 'fulfillmentStatus',
  pure: false,
})
export class FulfillmentStatusPipe implements PipeTransform {
  private readonly languageStore = inject(LanguageStoreService);

  transform(value: FulfillmentStatus | string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const labels = this.languageStore.lang() === Language.AR ? FULFILLMENT_STATUS_LABELS_AR : FULFILLMENT_STATUS_LABELS_EN;
    return labels[value as FulfillmentStatus] ?? value;
  }
}
