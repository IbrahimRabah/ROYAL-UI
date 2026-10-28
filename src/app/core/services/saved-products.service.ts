import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { ProductDetailResponse, ProductSummaryResponse } from '../models';
import { LanguageStoreService } from '../state/language-store.service';
import { CatalogApiService } from './api/catalog-api.service';

/** The minimum needed to find a product again. Prices and names are never stored — they are re-fetched. */
export interface SavedProduct {
  id: number;
  slug: string;
}

export type SavedListKind = 'recentlyViewed' | 'wishlist';
export type WishlistToggleResult = 'added' | 'removed' | 'full';

const STORAGE_KEYS: Record<SavedListKind, string> = {
  recentlyViewed: 'royal.recentlyViewed.v1',
  wishlist: 'royal.wishlist.v1',
};

export const RECENTLY_VIEWED_MAX = 10;
export const WISHLIST_MAX = 30;

/** Resolved products are kept in memory only, briefly, so moving between product pages does not refetch the lot. */
const RESOLVE_TTL_MS = 60_000;

/**
 * Two browser-only lists of product ids behind one mechanism: recently viewed (newest first, capped, no duplicates)
 * and the wishlist. Nothing here reaches a server, and every storage access is guarded, so a private window or blocked
 * site data degrades to "the list lasts until the tab closes" instead of breaking the page.
 */
@Injectable({ providedIn: 'root' })
export class SavedProductsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly catalogApi = inject(CatalogApiService);
  private readonly languageStore = inject(LanguageStoreService);

  private readonly _recentlyViewed = signal<SavedProduct[]>(this.read('recentlyViewed'));
  private readonly _wishlist = signal<SavedProduct[]>(this.read('wishlist'));

  readonly recentlyViewed = this._recentlyViewed.asReadonly();
  readonly wishlist = this._wishlist.asReadonly();

  private readonly resolved = new Map<string, { at: number; product: ProductSummaryResponse }>();

  constructor() {
    if (this.isBrowser) {
      // Another tab changed a list: follow it.
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.recentlyViewed) this._recentlyViewed.set(this.read('recentlyViewed'));
        if (event.key === STORAGE_KEYS.wishlist) this._wishlist.set(this.read('wishlist'));
      });
    }
  }

  isWished(productId: number): boolean {
    return this._wishlist().some((item) => item.id === productId);
  }

  /** Called when a product's detail page has actually loaded. */
  recordView(product: SavedProduct): void {
    const next = [product, ...this._recentlyViewed().filter((item) => item.id !== product.id)].slice(0, RECENTLY_VIEWED_MAX);
    this.commit('recentlyViewed', next);
  }

  toggleWishlist(product: SavedProduct): WishlistToggleResult {
    const current = this._wishlist();
    if (current.some((item) => item.id === product.id)) {
      this.commit('wishlist', current.filter((item) => item.id !== product.id));
      return 'removed';
    }
    if (current.length >= WISHLIST_MAX) return 'full';
    this.commit('wishlist', [product, ...current]);
    return 'added';
  }

  removeFromWishlist(productId: number): void {
    this.commit('wishlist', this._wishlist().filter((item) => item.id !== productId));
  }

  /** Drops ids the server said no longer exist (404/410). A failed request is not proof, so it removes nothing. */
  private prune(kind: SavedListKind, productId: number): void {
    const list = kind === 'wishlist' ? this._wishlist() : this._recentlyViewed();
    if (list.some((item) => item.id === productId)) {
      this.commit(kind, list.filter((item) => item.id !== productId));
    }
  }

  /**
   * Fetches the CURRENT product for each saved entry. One that is gone (deleted, unpublished) is left out of the
   * result and pruned from storage; it never appears as a broken card.
   */
  resolve(kind: SavedListKind, entries: SavedProduct[]): Observable<ProductSummaryResponse[]> {
    if (!entries.length) return of([]);
    const lang = this.languageStore.lang();
    const now = Date.now();

    const lookups = entries.map((entry) => {
      const key = `${lang}:${entry.slug}`;
      const hit = this.resolved.get(key);
      if (hit && now - hit.at < RESOLVE_TTL_MS) return of(hit.product);

      return this.catalogApi.getProduct(entry.slug, true).pipe(
        map((detail) => {
          const product = toSummary(detail);
          this.resolved.set(key, { at: Date.now(), product });
          return product;
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 410)) {
            this.prune(kind, entry.id);
          }
          return of(null);
        }),
      );
    });

    return forkJoin(lookups).pipe(map((items) => items.filter((item): item is ProductSummaryResponse => item !== null)));
  }

  private commit(kind: SavedListKind, list: SavedProduct[]): void {
    (kind === 'wishlist' ? this._wishlist : this._recentlyViewed).set(list);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(list));
    } catch {
      // Private window, quota or blocked site data: the list still works for this visit.
    }
  }

  private read(kind: SavedListKind): SavedProduct[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[kind]);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const seen = new Set<number>();
      const clean: SavedProduct[] = [];
      for (const item of parsed) {
        const id = (item as SavedProduct | null)?.id;
        const slug = (item as SavedProduct | null)?.slug;
        if (typeof id === 'number' && Number.isFinite(id) && typeof slug === 'string' && slug && !seen.has(id)) {
          seen.add(id);
          clean.push({ id, slug });
        }
      }
      return clean.slice(0, kind === 'wishlist' ? WISHLIST_MAX : RECENTLY_VIEWED_MAX);
    } catch {
      return [];
    }
  }
}

/** The product detail response carries everything a card shows except a few list-only fields, which cards do not use. */
function toSummary(detail: ProductDetailResponse): ProductSummaryResponse {
  const image = detail.images.find((i) => i.main) ?? detail.images[0] ?? null;
  const category = detail.categoryPath[detail.categoryPath.length - 1];
  return {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    shortDescription: detail.shortDescription,
    brandName: detail.brand?.name ?? '',
    categorySlug: category?.slug ?? '',
    imageUrl: image ? image.thumbUrl || image.url : '',
    imageAlt: image?.alt || detail.name,
    minPrice: detail.priceRange.min,
    maxPrice: detail.priceRange.max,
    compareAtPrice: 0,
    discountPercent: 0,
    inStock: detail.inStock,
    availableQty: 0,
    featured: detail.featured,
    newArrival: detail.newArrival,
    fulfillmentType: detail.fulfillmentType,
    shippingSizeClass: detail.shippingSizeClass,
    requiresAssembly: detail.requiresAssembly,
    assemblyFee: detail.assemblyFee,
  };
}
