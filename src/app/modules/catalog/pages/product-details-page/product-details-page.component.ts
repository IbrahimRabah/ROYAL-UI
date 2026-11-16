import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, OnDestroy, PLATFORM_ID, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FulfillmentType, isReadyMade } from '../../../../core/enums/fulfillment-type';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import {
  AttributeGroupResponse,
  ImageResponse,
  ProductDetailResponse,
  ProductSummaryResponse,
  VariantResponse,
  money,
} from '../../../../core/models';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { CartActionsService } from '../../../../core/services/cart-actions.service';
import { BreadcrumbItem } from '../../../../shared/components/vl-breadcrumb/vl-breadcrumb.component';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SavedProductsService } from '../../../../core/services/saved-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MiniCartStateService } from '../../../../core/state/mini-cart-state.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { UiStoreService } from '../../../../core/state/ui-store.service';

/** Intersection ratio at which the page's own primary button counts as fully visible. */
const FULLY_VISIBLE = 0.99;

/** Most pieces one customer can add from the product page in a single go. */
const MAX_QUANTITY = 99;

function findColorGroup(product: ProductDetailResponse): AttributeGroupResponse | null {
  return product.variantOptions.find((group) => group.values.some((value) => value.hexColor != null)) ?? null;
}

function dedupeById(images: ImageResponse[]): ImageResponse[] {
  const seen = new Set<number>();
  return images.filter((image) => (seen.has(image.id) ? false : (seen.add(image.id), true)));
}

