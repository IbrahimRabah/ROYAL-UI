import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';

import { APP_CONFIG } from '../../../../core/constants/app-config';
import { ShippingQuoteResponse, hasAmount, money } from '../../../../core/models';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { CartStoreService } from '../../../../core/state/cart-store.service';

@Component({
  selector: 'app-checkout-summary-sidebar',
  templateUrl: './checkout-summary-sidebar.component.html',
  styleUrl: './checkout-summary-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummarySidebarComponent {
  private readonly analytics = inject(AnalyticsService);
  readonly cartStore = inject(CartStoreService);
  readonly contact = APP_CONFIG.contact;

  @Input() governorateSelected = false;
  @Input() shippingQuote: ShippingQuoteResponse | null = null;
  @Input() shippingLoading = false;
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Input() processing = false;
  @Input() submitError: string | null = null;
  /** Offer a call / WhatsApp under the error (for problems the customer cannot fix alone). */
  @Input() showContactHelp = false;

  @Output() readonly placeOrder = new EventEmitter<void>();

  readonly expanded = signal(false);

  get hasCodFee(): boolean {
    return money(this.shippingQuote?.codFee) > 0;
  }

  /** Assembly fees, when the pieces in the order need assembly (the quote is the figure the order is priced with). */
  get hasAssembly(): boolean {
    return hasAmount(this.shippingQuote?.assemblyTotal ?? this.cartStore.cart()?.assemblyTotal);
  }

  get assemblyTotal(): number {
    return money(this.shippingQuote?.assemblyTotal ?? this.cartStore.cart()?.assemblyTotal);
  }

  onContactClick(event: 'call_click' | 'whatsapp_click'): void {
    this.analytics.track(event, { source: 'checkout' });
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }
}
