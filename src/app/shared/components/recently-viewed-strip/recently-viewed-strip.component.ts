import { ChangeDetectionStrategy, Component, Input, computed, effect, inject, signal } from '@angular/core';

import { ProductSummaryResponse } from '../../../core/models';
import { SavedProductsService } from '../../../core/services/saved-products.service';
import { LanguageStoreService } from '../../../core/state/language-store.service';

/** Fewer than this and a "recently viewed" row is noise, so nothing renders. */
const MIN_ITEMS = 2;

/**
 * Recently viewed, as a row of the same product cards used everywhere else. Reads the browser-local list, re-fetches
 * the current products (so prices are never stale), leaves out anything that no longer exists, and renders nothing
 * unless at least two products remain.
 */
@Component({
  selector: 'app-recently-viewed-strip',
  templateUrl: './recently-viewed-strip.component.html',
  styleUrl: './recently-viewed-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentlyViewedStripComponent {
  private readonly saved = inject(SavedProductsService);
  private readonly languageStore = inject(LanguageStoreService);

  /** The product page passes the one being viewed so it is not offered back to itself. */
  private readonly excludeId = signal<number | null>(null);
  @Input() set excludeProductId(value: number | null | undefined) {
    this.excludeId.set(value ?? null);
  }

  readonly products = signal<ProductSummaryResponse[]>([]);
  readonly visible = computed(() => this.products().length >= MIN_ITEMS);

  private readonly entries = computed(() => {
    const exclude = this.excludeId();
    return this.saved.recentlyViewed().filter((item) => item.id !== exclude);
  });

  constructor() {
    effect((onCleanup) => {
      const entries = this.entries();
      this.languageStore.lang();

      // Not enough saved to ever qualify: do not even ask the server.
      if (entries.length < MIN_ITEMS) {
        this.products.set([]);
        return;
      }
      const sub = this.saved.resolve('recentlyViewed', entries).subscribe((products) => {
        // resolve() returns entries in order; keep that (newest first).
        this.products.set(products);
      });
      onCleanup(() => sub.unsubscribe());
    }, { allowSignalWrites: true });
  }

}
