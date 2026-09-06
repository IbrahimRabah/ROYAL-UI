import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { BreadcrumbItem } from '../../../../shared/components/vl-breadcrumb/vl-breadcrumb.component';
import { CategoryFilterOption } from '../../components/filter-sidebar/filter-sidebar.component';
import { ActiveFilterChip } from '../../components/active-filters-bar/active-filters-bar.component';
import { CategoryCard } from '../../components/category-card-grid/category-card-grid.component';
import { APP_CONFIG } from '../../../../core/constants/app-config';
import { SortOption } from '../../../../core/enums/sort-option';
import {
  CategoryDetailResponse,
  CategoryNode,
  emptyPage,
  FilterFacetsResponse,
  PageResponse,
  ProductFilter,
  ProductSummaryResponse,
} from '../../../../core/models';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

interface ResolvedCategory {
  node: CategoryNode;
  parent: CategoryNode | null;
  isParentLevel: boolean;
}

const TOP_CARD_IMAGES: Record<string, string> = {
  watches: 'assets/images/categories/watch.png',
  wallets: 'assets/images/categories/wallet.png',
  perfumes: 'assets/images/categories/perfume.png',
};

const WATCHES_CHILD_CARD_IMAGES = {
  all: 'assets/images/products/all-products/all-watches-card.png',
  men: 'assets/images/products/all-products/men-card.png',
  women: 'assets/images/products/all-products/women-card.png',
};

function resolveCategory(tree: CategoryNode[], categoryId: number): ResolvedCategory | null {
  for (const root of tree) {
    if (root.id === categoryId) {
      return { node: root, parent: null, isParentLevel: true };
    }
    const child = root.children.find((c) => c.id === categoryId);
    if (child) {
      return { node: child, parent: root, isParentLevel: false };
    }
  }
  return null;
}

function parseNumber(params: ParamMap, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isNaN(value) ? undefined : value;
}

function parseNumberList(params: ParamMap, key: string): number[] | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const values = raw.split(',').map(Number).filter((n) => !Number.isNaN(n));
  return values.length ? values : undefined;
}

function parseBoolean(params: ParamMap, key: string): boolean | undefined {
  const raw = params.get(key);
  return raw === 'true' ? true : raw === 'false' ? false : undefined;
}

const SORT_VALUES = Object.values(SortOption) as string[];

