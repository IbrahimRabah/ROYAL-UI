import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// The visual weight of the customer detail screen — under cash on delivery, a customer
// who has refused delivery twice costs real money on the third attempt, so this must read
// as impossible to miss, not one figure among eight (see purchases.failedOrders).
@Component({
  selector: 'app-failed-orders-warning',
  templateUrl: './failed-orders-warning.component.html',
  styleUrl: './failed-orders-warning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FailedOrdersWarningComponent {
  @Input({ required: true }) count!: number;
}
