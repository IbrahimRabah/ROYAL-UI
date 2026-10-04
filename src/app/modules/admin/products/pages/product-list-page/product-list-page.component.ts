import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BrandAdminResponse, Money, ProductAdminResponse, money } from '../../../../../core/models';
import { ProductStatus } from '../../../../../core/enums/product-status';
import { Language } from '../../../../../core/enums/language';
import { FulfillmentType, isReadyMade } from '../../../../../core/enums/fulfillment-type';
import {
  PRODUCT_STATUS_LABELS_AR,
  PRODUCT_STATUS_LABELS_EN,
  PRODUCT_STATUS_TONE,
} from '../../../../../core/constants/product-status.constants';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { AdminProductApiService } from '../../../../../core/services/api/admin-product-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { FlatCategoryOption, flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';
import { brandDisplayName } from '../../../../../shared/utils/brand-display-name.util';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface StatusTab {
  key: string;
  status: ProductStatus | null;
  labelKey: string;
}

const TABS: StatusTab[] = [
  { key: 'all', status: null, labelKey: 'admin.products.tabs.all' },
  { key: 'ACTIVE', status: ProductStatus.ACTIVE, labelKey: 'admin.products.tabs.active' },
  { key: 'DRAFT', status: ProductStatus.DRAFT, labelKey: 'admin.products.tabs.draft' },
  { key: 'ARCHIVED', status: ProductStatus.ARCHIVED, labelKey: 'admin.products.tabs.archived' },
];

