import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { DashboardStaleOrder, money } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type StatusTone = 'warn' | 'info' | 'violet' | 'blue' | 'ok' | 'stop';

const STATUS_TONE: Partial<Record<FulfillmentStatus, StatusTone>> = {
  [FulfillmentStatus.PENDING]: 'warn',
  [FulfillmentStatus.CONFIRMED]: 'info',
  [FulfillmentStatus.PROCESSING]: 'violet',
  [FulfillmentStatus.SHIPPED]: 'blue',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'blue',
  [FulfillmentStatus.DELIVERED]: 'ok',
  [FulfillmentStatus.DELIVERY_FAILED]: 'stop',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'stop',
  [FulfillmentStatus.CANCELLED]: 'stop',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'stop',
  [FulfillmentStatus.RETURNED]: 'stop',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'stop',
};

@Component({
  selector: 'app-recent-orders-widget',
  templateUrl: './recent-orders-widget.component.html',
  styleUrl: './recent-orders-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentOrdersWidgetComponent {
  @Input({ required: true }) items!: DashboardStaleOrder[];

  formattedTotal(order: DashboardStaleOrder): string {
    return MONEY_FORMATTER.format(money(order.grandTotal));
  }

  daysWaiting(order: DashboardStaleOrder): number {
    return Math.max(1, Math.round(order.hoursWaiting / 24));
  }

  statusTone(status: FulfillmentStatus): StatusTone {
    return STATUS_TONE[status] ?? 'info';
  }
}
