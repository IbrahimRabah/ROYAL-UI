import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { APP_CONFIG } from '../../../../core/constants/app-config';
import { hasAmount } from '../../../../core/models';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { CartStoreService } from '../../../../core/state/cart-store.service';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrl: './cart-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartSummaryComponent {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  readonly cartStore = inject(CartStoreService);
  readonly contact = APP_CONFIG.contact;

  get hasDiscount(): boolean {
    return hasAmount(this.cartStore.cart()?.discountTotal);
  }

  get hasAssembly(): boolean {
    return hasAmount(this.cartStore.cart()?.assemblyTotal);
  }

  onContactClick(event: 'call_click' | 'whatsapp_click'): void {
    this.analytics.track(event, { source: 'cart' });
  }

  goToCheckout(): void {
    if (!this.cartStore.checkoutReady()) {
      return;
    }
    this.router.navigate(['/checkout']);
  }
}
