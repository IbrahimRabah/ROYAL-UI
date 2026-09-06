import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';

import { ShippingQuoteResponse, money } from '../../../../core/models';
import { CartStoreService } from '../../../../core/state/cart-store.service';

@Component({
  selector: 'app-checkout-summary-sidebar',
  templateUrl: './checkout-summary-sidebar.component.html',
  styleUrl: './checkout-summary-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummarySidebarComponent {
  readonly cartStore = inject(CartStoreService);

  @Input() governorateSelected = false;
  @Input() shippingQuote: ShippingQuoteResponse | null = null;
  @Input() shippingLoading = false;
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Input() processing = false;
  @Input() submitError: string | null = null;

  @Output() readonly placeOrder = new EventEmitter<void>();

  readonly expanded = signal(false);

  get hasCodFee(): boolean {
    return money(this.shippingQuote?.codFee) > 0;
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }
}
