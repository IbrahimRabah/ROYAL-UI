import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import {
  AdminGovernorateResponse,
  CUSTOM_REQUEST_PIPELINE,
  CUSTOM_REQUEST_TYPES,
  CustomRequestListFilter,
  CustomRequestStatus,
  CustomRequestSummary,
  CustomRequestType,
} from '../../../../../core/models';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { Language } from '../../../../../core/enums/language';
import { AdminCustomRequestApiService } from '../../../../../core/services/api/admin-custom-request-api.service';
import { AdminShippingApiService } from '../../../../../core/services/api/admin-shipping-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

const PAGE_SIZE = 100;
const ROWS_PER_PAGE = 20;
const HOUR_MS = 3_600_000;

export const REQUEST_STATUS_TONE: Record<CustomRequestStatus, StatusTone> = {
  NEW: 'stop',
  CONTACTED: 'warn',
  QUOTED: 'info',
  ACCEPTED: 'ok',
  REJECTED: 'muted',
  CONVERTED: 'ok',
};

export const REQUEST_TYPE_TONE: Record<CustomRequestType, StatusTone> = {
  SIZE_VARIANT: 'blue',
  MADE_TO_ORDER: 'violet',
  CUSTOM_WORK: 'info',
};

/** Still in play — worked oldest first. The rest are history, newest first. */
const OPEN_STATUSES: CustomRequestStatus[] = ['NEW', 'CONTACTED', 'QUOTED'];

