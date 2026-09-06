import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { GovernorateResponse, Money, OrderSummaryResponse, money } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../../../core/enums/payment-status';
import { Language } from '../../../../../core/enums/language';
import {
  CONSEQUENCE_STATUSES,
  FULFILLMENT_STATUS_LABELS_AR,
  FULFILLMENT_STATUS_LABELS_EN,
  FULFILLMENT_STATUS_TONE,
  FULFILLMENT_TRANSITIONS,
  NOTE_REQUIRED_STATUSES,
  PAYMENT_STATUS_LABELS_AR,
  PAYMENT_STATUS_LABELS_EN,
  PAYMENT_STATUS_TONE,
  StatusTone,
} from '../../../../../core/constants/order-status.constants';
import { AdminOrderApiService } from '../../../../../core/services/api/admin-order-api.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { GeoApiService } from '../../../../../core/services/api/geo-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';
import { OrderListFilters } from '../../components/order-filters-bar/order-filters-bar.component';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface StatusTab {
  key: string;
  status: FulfillmentStatus | null;
  labelKey: string;
}

const TABS: StatusTab[] = [
  { key: 'all', status: null, labelKey: 'admin.orders.tabs.all' },
  { key: 'PENDING', status: FulfillmentStatus.PENDING, labelKey: 'admin.orders.tabs.pendingConfirmation' },
  { key: 'CONFIRMED', status: FulfillmentStatus.CONFIRMED, labelKey: 'admin.orders.tabs.confirmed' },
  { key: 'PROCESSING', status: FulfillmentStatus.PROCESSING, labelKey: 'admin.orders.tabs.processing' },
  { key: 'SHIPPED', status: FulfillmentStatus.SHIPPED, labelKey: 'admin.orders.tabs.shipped' },
  { key: 'DELIVERED', status: FulfillmentStatus.DELIVERED, labelKey: 'admin.orders.tabs.delivered' },
  { key: 'CANCELLED', status: FulfillmentStatus.CANCELLED, labelKey: 'admin.orders.tabs.failedCancelled' },
];

function isPhoneLike(text: string): boolean {
  const digitsOnly = text.trim().replace(/[\s-]/g, '');
  return /^\+?\d{4,}$/.test(digitsOnly);
}

