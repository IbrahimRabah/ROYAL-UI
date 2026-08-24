import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CustomerRecentOrder } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../../../core/enums/payment-status';
import {
  FULFILLMENT_STATUS_TONE,
  PAYMENT_STATUS_TONE,
  StatusTone,
} from '../../../../../core/constants/order-status.constants';

@Component({
  selector: 'app-customer-orders-tab',
  templateUrl: './customer-orders-tab.component.html',
  styleUrl: './customer-orders-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerOrdersTabComponent {
  @Input({ required: true }) orders: CustomerRecentOrder[] = [];

  fulfillmentTone(status: FulfillmentStatus): StatusTone {
    return FULFILLMENT_STATUS_TONE[status];
  }

  paymentTone(status: PaymentStatus): StatusTone {
    return PAYMENT_STATUS_TONE[status];
  }
}
