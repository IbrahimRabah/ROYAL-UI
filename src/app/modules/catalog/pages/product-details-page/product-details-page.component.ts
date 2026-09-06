import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
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
} from '../../../../core/models';
import { CartApiService } from '../../../../core/services/api/cart-api.service';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CartStoreService } from '../../../../core/state/cart-store.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

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
export class ProductDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly cartStore = inject(CartStoreService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

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

  readonly selectedVariant = computed<VariantResponse | null>(() => {
    const product = this.product();
    if (!product || !product.variants.length) return null;
    const valueId = this.selectedValueId();
    const match = valueId == null ? undefined : product.variants.find((v) => v.attributeValueIds.includes(valueId));
    return match ?? product.variants[0];
  });

  readonly galleryImages = computed<ImageResponse[]>(() => {
    const product = this.product();
    if (!product) return [];

    const poster = product.images.find((image) => image.main) ?? product.images[0] ?? null;
    const variant = this.selectedVariant();
    const variantImages = variant?.images.length ? variant.images : product.images;

    return dedupeById(poster ? [poster, ...variantImages] : variantImages);
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

  readonly categoryName = computed(() => {
    const path = this.product()?.categoryPath ?? [];
    return path.length ? path[path.length - 1].name : '';
  });

  readonly displayPrice = computed(() => this.selectedVariant()?.price ?? this.product()?.priceRange.min ?? 0);

  readonly inStock = computed(() => this.selectedVariant()?.inStock ?? this.product()?.inStock ?? false);

  constructor() {
    effect(() => {
      const slug = this.slug();
      this.languageStore.lang();
      if (!slug) return;

      this.loading.set(true);
      this.catalogApi.getProduct(slug).subscribe({
        next: (product) => {
          this.product.set(product);
          this.selectedValueId.set(this.defaultValueId(product));
          this.activeGalleryImageId.set(this.posterId(product));
          this.loading.set(false);
          this.fetchRelated(product.id);
        },
        error: () => {
          this.product.set(null);
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }

  onDisplayedImageChange(imageId: number | null): void {
    this.displayedImageId.set(imageId);
  }

  selectValue(valueId: number): void {
    this.selectedValueId.set(valueId);

    const product = this.product();
    const variant = this.selectedVariant();
    const image = variant?.images.length ? variant.images[0] : null;
    this.activeGalleryImageId.set(image?.id ?? (product ? this.posterId(product) : null));
  }

  addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant || this.addingToCart()) return;

    this.addingToCart.set(true);
    this.cartApi.addItem({ variantId: variant.id, quantity: 1 }).subscribe({
      next: (cart) => {
        this.cartStore.set(cart);
        this.addingToCart.set(false);
        this.justAddedToCart.set(true);
        this.toast.success(this.translate.instant('toast.cart.itemAdded'));
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