@Component({
  selector: 'app-order-list-page',
  templateUrl: './order-list-page.component.html',
  styleUrl: './order-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderApi = inject(AdminOrderApiService);
  private readonly listReturn = inject(AdminListReturnService);
  private readonly geoApi = inject(GeoApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly tabs = TABS;
  readonly pageSize = 20;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly activeStatus = computed<FulfillmentStatus | null>(() => {
    const raw = this.queryParamMap().get('status');
    return raw && (Object.values(FulfillmentStatus) as string[]).includes(raw) ? (raw as FulfillmentStatus) : null;
  });

  readonly activeTabKey = computed(() => this.tabs.find((t) => t.status === this.activeStatus())?.key ?? 'all');

  readonly searchText = computed(() => this.queryParamMap().get('q') ?? '');
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly filters = computed<OrderListFilters>(() => ({
    dateFrom: this.queryParamMap().get('dateFrom'),
    dateTo: this.queryParamMap().get('dateTo'),
    governorateId: this.queryParamMap().get('governorateId') ? Number(this.queryParamMap().get('governorateId')) : null,
    paymentStatus: this.queryParamMap().get('paymentStatus') as PaymentStatus | null,
  }));

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!(f.dateFrom || f.dateTo || f.governorateId || f.paymentStatus);
  });

  readonly searchDraft = signal('');
  readonly governorates = signal<GovernorateResponse[]>([]);
  readonly tabCounts = signal<Record<string, number>>({});

  readonly rows = signal<OrderSummaryResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly confirmDialogOrderId = signal<number | null>(null);
  readonly firing = signal<{ rowId: number; status: FulfillmentStatus } | null>(null);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchDraft.set(this.searchText());

    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.updateQueryParams({ q: value || null, page: null }));

    this.geoApi.getGovernorates().subscribe({ next: (g) => this.governorates.set(g), error: () => {} });
    this.fetchTabCounts();

    let first = true;
    effect(
      () => {
        const status = this.activeStatus();
        const search = this.searchText();
        const page = this.page();
        const filters = this.filters();
        if (!first) {
          this.searchDraft.set(search);
        }
        first = false;
        this.listReturn.remember('/admin/orders', this.router.url);
        this.fetch(status, search, page, filters);
      },
      { allowSignalWrites: true },
    );
  }

  statusLabel(status: FulfillmentStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? FULFILLMENT_STATUS_LABELS_AR : FULFILLMENT_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: FulfillmentStatus): StatusTone {
    return FULFILLMENT_STATUS_TONE[status];
  }

  paymentStatusLabel(status: PaymentStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? PAYMENT_STATUS_LABELS_AR : PAYMENT_STATUS_LABELS_EN;
    return labels[status];
  }

  paymentStatusTone(status: PaymentStatus): StatusTone {
    return PAYMENT_STATUS_TONE[status];
  }

  formatMoney(value: Money): string {
    return MONEY_FORMATTER.format(money(value));
  }

  hoursWaiting(row: OrderSummaryResponse): number {
    return (Date.now() - new Date(row.placedAt).getTime()) / 3_600_000;
  }

  staleClass(row: OrderSummaryResponse): string {
    const hours = this.hoursWaiting(row);
    if (hours > 48) return 'order-list-page__row--stale-stop';
    if (hours > 24) return 'order-list-page__row--stale-warn';
    return '';
  }

  waitingLabel(row: OrderSummaryResponse): string {
    const hours = this.hoursWaiting(row);
    if (hours < 24) {
      return this.translate.instant('admin.orders.list.waitingHours', { hours: Math.max(1, Math.round(hours)) });
    }
    return this.translate.instant('admin.orders.list.waitingDays', { days: Math.round(hours / 24) });
  }

  quickTransitions(row: OrderSummaryResponse): readonly FulfillmentStatus[] {
    return FULFILLMENT_TRANSITIONS[row.fulfillmentStatus] ?? [];
  }

  isDirectFireable(status: FulfillmentStatus): boolean {
    return !NOTE_REQUIRED_STATUSES.includes(status) && !CONSEQUENCE_STATUSES.includes(status);
  }

  openConfirmDialog(row: OrderSummaryResponse): void {
    this.confirmDialogOrderId.set(row.id);
  }

  onConfirmed(): void {
    this.confirmDialogOrderId.set(null);
    this.refetch();
  }

  isFiring(row: OrderSummaryResponse, status: FulfillmentStatus): boolean {
    const firing = this.firing();
    return firing !== null && firing.rowId === row.id && firing.status === status;
  }

  fireTransition(row: OrderSummaryResponse, status: FulfillmentStatus): void {
    if (this.firing() !== null) {
      return;
    }
    this.firing.set({ rowId: row.id, status });
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.orderApi.setFulfillment(row.id, { status }).subscribe({
      next: () => {
        this.firing.set(null);
        this.toast.success(this.translate.instant('toast.orders.statusChanged', { status: this.statusLabel(status) }));
        this.refetch();
      },
      error: (err: unknown) => {
        this.firing.set(null);
        const result = handleAdminMutationError(err, this.toast, lang);
        if (result.isConflict && result.message) {
          this.toast.error(result.message);
        }
        this.refetch();
      },
    });
  }

  selectTab(tab: StatusTab): void {
    this.updateQueryParams({ status: tab.status, page: null });
  }

  onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
    this.searchInput$.next(value);
  }

  applyFilters(filters: OrderListFilters): void {
    this.updateQueryParams({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      governorateId: filters.governorateId,
      paymentStatus: filters.paymentStatus,
      page: null,
    });
  }

  clearFilters(): void {
    this.updateQueryParams({ dateFrom: null, dateTo: null, governorateId: null, paymentStatus: null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetch(this.activeStatus(), this.searchText(), this.page(), this.filters());
  }

  private refetch(): void {
    this.fetch(this.activeStatus(), this.searchText(), this.page(), this.filters());
  }

  private fetch(status: FulfillmentStatus | null, search: string, page: number, filters: OrderListFilters): void {
    this.loading.set(true);
    this.error.set(false);

    const trimmed = search.trim();
    const phone = trimmed && isPhoneLike(trimmed) ? trimmed : undefined;

    this.orderApi.list(status ?? undefined, phone, page, this.pageSize).subscribe({
      next: (res) => {
        let content = res.content;

        if (trimmed && !phone) {
          const q = trimmed.toLowerCase();
          content = content.filter((r) => r.orderNumber.toLowerCase().includes(q));
        }

        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom).getTime();
          content = content.filter((r) => new Date(r.placedAt).getTime() >= from);
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo).getTime() + 24 * 3_600_000 - 1;
          content = content.filter((r) => new Date(r.placedAt).getTime() <= to);
        }
        if (filters.governorateId) {
          const gov = this.governorates().find((g) => g.id === filters.governorateId);
          if (gov) {
            content = content.filter((r) => r.governorateName === gov.name);
          }
        }
        if (filters.paymentStatus) {
          content = content.filter((r) => r.paymentStatus === filters.paymentStatus);
        }

        this.rows.set(content);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private fetchTabCounts(): void {
    forkJoin(
      this.tabs.map((tab) =>
        this.orderApi.list(tab.status ?? undefined, undefined, 0, 1).pipe(
          map((res) => res.totalElements),
          catchError(() => of(0)),
        ),
      ),
    ).subscribe((counts) => {
      const map: Record<string, number> = {};
      this.tabs.forEach((tab, i) => (map[tab.key] = counts[i]));
      this.tabCounts.set(map);
    });
  }

  private updateQueryParams(partial: Record<string, string | number | null | undefined>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: partial, queryParamsHandling: 'merge' });
  }
}