@Component({
  selector: 'app-product-list-page',
  templateUrl: './product-list-page.component.html',
  styleUrl: './product-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productApi = inject(AdminProductApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly listReturn = inject(AdminListReturnService);

  readonly tabs = TABS;
  readonly pageSize = 20;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly activeStatus = computed<ProductStatus | null>(() => {
    const raw = this.queryParamMap().get('status');
    return raw && (Object.values(ProductStatus) as string[]).includes(raw) ? (raw as ProductStatus) : null;
  });

  readonly activeTabKey = computed(() => this.tabs.find((t) => t.status === this.activeStatus())?.key ?? 'all');
  readonly searchText = computed(() => this.queryParamMap().get('q') ?? '');
  readonly categoryFilter = computed(() => (this.queryParamMap().get('categoryId') ? Number(this.queryParamMap().get('categoryId')) : null));
  readonly brandFilter = computed(() => (this.queryParamMap().get('brandId') ? Number(this.queryParamMap().get('brandId')) : null));
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);
  readonly fulfillmentFilter = computed<FulfillmentType | null>(() => {
    const raw = this.queryParamMap().get('fulfillmentType');
    return raw && (Object.values(FulfillmentType) as string[]).includes(raw) ? (raw as FulfillmentType) : null;
  });
  readonly fulfillmentOptions = Object.values(FulfillmentType);

  readonly searchDraft = signal('');
  readonly filtersOpen = signal(false);
  readonly allProducts = signal<ProductAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly categoryOptions = signal<FlatCategoryOption[]>([]);
  readonly brands = signal<BrandAdminResponse[]>([]);
  readonly brandOptions = computed(() => this.brands().map((b) => ({ id: b.id, name: brandDisplayName(b, this.languageStore.lang()) })));

  private readonly searchInput$ = new Subject<string>();

  readonly tabCounts = computed<Record<string, number>>(() => {
    const products = this.allProducts();
    const counts: Record<string, number> = { all: products.length };
    for (const tab of this.tabs) {
      if (tab.status) {
        counts[tab.key] = products.filter((p) => p.status === tab.status).length;
      }
    }
    return counts;
  });

  readonly filteredRows = computed<ProductAdminResponse[]>(() => {
    const status = this.activeStatus();
    const q = this.searchText().trim().toLowerCase();
    const categoryId = this.categoryFilter();
    const brandId = this.brandFilter();
    const fulfillment = this.fulfillmentFilter();

    return this.allProducts().filter((p) => {
      if (fulfillment && (p.fulfillmentType ?? FulfillmentType.READY_MADE) !== fulfillment) return false;
      if (status && p.status !== status) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (brandId && p.brandId !== brandId) return false;
      if (q && !(p.nameAr ?? '').toLowerCase().includes(q) && !(p.nameEn ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  constructor() {
    this.searchDraft.set(this.searchText());

    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => this.updateQueryParams({ q: value || null, page: null }));

    this.taxonomyApi.listCategories().subscribe({
      next: (tree) => this.categoryOptions.set(flattenCategoryTree(tree, this.languageStore.lang())),
      error: () => {},
    });
    this.taxonomyApi.listBrands().subscribe({ next: (b) => this.brands.set(b), error: () => {} });

    this.fetchAll();

    effect(() => {
      this.queryParamMap();
      this.listReturn.remember('/admin/products', this.router.url);
    });
  }

  displayName(row: ProductAdminResponse): string {
    const lang = this.languageStore.lang();
    const primary = lang === Language.AR ? row.nameAr : row.nameEn;
    const fallback = lang === Language.AR ? row.nameEn : row.nameAr;
    return primary || fallback || row.slug;
  }

  statusLabel(status: ProductStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? PRODUCT_STATUS_LABELS_AR : PRODUCT_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: ProductStatus): StatusTone {
    return PRODUCT_STATUS_TONE[status];
  }

  fulfillmentTone(type: FulfillmentType | null | undefined): StatusTone {
    const tones: Record<FulfillmentType, StatusTone> = {
      [FulfillmentType.READY_MADE]: 'ok',
      [FulfillmentType.MADE_TO_ORDER]: 'info',
      [FulfillmentType.CUSTOM_WORK]: 'violet',
    };
    return tones[type ?? FulfillmentType.READY_MADE];
  }

  fulfillmentLabelKey(type: FulfillmentType | null | undefined): string {
    return 'admin.products.list.fulfillment.' + (type ?? FulfillmentType.READY_MADE);
  }

  /** A ready-made product with no size class looks published but fails at checkout. */
  missingSize(row: ProductAdminResponse): boolean {
    return isReadyMade(row) && !row.shippingSizeClass;
  }

  onFulfillmentFilterChange(type: FulfillmentType | null): void {
    this.updateQueryParams({ fulfillmentType: type, page: null });
  }

  formatMoney(value: Money): string {
    return MONEY_FORMATTER.format(money(value));
  }

  priceRangeLabel(row: ProductAdminResponse): string {
    if (row.minPrice == null || row.maxPrice == null) {
      return '—';
    }
    if (money(row.minPrice) === money(row.maxPrice)) {
      return this.formatMoney(row.minPrice);
    }
    return `${this.formatMoney(row.minPrice)} – ${this.formatMoney(row.maxPrice)}`;
  }

  warningsTooltip(row: ProductAdminResponse): string {
    return row.warnings.join('<br>');
  }

  canPublish(row: ProductAdminResponse): boolean {
    return row.status === ProductStatus.DRAFT && (row.variantCount > 0 || !isReadyMade(row));
  }

  selectTab(tab: StatusTab): void {
    this.updateQueryParams({ status: tab.status, page: null });
  }

  onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
    this.searchInput$.next(value);
  }

  onCategoryFilterChange(categoryId: number | null): void {
    this.updateQueryParams({ categoryId, page: null });
  }

  onBrandFilterChange(brandId: number | null): void {
    this.updateQueryParams({ brandId, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetchAll();
  }

  publishRow(row: ProductAdminResponse): void {
    if (!this.canPublish(row)) return;
    this.productApi.publish(row.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('toast.products.published'));
        this.fetchAll();
      },
      error: () => {},
    });
  }

  unpublishRow(row: ProductAdminResponse): void {
    this.productApi.unpublish(row.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('toast.products.unpublished'));
        this.fetchAll();
      },
      error: () => {},
    });
  }

  archiveRow(row: ProductAdminResponse): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.list.archiveConfirm.title'),
        message: this.translate.instant('admin.products.list.archiveConfirm.message', { name: this.displayName(row) }),
        confirmLabel: this.translate.instant('admin.products.list.archiveConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.productApi.archive(row.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('toast.products.archived'));
            this.fetchAll();
          },
          error: () => {},
        });
      });
  }

  duplicateRow(row: ProductAdminResponse): void {
    this.productApi.duplicate(row.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('toast.products.duplicated'));
        this.fetchAll();
      },
      error: () => {},
    });
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.error.set(false);

    this.productApi
      .list(0, 1)
      .pipe(switchMap((first) => this.productApi.list(0, Math.max(first.totalElements, 1))))
      .subscribe({
        next: (res) => {
          this.allProducts.set(res.content);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  private updateQueryParams(partial: Record<string, string | number | null | undefined>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: partial, queryParamsHandling: 'merge' });
  }
}
