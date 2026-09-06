import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { OrderResponse, money } from '../../../../core/models';
import { OrderApiService } from '../../../../core/services/api/order-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStoreService } from '../../../../core/state/auth-store.service';

@Component({
  selector: 'app-order-confirmation-page',
  templateUrl: './order-confirmation-page.component.html',
  styleUrl: './order-confirmation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmationPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderApi = inject(OrderApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly authStore = inject(AuthStoreService);

  readonly orderNumber = this.route.snapshot.paramMap.get('orderNumber') ?? '';
  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly unavailable = signal(false);

  constructor() {
    const navigatedOrder = (this.router.getCurrentNavigation()?.extras.state?.['order'] as OrderResponse | undefined) ?? null;

    if (navigatedOrder) {
      this.order.set(navigatedOrder);
      return;
    }

    if (!isPlatformBrowser(this.platformId) || !this.authStore.isLoggedIn() || !this.orderNumber) {
      this.unavailable.set(!!this.orderNumber && !this.authStore.isLoggedIn());
      return;
    }

    this.loading.set(true);
    this.orderApi.getOrder(this.orderNumber).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.unavailable.set(true);
      },
    });
  }

  hasCodFee(order: OrderResponse): boolean {
    return money(order.codFee) > 0;
  }

  copyOrderNumber(): void {
    if (!isPlatformBrowser(this.platformId) || !this.orderNumber) {
      return;
    }
    navigator.clipboard.writeText(this.orderNumber).then(() => {
      this.toast.success(this.translate.instant('toast.checkout.orderNumberCopied'));
    });
  }
}