@Component({
  selector: 'app-product-details-page',
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailsPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly seo = inject(SeoService);
  private readonly cartActions = inject(CartActionsService);
  private readonly miniCart = inject(MiniCartStateService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly ui = inject(UiStoreService);
  private readonly saved = inject(SavedProductsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);

  /** True whenever the page's own primary button is not fully visible in the viewport. */
  readonly barVisible = signal(false);
  private observer: IntersectionObserver | null = null;

  @HostBinding('class.pdp-host--bar') get hasBar(): boolean {
    return this.barVisible();
  }

  /**
   * The primary button's wrapper only exists once the product has loaded, hence a setter.
   * We watch that wrapper with an IntersectionObserver: no scroll listener, no layout reads.
   * The bar shows whenever the button is not fully in view — including below the fold on first paint — so the
   * customer can always add to the cart without hunting for the button.
   */
  @ViewChild('primaryActionAnchor') set primaryActionAnchor(ref: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    this.observer = null;
    if (!ref || !this.isBrowser || typeof IntersectionObserver === 'undefined') {
      this.barVisible.set(false);
      return;
    }
    // The bar covers every case where the button is not fully on screen: scrolled past, still below the fold on
    // first paint, or clipped by the bottom edge of a short phone viewport (landscape / 812px tall).
    this.observer = new IntersectionObserver(
      ([entry]) => this.barVisible.set(entry.intersectionRatio < FULLY_VISIBLE),
      { threshold: [0, FULLY_VISIBLE] },
    );
    this.observer.observe(ref.nativeElement);
  }

  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: null,
  });

  readonly product = signal<ProductDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly relatedProducts = signal<ProductSummaryResponse[]>([]);
  readonly selectedValueId = signal<number | null>(null);
  readonly addingToCart = signal(false);
  readonly justAddedToCart = signal(false);

  readonly colorGroup = computed<AttributeGroupResponse | null>(() => {
    const product = this.product();
    return product ? findColorGroup(product) : null;
  });

  /** The chosen value of every option other than colour (size, finish...), by attribute id. */
  readonly selectedOptionIds = signal<Record<number, number>>({});

  /** The options the customer actually chooses between: any group but the colour one that offers more than one value. */
  readonly optionGroups = computed<AttributeGroupResponse[]>(() => {
    const product = this.product();
    if (!product) return [];
    const color = this.colorGroup();
    return product.variantOptions.filter((group) => group !== color && group.values.length > 1);
  });

  readonly selectedVariant = computed<VariantResponse | null>(() => {
    const product = this.product();
    if (!product || !product.variants.length) return null;
    const colorId = this.selectedValueId();
    const wanted = [...(colorId == null ? [] : [colorId]), ...Object.values(this.selectedOptionIds())];
    const exact = wanted.length ? product.variants.find((v) => wanted.every((id) => v.attributeValueIds.includes(id))) : undefined;
    if (exact) return exact;
    const byColor = colorId == null ? undefined : product.variants.find((v) => v.attributeValueIds.includes(colorId));
    return byColor ?? product.variants[0];
  });

  readonly galleryImages = computed<ImageResponse[]>(() => {
    const product = this.product();
    if (!product) return [];

    const poster = product.images.find((image) => image.main) ?? product.images[0] ?? null;
    const variant = this.selectedVariant();
    const variantImages = variant?.images.length ? variant.images : product.images;

    return dedupeById(poster ? [poster, ...variantImages] : variantImages);
  });

  /** Thumbnail for the sticky bar: the first gallery image, or null (the imageUrl pipe then shows the placeholder). */
  readonly barImageUrl = computed<string | null>(() => {
    const first = this.galleryImages().at(0);
    return first ? (first.thumbUrl || first.url) : null;
  });

  readonly activeGalleryImageId = signal<number | null>(null);

  readonly displayedImageId = signal<number | null>(null);

  readonly posterImageId = computed<number | null>(() => {
    const product = this.product();
    return product ? this.posterId(product) : null;
  });

  readonly isPosterDisplayed = computed(() => {
    const displayed = this.displayedImageId();
    return displayed !== null && displayed === this.posterImageId();
  });

  readonly descriptionImage = computed<ImageResponse | null>(() => {
    const product = this.product();
    if (!product || !product.images.length) return null;
    const shown = new Set(this.galleryImages().map((image) => image.id));
    const exclusive = product.images.find((image) => !shown.has(image.id));
    return exclusive ?? product.images[product.images.length - 1];
  });

  /** Home > All products > the category chain > this product, so the customer can step back up. */
  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const product = this.product();
    if (!product) return [];
    return [
      { labelKey: 'common.home', link: '/' },
      { labelKey: 'common.allProducts', link: '/products' },
      ...product.categoryPath.map((crumb) => ({ label: crumb.name, link: '/products', queryParams: { categoryId: crumb.id } })),
      { label: product.name },
    ];
  });

  readonly categoryName = computed(() => {
    const path = this.product()?.categoryPath ?? [];
    return path.length ? path[path.length - 1].name : '';
  });

  readonly displayPrice = computed(() => this.selectedVariant()?.price ?? this.product()?.priceRange.min ?? 0);

  readonly inStock = computed(() => this.selectedVariant()?.inStock ?? this.product()?.inStock ?? false);

  /** What the customer asked for; clamp it with `effectiveQuantity` (the chosen variant may have less stock). */
  private readonly quantity = signal(1);

  readonly maxQuantity = computed(() => {
    const available = this.selectedVariant()?.availableQty ?? 0;
    return available > 0 ? Math.min(available, MAX_QUANTITY) : MAX_QUANTITY;
  });

  readonly effectiveQuantity = computed(() => Math.max(1, Math.min(this.quantity(), this.maxQuantity())));

  /** Unit price × quantity: what the sticky bar shows, so the price follows the stepper. */
  readonly linePrice = computed(() => Math.round(money(this.displayPrice()) * this.effectiveQuantity() * 100) / 100);

  increaseQuantity(): void {
    this.quantity.set(Math.min(this.effectiveQuantity() + 1, this.maxQuantity()));
  }

  decreaseQuantity(): void {
    this.quantity.set(Math.max(this.effectiveQuantity() - 1, 1));
  }

  constructor() {
    // Keep the shared UI state in step with this page: the WhatsApp button lifts above the bar and names the product.
    effect(() => this.ui.setStickyBarVisible(this.barVisible()), { allowSignalWrites: true });
    effect(() => this.ui.setContactProduct(this.product()?.name ?? null), { allowSignalWrites: true });

    // Only the slug and the language decide when to load. Everything the response does afterwards runs untracked:
    // when the server already sent the answer (server rendering, Arabic) the response arrives synchronously, inside
    // this effect, and recordView() reads and rewrites the recently-viewed list. Tracked, that made the effect
    // depend on its own write, so it re-ran forever and the page froze ("Page Unresponsive").
    effect(() => {
      const slug = this.slug();
      this.languageStore.lang();
      if (!slug) return;
      untracked(() => this.loadProduct(slug));
    }, { allowSignalWrites: true });
  }

  private loadProduct(slug: string): void {
    this.loading.set(true);
    this.catalogApi.getProduct(slug).subscribe({
      next: (product) => {
        this.product.set(product);
        this.quantity.set(1);
        this.applySeo(product);
        this.selectedValueId.set(this.defaultValueId(product));
        this.syncOptions();
        this.activeGalleryImageId.set(this.posterId(product));
        this.loading.set(false);
        this.saved.recordView({ id: product.id, slug: product.slug });
        this.analytics.track('pdp_view', { product_id: product.id, slug: product.slug });
        this.fetchRelated(product.id);
      },
      error: () => {
        this.product.set(null);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.seo.setJsonLd('product', null);
    this.seo.setJsonLd('breadcrumb', null);
    this.observer?.disconnect();
    this.ui.setStickyBarVisible(false);
    this.ui.setContactProduct(null);
  }

  /**
   * The head of the page and its structured data: the SEO team's meta text (the name when there is none), the
   * canonical URL, a product with its price, stock and star rating, and the breadcrumb.
   */
  private applySeo(p: ProductDetailResponse): void {
    const image = p.images[0]?.url ?? null;
    this.seo.applyPage({
      title: p.seo?.metaTitle || p.name,
      description: p.seo?.metaDescription || p.shortDescription,
      canonicalPath: '/products/' + p.slug,
      image,
      type: 'product',
    });
    const offers = p.priceRange?.min == null ? undefined : {
      '@type': 'Offer',
      priceCurrency: 'EGP',
      price: money(p.priceRange.min),
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: this.seo.absolute('/products/' + p.slug),
    };
    this.seo.setJsonLd('product', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.shortDescription || undefined,
      image: p.images.map((i) => this.seo.absolute(i.url)),
      sku: p.variants[0]?.sku,
      brand: p.brand?.name ? { '@type': 'Brand', name: p.brand.name } : undefined,
      offers,
      aggregateRating: p.ratingCount ? { '@type': 'AggregateRating', ratingValue: p.ratingAvg, reviewCount: p.ratingCount } : undefined,
    });
    this.seo.setJsonLd('breadcrumb', p.categoryPath?.length ? {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: p.categoryPath.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: this.seo.absolute('/products?categoryId=' + c.id),
      })),
    } : null);
  }

  /** The rating under the title is a shortcut to the reviews section lower on the page. */
  scrollToReviews(): void {
    this.document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onDisplayedImageChange(imageId: number | null): void {
    this.displayedImageId.set(imageId);
  }

  selectValue(valueId: number): void {
    this.selectedValueId.set(valueId);
    this.syncOptions();
    this.showVariantImage();
  }

  /**
   * Picks an option such as a size. If no variant has it in the chosen colour, the customer still gets what they
   * asked for: the first variant that has it, and the colour moves to that variant's colour.
   */
  selectOption(groupId: number, valueId: number): void {
    const product = this.product();
    if (!product) return;
    const colorId = this.selectedValueId();
    const withColor = colorId == null ? undefined : product.variants.find((v) => v.attributeValueIds.includes(colorId) && v.attributeValueIds.includes(valueId));
    const target = withColor ?? product.variants.find((v) => v.attributeValueIds.includes(valueId));
    if (!target) return;
    const color = this.colorGroup()?.values.find((value) => target.attributeValueIds.includes(value.id));
    if (color) this.selectedValueId.set(color.id);
    this.selectedOptionIds.set({ ...this.selectedOptionIds(), [groupId]: valueId });
    this.syncOptions();
    this.showVariantImage();
  }

  /** Makes the highlighted options match the variant that is actually selected. */
  private syncOptions(): void {
    const variant = this.selectedVariant();
    if (!variant) return;
    const next: Record<number, number> = {};
    for (const group of this.optionGroups()) {
      const value = group.values.find((candidate) => variant.attributeValueIds.includes(candidate.id));
      if (value) next[group.attributeId] = value.id;
    }
    this.selectedOptionIds.set(next);
  }

  private showVariantImage(): void {
    const product = this.product();
    const variant = this.selectedVariant();
    const image = variant?.images.length ? variant.images[0] : null;
    this.activeGalleryImageId.set(image?.id ?? (product ? this.posterId(product) : null));
  }

  readonly readyMade = computed(() => isReadyMade(this.product()));
  readonly quoteLabelKey = computed(() =>
    this.product()?.fulfillmentType === FulfillmentType.MADE_TO_ORDER ? 'product.orderMadeToMeasure' : 'product.requestQuote',
  );

  addToCart(): void {
    const variant = this.selectedVariant();
    // The cart rejects non-ready-made products (409 PRODUCT_NOT_PURCHASABLE) — never send one.
    if (!variant || !this.readyMade() || this.addingToCart()) return;

    this.analytics.track('atc_click', { product_id: this.product()?.id, variant_id: variant.id, quantity: this.effectiveQuantity() });
    this.addingToCart.set(true);
    // The page's button and the sticky bar's button are the same template, so this is the only add path;
    // the panel itself confirms the add, which is why there is no "added" toast any more.
    this.cartActions.add(variant.id, this.effectiveQuantity()).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.justAddedToCart.set(true);
        this.miniCart.openAfterAdd(variant.id);
        setTimeout(() => this.justAddedToCart.set(false), 1500);
      },
      error: () => this.addingToCart.set(false),
    });
  }

  private fetchRelated(productId: number): void {
    this.relatedProducts.set([]);
    this.catalogApi.getRelated(productId).subscribe({
      next: (products) => this.relatedProducts.set(products),
      error: () => {},
    });
  }

  private posterId(product: ProductDetailResponse): number | null {
    return (product.images.find((image) => image.main) ?? product.images[0] ?? null)?.id ?? null;
  }

  private defaultValueId(product: ProductDetailResponse): number | null {
    const firstVariant = product.variants[0];
    const colorGroup = findColorGroup(product);
    if (!firstVariant || !colorGroup) return null;
    return colorGroup.values.find((value) => firstVariant.attributeValueIds.includes(value.id))?.id ?? null;
  }
}