@Component({
  selector: 'app-request-list-page',
  templateUrl: './request-list-page.component.html',
  styleUrl: './request-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminCustomRequestApiService);
  private readonly shippingApi = inject(AdminShippingApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly pipeline = CUSTOM_REQUEST_PIPELINE;
  readonly types = CUSTOM_REQUEST_TYPES;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly statusFilter = computed<CustomRequestStatus | null>(() => {
    const raw = this.queryParamMap().get('status') as CustomRequestStatus | null;
    return raw && CUSTOM_REQUEST_PIPELINE.includes(raw) ? raw : null;
  });
  readonly typeFilter = computed<CustomRequestType | null>(() => {
    const raw = this.queryParamMap().get('type') as CustomRequestType | null;
    return raw && CUSTOM_REQUEST_TYPES.includes(raw) ? raw : null;
  });
  readonly governorateFilter = computed(() => {
    const raw = this.queryParamMap().get('governorateId');
    return raw ? Number(raw) : null;
  });
  readonly searchText = computed(() => this.queryParamMap().get('q') ?? '');
  readonly fromDate = computed(() => this.queryParamMap().get('from') ?? '');
  readonly toDate = computed(() => this.queryParamMap().get('to') ?? '');
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly searchDraft = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  readonly filtersOpen = signal(false);

  readonly items = signal<CustomRequestSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly governorates = signal<AdminGovernorateResponse[]>([]);
  /** The list rows carry only a governorate NAME, so closed ones are found by name (both languages). */
  private readonly closedNames = computed(() => {
    const closed = new Set<string>();
    for (const g of this.governorates()) {
      if (!g.served) {
        closed.add(g.nameAr);
        closed.add(g.nameEn);
      }
    }
    return closed;
  });

  private readonly now = Date.now();
  private readonly search$ = new Subject<string>();

  readonly counts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = { all: this.items().length };
    for (const status of CUSTOM_REQUEST_PIPELINE) counts[status] = 0;
    for (const item of this.items()) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  });

  /** NEW first; open requests oldest first (a work queue), finished ones newest first. */
  readonly sortedRows = computed(() => {
    const status = this.statusFilter();
    const rank = (s: CustomRequestStatus) => CUSTOM_REQUEST_PIPELINE.indexOf(s);
    return this.items()
      .filter((item) => !status || item.status === status)
      .sort((a, b) => {
        if (a.status !== b.status) return rank(a.status) - rank(b.status);
        const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
        return OPEN_STATUSES.includes(a.status) ? diff : -diff;
      });
  });

  readonly pageRows = computed(() => this.sortedRows().slice(this.page() * ROWS_PER_PAGE, (this.page() + 1) * ROWS_PER_PAGE));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / ROWS_PER_PAGE)));
  readonly hasFilters = computed(() => !!(this.typeFilter() || this.governorateFilter() || this.searchText() || this.fromDate() || this.toDate()));

  constructor() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => this.setParams({ q: value || null, page: null }));

    this.shippingApi.getGovernorates().subscribe({ next: (g) => this.governorates.set(g), error: () => {} });
    this.fetch();
  }

  // ---------------------------------------------------------------- display

  govLabel(gov: AdminGovernorateResponse): string {
    return this.languageStore.lang() === Language.AR ? gov.nameAr : gov.nameEn;
  }

  isClosed(row: CustomRequestSummary): boolean {
    return !!row.governorateName && this.closedNames().has(row.governorateName);
  }

  statusTone(status: CustomRequestStatus): StatusTone {
    return REQUEST_STATUS_TONE[status];
  }

  typeTone(type: CustomRequestType): StatusTone {
    return REQUEST_TYPE_TONE[type];
  }

  telHref(phone: string): string {
    return 'tel:' + (phone.startsWith('0') ? '+2' + phone : phone);
  }

  ageHours(row: CustomRequestSummary): number {
    return Math.max(0, Math.floor((this.now - Date.parse(row.createdAt)) / HOUR_MS));
  }

  /** Only an uncontacted request is a customer waiting by the phone. */
  ageLevel(row: CustomRequestSummary): 'ok' | 'warn' | 'stop' {
    if (row.status !== 'NEW') return 'ok';
    const hours = this.ageHours(row);
    return hours >= 48 ? 'stop' : hours >= 24 ? 'warn' : 'ok';
  }

  ageDays(row: CustomRequestSummary): number {
    return Math.floor(this.ageHours(row) / 24);
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  }

  // ---------------------------------------------------------------- filters

  selectStatus(status: CustomRequestStatus | null): void {
    this.setParams({ status, page: null });
  }

  onSearch(value: string): void {
    this.searchDraft.set(value);
    this.search$.next(value);
  }

  setFilter(key: 'type' | 'governorateId' | 'from' | 'to', value: string): void {
    this.setParams({ [key]: value || null, page: null });
    this.fetch({ [key]: value || undefined } as Partial<Record<string, string | undefined>>);
  }

  clearFilters(): void {
    this.searchDraft.set('');
    this.setParams({ type: null, governorateId: null, q: null, from: null, to: null, page: null });
    this.fetch({ type: undefined, governorateId: undefined, q: undefined, from: undefined, to: undefined });
  }

  goToPage(page: number): void {
    this.setParams({ page: page === 0 ? null : page });
  }

  retry(): void {
    this.fetch();
  }

  private setParams(partial: Record<string, string | number | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: partial, queryParamsHandling: 'merge' });
    if ('q' in partial) this.fetch({ q: (partial['q'] as string | null) ?? undefined });
  }

  /**
   * Everything except the status tab is filtered by the server (so the tab counts reflect the other
   * filters); the status tab filters client-side. `q` is passed untouched — the server normalises
   * Arabic and phone formats.
   */
  private fetch(override: Partial<Record<string, string | undefined>> = {}): void {
    const get = (key: string, current: string | null) => (key in override ? (override[key] ?? null) : current);
    const governorateId = get('governorateId', this.governorateFilter() ? String(this.governorateFilter()) : null);
    const filter: CustomRequestListFilter = {
      type: (get('type', this.typeFilter()) as CustomRequestType | null) ?? undefined,
      governorateId: governorateId ? Number(governorateId) : undefined,
      q: get('q', this.searchText()) ?? undefined,
      from: get('from', this.fromDate()) || undefined,
      to: get('to', this.toDate()) || undefined,
    };

    this.loading.set(true);
    this.error.set(false);
    this.api
      .list(filter, 0, PAGE_SIZE)
      .pipe(
        switchMap((first) => {
          if (first.totalPages <= 1) return of(first.content);
          const rest = Array.from({ length: first.totalPages - 1 }, (_, i) => this.api.list(filter, i + 1, PAGE_SIZE));
          return forkJoin(rest).pipe(switchMap((pages) => of([...first.content, ...pages.flatMap((p) => p.content)])));
        }),
      )
      .subscribe({
        next: (content) => {
          this.items.set(content);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
