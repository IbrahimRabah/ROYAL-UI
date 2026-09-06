import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { FulfillmentStatus } from '../../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../../core/enums/payment-status';
import { OrderResponse, money } from '../../../../core/models';
import { OrderApiService } from '../../../../core/services/api/order-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatOrderDate } from '../../utils/format-order-date.util';
import { fulfillmentStatusLabel, paymentStatusLabel } from '../../utils/order-status-label.util';
import { PillTone, fulfillmentPillTone, paymentPillTone } from '../../utils/order-status-pill.util';

@Component({
  selector: 'app-order-details-page',
  templateUrl: './order-details-page.component.html',
  styleUrl: './order-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly orderApi = inject(OrderApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly orderNumber = this.route.snapshot.paramMap.get('id') ?? '';

  readonly lang = this.languageStore.lang;
  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly cancelDialogOpen = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.fetch();
  }

  retry(): void {
    this.fetch();
  }

  openCancelDialog(): void {
    this.cancelDialogOpen.set(true);
  }

  onDialogClosed(): void {
    this.cancelDialogOpen.set(false);
  }

  onCancelled(order: OrderResponse): void {
    this.cancelDialogOpen.set(false);
    this.order.set(order);
    this.toast.success(this.translate.instant('toast.orders.cancelled'));
  }

  onOrderStale(): void {
    this.cancelDialogOpen.set(false);
    this.fetch();
  }

  hasCodFee(order: OrderResponse): boolean {
    return money(order.codFee) > 0;
  }

  fulfillmentLabel(status: FulfillmentStatus): string {
    return fulfillmentStatusLabel(status, this.lang());
  }

  paymentLabel(status: PaymentStatus): string {
    return paymentStatusLabel(status, this.lang());
  }

  fulfillmentTone(status: FulfillmentStatus): PillTone {
    return fulfillmentPillTone(status);
  }

  paymentTone(status: PaymentStatus): PillTone {
    return paymentPillTone(status);
  }

  formatDate(iso: string): string {
    return formatOrderDate(iso, this.lang());
  }

  private fetch(): void {
    if (!this.orderNumber) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.orderApi.getOrder(this.orderNumber).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
