import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SavedProduct, SavedProductsService } from '../../../core/services/saved-products.service';
import { ToastService } from '../../../core/services/toast.service';

/** The heart on product cards and on the product page: one toggle over the browser-local wishlist. */
@Component({
  selector: 'app-wishlist-heart',
  templateUrl: './wishlist-heart.component.html',
  styleUrl: './wishlist-heart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistHeartComponent {
  private readonly saved = inject(SavedProductsService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input({ required: true }) product!: SavedProduct;
  /** "icon" = round button over an image; "labelled" = icon plus text, for the product page. */
  @Input() variant: 'icon' | 'labelled' = 'icon';

  // The service's wishlist signal is read in the template, so OnPush re-renders on every change.
  readonly wishlist = this.saved.wishlist;

  isWished(): boolean {
    return this.wishlist().some((item) => item.id === this.product.id);
  }

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const result = this.saved.toggleWishlist({ id: this.product.id, slug: this.product.slug });
    if (result === 'full') {
      this.toast.warning(this.translate.instant('wishlist.full'));
    }
  }
}