@Component({
  selector: 'app-product-list-page',
  templateUrl: './product-list-page.component.html',
  styleUrl: './product-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly queryFilter = computed<ProductFilter & { uiPage: number }>(() => {
    const params = this.queryParamMap();
    const uiPage = parseNumber(params, 'page') ?? 1;
    const sortParam = params.get('sort');
    const sort = sortParam && SORT_VALUES.includes(sortParam) ? (sortParam as SortOption) : SortOption.NEWEST;

    return {
      q: params.get('q') ?? undefined,
      categoryId: parseNumber(params, 'categoryId'),
      brandIds: parseNumberList(params, 'brandIds'),
      minPrice: parseNumber(params, 'minPrice'),
      maxPrice: parseNumber(params, 'maxPrice'),
      attributeValueIds: parseNumberList(params, 'attributeValueIds'),
      inStockOnly: parseBoolean(params, 'inStockOnly'),
      featured: parseBoolean(params, 'featured'),
      newArrival: parseBoolean(params, 'newArrival'),
      sort,
      page: Math.max(0, uiPage - 1),
      uiPage,
    };
  });

  readonly categoryId = computed(() => this.queryFilter().categoryId ?? null);
  readonly sort = computed(() => this.queryFilter().sort ?? SortOption.NEWEST);

  readonly categoryTree = signal<CategoryNode[]>([]);
  readonly categoryDetail = signal<CategoryDetailResponse | null>(null);
  readonly facets = signal<FilterFacetsResponse | null>(null);

  readonly productsPage = signal<PageResponse<ProductSummaryResponse>>(
    emptyPage<ProductSummaryResponse>(APP_CONFIG.pagination.products.size),
  );
  readonly productsLoading = signal(true);
  readonly productsError = signal(false);

  private readonly retryTick = signal(0);

  readonly mobileFiltersOpen = signal(false);
  readonly bannerBroken = signal(false);
  readonly promoBroken = signal(false);

  readonly resolved = computed<ResolvedCategory | null>(() => {
    const id = this.categoryId();
    return id == null ? null : resolveCategory(this.categoryTree(), id);
  });

  private readonly categorySlug = computed(() => {
    if (this.categoryId() == null) return null;
    return this.resolved()?.node.slug ?? null;
  });

  readonly parentSlug = computed(() => {
    const res = this.resolved();
    if (!res) return null;
    return res.isParentLevel ? res.node.slug : (res.parent?.slug ?? null);
  });

  readonly scopeSlug = computed(() => {
    const res = this.resolved();
    if (!res) return null;
    return res.isParentLevel ? `all-${res.node.slug}` : res.node.slug;
  });

  readonly bannerUrl = computed(() => this.buildImagePath('banner.png'));
  readonly promoUrl = computed(() => this.buildImagePath('new-arrivals.png'));

  readonly heroTitle = computed(() => this.categoryDetail()?.name ?? null);
  readonly heroDescription = computed(() => this.categoryDetail()?.description ?? null);

  readonly categoryCards = computed<CategoryCard[]>(() => {
    const res = this.resolved();
    this.languageStore.lang();

    if (!res) {
      return this.categoryTree().map((root) => ({
        id: root.id,
        label: root.name,
        count: root.productCount ?? null,
        image: TOP_CARD_IMAGES[root.slug] ?? null,
      }));
    }

    if (!res.isParentLevel) return [];

    const parent = res.node;
    const hasDedicatedArt = parent.slug === 'watches';

    const allCard: CategoryCard = {
      id: parent.id,
      label: this.translate.instant('products.filters.allCategory', { name: parent.name }),
      count: parent.productCount ?? this.productsPage().totalElements,
      image: hasDedicatedArt
        ? WATCHES_CHILD_CARD_IMAGES.all
        : this.categoryCardImage(parent.slug, `all-${parent.slug}`),
    };

    const childCards: CategoryCard[] = parent.children.map((child) => ({
      id: child.id,
      label: child.name,
      count: child.productCount ?? null,
      image: hasDedicatedArt
        ? (child.slug.includes('women') ? WATCHES_CHILD_CARD_IMAGES.women : WATCHES_CHILD_CARD_IMAGES.men)
        : this.categoryCardImage(parent.slug, child.slug),
    }));

    return [allCard, ...childCards];
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ labelKey: 'common.home', link: '/' }];
    const detail = this.categoryDetail();
    if (detail) {
      for (const crumb of detail.breadcrumb) {
        items.push({ label: crumb.name, link: '/products', queryParams: { categoryId: crumb.id } });
      }
    } else {
      items.push({ labelKey: 'common.allProducts' });
    }
    return items;
  });

  readonly categoryOptions = computed<CategoryFilterOption[]>(() => {
    const id = this.categoryId();
    this.languageStore.lang();

    if (id == null) {
      return this.categoryTree().map((root) => ({
        id: root.id,
        label: root.name,
        count: root.productCount ?? null,
      }));
    }

    const res = this.resolved();
    if (!res) return [];
    const parent = res.isParentLevel ? res.node : res.parent;
    if (!parent) return [];

    const allOption: CategoryFilterOption = {
      id: parent.id,
      label: this.translate.instant('products.filters.allCategory', { name: parent.name }),
      count: parent.productCount ?? (res.isParentLevel ? this.productsPage().totalElements : null),
    };

    return [
      allOption,
      ...parent.children.map((child) => ({
        id: child.id,
        label: child.name,
        count: child.productCount ?? null,
      })),
    ];
  });

  readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const filter = this.queryFilter();
    const facets = this.facets();
    const chips: ActiveFilterChip[] = [];

    for (const id of filter.brandIds ?? []) {
      const brand = facets?.brands.find((b) => b.id === id);
      if (brand) chips.push({ key: `brand:${id}`, label: brand.name });
    }

    for (const id of filter.attributeValueIds ?? []) {
      for (const group of facets?.attributes ?? []) {
        const value = group.values.find((v) => v.id === id);
        if (value) {
          chips.push({ key: `attr:${id}`, label: value.name });
          break;
        }
      }
    }

    if (filter.minPrice != null || filter.maxPrice != null) {
      chips.push({
        key: 'price',
        label: `${this.formatMoney(filter.minPrice ?? APP_CONFIG.priceFilter.min)} - ${this.formatMoney(filter.maxPrice ?? APP_CONFIG.priceFilter.max)}`,
      });
    }

    return chips;
  });

  readonly activeFilterCount = computed(() => {
    const filter = this.queryFilter();
    let count = (filter.brandIds?.length ?? 0) + (filter.attributeValueIds?.length ?? 0);
    if (filter.minPrice != null || filter.maxPrice != null) count += 1;
    if (filter.inStockOnly) count += 1;
    return count;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  private readonly moneyFormatter = new Intl.NumberFormat('en-US-u-nu-latn', {
    style: 'currency',
    currency: 'EGP',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  constructor() {
    effect(() => {
      this.languageStore.lang();
      this.catalogApi.getCategoryTree().subscribe({
        next: (tree) => this.categoryTree.set(tree),
        error: () => {},
      });
    }, { allowSignalWrites: true });

    effect(() => {
      const slug = this.categorySlug();
      this.languageStore.lang();
      if (!slug) {
        this.categoryDetail.set(null);
        return;
      }
      this.catalogApi.getCategory(slug).subscribe({
        next: (detail) => this.categoryDetail.set(detail),
        error: () => this.categoryDetail.set(null),
      });
    }, { allowSignalWrites: true });

    effect(() => {
      const categoryId = this.categoryId();
      this.languageStore.lang();
      this.catalogApi.getFilters(categoryId ?? undefined).subscribe({
        next: (facets) => this.facets.set(facets),
        error: () => this.facets.set(null),
      });
    }, { allowSignalWrites: true });

    effect(() => {
      const filter = this.queryFilter();
      this.languageStore.lang();
      this.retryTick();
      this.productsLoading.set(true);
      this.productsError.set(false);
      this.catalogApi.searchProducts(filter).subscribe({
        next: (page) => {
          this.productsPage.set(page);
          this.productsLoading.set(false);
        },
        error: () => {
          this.productsLoading.set(false);
          this.productsError.set(true);
        },
      });
    }, { allowSignalWrites: true });

    effect(() => {
      this.bannerUrl();
      this.bannerBroken.set(false);
    }, { allowSignalWrites: true });
    effect(() => {
      this.promoUrl();
      this.promoBroken.set(false);
    }, { allowSignalWrites: true });
  }

  onPriceChange(range: { min: number; max: number }): void {
    const cfg = APP_CONFIG.priceFilter;
    this.updateQueryParams({
      minPrice: range.min <= cfg.min ? null : range.min,
      maxPrice: range.max >= cfg.max ? null : range.max,
    });
  }

  onBrandToggle(id: number): void {
    this.toggleListParam('brandIds', id);
  }

  onColorToggle(id: number): void {
    this.toggleListParam('attributeValueIds', id);
  }

  onAttributeToggle(id: number): void {
    this.toggleListParam('attributeValueIds', id);
  }

  onInStockChange(value: boolean): void {
    this.updateQueryParams({ inStockOnly: value ? true : null });
  }

  onSortChange(sort: SortOption): void {
    this.updateQueryParams({ sort: sort === SortOption.NEWEST ? null : sort });
  }

  retryProducts(): void {
    this.retryTick.update((n) => n + 1);
  }

  onPageChange(page: number): void {
    this.updateQueryParams({ page: page === 0 ? null : page + 1 }, false);
    this.scrollToTop();
  }

  onCategorySelect(id: number): void {
    this.mobileFiltersOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: { categoryId: id } });
  }

  onRemoveChip(key: string): void {
    if (key === 'price') {
      this.updateQueryParams({ minPrice: null, maxPrice: null });
      return;
    }
    const [type, idStr] = key.split(':');
    const id = Number(idStr);
    if (type === 'brand') this.toggleListParam('brandIds', id);
    if (type === 'attr') this.toggleListParam('attributeValueIds', id);
  }

  onClearAllFilters(): void {
    const categoryId = this.categoryId();
    this.mobileFiltersOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: categoryId == null ? {} : { categoryId },
    });
  }

  onBannerError(): void {
    this.bannerBroken.set(true);
  }

  onPromoError(): void {
    this.promoBroken.set(true);
  }

  openMobileFilters(): void {
    this.mobileFiltersOpen.set(true);
  }

  formatMoney(value: number): string {
    return this.moneyFormatter.format(value);
  }

  private toggleListParam(key: 'brandIds' | 'attributeValueIds', id: number): void {
    const current = this.queryFilter()[key] ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.updateQueryParams({ [key]: next.length ? next.join(',') : null });
  }

  private updateQueryParams(patch: Record<string, unknown>, resetPage = true): void {
    const queryParams: Record<string, unknown> = { ...patch };
    if (resetPage) queryParams['page'] = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private buildImagePath(file: 'banner.png' | 'new-arrivals.png'): string {
    const parent = this.parentSlug();
    const scope = this.scopeSlug();
    return parent && scope
      ? `assets/images/products/${parent}/${scope}/${file}`
      : `assets/images/products/all-products/${file}`;
  }

  private categoryCardImage(parentSlug: string, scopeSlug: string): string {
    return `assets/images/products/${parentSlug}/${scopeSlug}/banner.png`;
  }

  private scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
