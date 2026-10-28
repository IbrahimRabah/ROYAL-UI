import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { ProductSummaryResponse } from '../../../../core/models';
import { SavedProductsService } from '../../../../core/services/saved-products.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

/**
 * The browser-local wishlist. Saved ids are re-fetched as current products; one that no longer exists is left out
 * (and pruned) rather than drawn as a broken card.
 */
@Component({
  selector: 'app-wishlist-page',
  templateUrl: './wishlist-page.component.html',
  styleUrl: './wishlist-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPageComponent {
  private readonly saved = inject(SavedProductsService);
  private readonly languageStore = inject(LanguageStoreService);

  private readonly fetched = signal<ProductSummaryResponse[]>([]);
  readonly loading = signal(true);

  /** Filtered by the live list, so removing a card takes it off the page at once. */
  readonly products = computed(() => {
    const ids = new Set(this.saved.wishlist().map((item) => item.id));
    return this.fetched().filter((product) => ids.has(product.id));
  });

  constructor() {
    effect((onCleanup) => {
      const entries = this.saved.wishlist();
      this.languageStore.lang();

      if (!entries.length) {
        this.fetched.set([]);
        this.loading.set(false);
        return;
      }
      const sub = this.saved.resolve('wishlist', entries).subscribe((products) => {
        this.fetched.set(products);
        this.loading.set(false);
      });
      onCleanup(() => sub.unsubscribe());
    }, { allowSignalWrites: true });
  }

  remove(productId: number): void {
    this.saved.removeFromWishlist(productId);
  }

  trackById(_: number, product: ProductSummaryResponse): number {
    return product.id;
  }
}
