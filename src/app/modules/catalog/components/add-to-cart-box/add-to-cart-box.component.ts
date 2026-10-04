import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-add-to-cart-box',
  templateUrl: './add-to-cart-box.component.html',
  styleUrl: './add-to-cart-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddToCartBoxComponent {
  /** Set for made-to-order / custom products: shows a quote link instead of the cart button. */
  @Input() quoteProductId: number | null = null;
  @Input() quoteType: string | null = null;
  @Input() quoteLabelKey = 'product.requestQuote';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() success = false;
  @Output() readonly addToCart = new EventEmitter<void>();

  onClick(): void {
    if (this.disabled || this.loading) return;
    this.addToCart.emit();
  }
}
