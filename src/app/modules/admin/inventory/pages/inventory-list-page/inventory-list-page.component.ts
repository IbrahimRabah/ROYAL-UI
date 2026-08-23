import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { InventoryAdminResponse } from '../../../../../core/models';
import { AdminInventoryApiService } from '../../../../../core/services/api/admin-inventory-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { APP_CONFIG } from '../../../../../core/constants/app-config';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { FlatCategoryOption, flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';

type SortOption = 'available_asc' | 'available_desc';

@Component({
  selector: 'app-inventory-list-page',
  templateUrl: './inventory-list-page.component.html',
  styleUrl: './inventory-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventoryApi = inject(AdminInventoryApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly listReturn = inject(AdminListReturnService);

  readonly pageSize = APP_CONFIG.pagination.inventory.size;

  // '' and 'low-stock' are distinct route configs pointing at this same component, per
  // the task ("don't build a separate page component, drift out of sync otherwise") — read
  // once, safe because Angular recreates the component instance across distinct route
  // configs even when they share a component class (see product-form-page's 'new'/':id').
  readonly isLowStockRoute = this.route.snapshot.data['lowStockOnly'] === true;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly searchText = computed(() => this.queryParamMap().get('q') ?? '');
  readonly lowStockOnly = computed(() => {
    const raw = this.queryParamMap().get('lowStockOnly');
    return raw !== null ? raw === 'true' : this.isLowStockRoute;
  });
  readonly outOfStockOnly = computed(() => this.queryParamMap().get('outOfStockOnly') === 'true');
  readonly categoryId = computed(() => {
    const raw = this.queryParamMap().get('categoryId');
    return raw ? Number(raw) : null;
  });
  readonly sort = computed<SortOption>(() => (this.queryParamMap().get('sort') === 'available_desc' ? 'available_desc' : 'available_asc'));
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly searchDraft = signal('');
  readonly rows = signal<InventoryAdminResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly categoryOptions = signal<FlatCategoryOption[]>([]);

  readonly receiveDialogVariantId = signal<number | null>(null);
  readonly adjustDialogVariantId = signal<number | null>(null);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchDraft.set(this.searchText());

    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => this.updateQueryParams({ q: value || null, page: null }));

    this.taxonomyApi.listCategories().subscribe({ next: (tree) => this.categoryOptions.set(flattenCategoryTree(tree)), error: () => {} });

    // Server-side filtering/sorting/pagination — refetch whenever any of these change.
    effect(() => {
      this.searchText();
      this.lowStockOnly();
      this.outOfStockOnly();
      this.categoryId();
      this.sort();
      this.page();
      // Both /admin/inventory and /admin/inventory/low-stock share this component and
      // this group key — whichever the operator is actually on wins, so a back link from
      // movements returns to the right one of the two, filtered and paginated.
      this.listReturn.remember('/admin/inventory', this.router.url);
      this.fetchRows();
    }, { allowSignalWrites: true });
  }

  statusInfo(row: InventoryAdminResponse): { labelKey: string; tone: StatusTone } {
    if (row.qtyAvailable <= 0) {
      return { labelKey: 'admin.inventory.status.outOfStock', tone: 'stop' };
    }
    if (row.qtyAvailable <= row.minStockLevel) {
      return { labelKey: 'admin.inventory.status.low', tone: 'warn' };
    }
    return { labelKey: 'admin.inventory.status.inStock', tone: 'ok' };
  }

  onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
    this.searchInput$.next(value);
  }

  onLowStockToggle(value: boolean): void {
    this.updateQueryParams({ lowStockOnly: value ? 'true' : null, page: null });
  }

  onOutOfStockToggle(value: boolean): void {
    this.updateQueryParams({ outOfStockOnly: value ? 'true' : null, page: null });
  }

  onCategoryChange(categoryId: number | null): void {
    this.updateQueryParams({ categoryId, page: null });
  }

  onSortChange(sort: SortOption): void {
    this.updateQueryParams({ sort: sort === 'available_desc' ? sort : null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetchRows();
  }

  openReceiveDialog(row: InventoryAdminResponse): void {
    this.receiveDialogVariantId.set(row.variantId);
  }

  openAdjustDialog(row: InventoryAdminResponse): void {
    this.adjustDialogVariantId.set(row.variantId);
  }

  onDialogClosed(): void {
    this.receiveDialogVariantId.set(null);
    this.adjustDialogVariantId.set(null);
  }

  // Successful write, or a stale CONCURRENT_STOCK_CHANGE conflict the interceptor already
  // toasted about — either way, close the dialog and refetch so the row reflects the truth.
  onDialogSettled(): void {
    this.onDialogClosed();
    this.fetchRows();
  }

  private fetchRows(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventoryApi
      .list({
        q: this.searchText() || undefined,
        lowStockOnly: this.lowStockOnly(),
        outOfStockOnly: this.outOfStockOnly(),
        categoryId: this.categoryId() ?? undefined,
        sort: this.sort(),
        page: this.page(),
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.content);
          this.totalElements.set(res.totalElements);
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
