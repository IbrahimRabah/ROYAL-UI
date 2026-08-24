import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Money, RemittanceResponse, money } from '../../../../../core/models';
import { RemittanceStatus } from '../../../../../core/enums/remittance-status';
import { Language } from '../../../../../core/enums/language';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import {
  REMITTANCE_STATUS_LABELS_AR,
  REMITTANCE_STATUS_LABELS_EN,
  REMITTANCE_STATUS_TONE,
} from '../../../../../core/constants/remittance-status.constants';
import { AdminRemittanceApiService } from '../../../../../core/services/api/admin-remittance-api.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// GET /admin/remittances is a plain paginated list — no aggregate/totals field in the
// contract, and no separate summary endpoint. At this app's data size, one request for
// "everything" (a generously large `size`) and filtering/summing client-side is simpler
// and, critically, more correct than juggling multiple page requests: it's the only way
// the summary card can reflect the SAME filtered set the table shows rather than just
// whatever happened to be on the current server page. If remittance volume ever outgrows
// this, the right fix is a backend aggregate endpoint, not paging through thousands of
// rows client-side.
const FETCH_ALL_SIZE = 2000;

@Component({
  selector: 'app-remittance-list-page',
  templateUrl: './remittance-list-page.component.html',
  styleUrl: './remittance-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemittanceListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly remittanceApi = inject(AdminRemittanceApiService);
  private readonly listReturn = inject(AdminListReturnService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly pageSize = 20;
  readonly RemittanceStatus = RemittanceStatus;
  readonly statusOptions = Object.values(RemittanceStatus);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly status = computed<RemittanceStatus | null>(() => {
    const raw = this.queryParamMap().get('status');
    return raw && (Object.values(RemittanceStatus) as string[]).includes(raw) ? (raw as RemittanceStatus) : null;
  });

  readonly courier = computed(() => this.queryParamMap().get('courier') ?? '');
  readonly dateFrom = computed(() => this.queryParamMap().get('dateFrom'));
  readonly dateTo = computed(() => this.queryParamMap().get('dateTo'));
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly dateFromDate = computed(() => (this.dateFrom() ? new Date(this.dateFrom()!) : null));
  readonly dateToDate = computed(() => (this.dateTo() ? new Date(this.dateTo()!) : null));

  readonly hasActiveFilters = computed(() => !!(this.status() || this.dateFrom() || this.dateTo() || this.courier()));

  readonly filtersOpen = signal(false);
  readonly allRows = signal<RemittanceResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  // Every courier name actually seen, for the filter dropdown — an exact-match select
  // rather than free text, so "read the figures for this one courier" never misses a row
  // to a typo or a partial-name mismatch.
  readonly courierOptions = computed(() => {
    const names = new Set(this.allRows().map((r) => r.courierName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  });

  // The filtered set — courier/status/date-range applied client-side, since none of them
  // are server query params. Both the table and the summary derive from this SAME array,
  // so the summary can never drift from what's actually on screen.
  readonly filteredRows = computed<RemittanceResponse[]>(() => {
    let content = this.allRows();

    const status = this.status();
    if (status) {
      content = content.filter((r) => r.status === status);
    }

    const courier = this.courier();
    if (courier) {
      content = content.filter((r) => r.courierName === courier);
    }

    const from = this.dateFrom();
    if (from) {
      const fromTime = new Date(from).getTime();
      content = content.filter((r) => new Date(r.settlementDate).getTime() >= fromTime);
    }

    const to = this.dateTo();
    if (to) {
      const toTime = new Date(to).getTime() + 24 * 3_600_000 - 1;
      content = content.filter((r) => new Date(r.settlementDate).getTime() <= toTime);
    }

    return content;
  });

  readonly totalElements = computed(() => this.filteredRows().length);

  readonly pagedRows = computed(() => {
    const start = this.page() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  // ═══ Summary — cumulative over the filtered set, not just the current page ═══

  // A cancelled remittance's orders return to unpaid and reappear in outstanding — its
  // expected/received amounts are no longer real money owed or collected, so counting
  // them here would double-count against outstanding. The table still shows cancelled
  // rows (the history matters); only the summary figures exclude them.
  readonly summaryActiveRows = computed(() => this.filteredRows().filter((r) => r.status !== RemittanceStatus.CANCELLED));
  readonly summaryCancelledCount = computed(
    () => this.filteredRows().length - this.summaryActiveRows().length,
  );

  readonly summaryExpected = computed(() => this.summaryActiveRows().reduce((sum, r) => sum + money(r.expectedAmount), 0));
  readonly summaryReceived = computed(() => this.summaryActiveRows().reduce((sum, r) => sum + money(r.receivedAmount), 0));
  // Summed from each row's own `difference` (received − expected, the backend's sign
  // convention — negative is short) rather than re-derived as expected − received, which
  // would silently flip the sign relative to every per-row figure on this same screen.
  readonly summaryDifference = computed(() => this.summaryActiveRows().reduce((sum, r) => sum + money(r.difference), 0));
  // Any non-zero difference, not just status === SHORT — a settlement can be CANCELLED
  // (excluded above) or otherwise carry a difference without that exact status, and the
  // count must agree with the total it's derived alongside, not with a status label.
  readonly summaryShortCount = computed(
    () => this.summaryActiveRows().filter((r) => Math.abs(money(r.difference)) >= 0.005).length,
  );
  readonly summaryTotalCount = computed(() => this.summaryActiveRows().length);

  readonly summaryDiffClass = computed(() => {
    const diff = this.summaryDifference();
    if (Math.abs(diff) < 0.005) return 'rlp__diff--ok';
    return diff < 0 ? 'rlp__diff--stop' : 'rlp__diff--warn';
  });

  readonly summaryDiffSign = computed(() => (this.summaryDifference() > 0.005 ? '+' : ''));

  constructor() {
    // Filters/page live in the URL for bookmarking and the back-link, but since every row
    // is already fetched once, changing them never needs a new request — only remember().
    effect(() => {
      this.status();
      this.courier();
      this.dateFrom();
      this.dateTo();
      this.page();
      this.listReturn.remember('/admin/remittances', this.router.url);
    });

    this.fetch();
  }

  statusLabel(status: RemittanceStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? REMITTANCE_STATUS_LABELS_AR : REMITTANCE_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: RemittanceStatus): StatusTone {
    return REMITTANCE_STATUS_TONE[status];
  }

  formatAmount(value: Money | number): string {
    return NUMBER_FORMATTER.format(typeof value === 'number' ? value : money(value));
  }

  diffClass(row: RemittanceResponse): string {
    const diff = money(row.difference);
    if (Math.abs(diff) < 0.005) return 'rlp__diff--ok';
    return diff < 0 ? 'rlp__diff--stop' : 'rlp__diff--warn';
  }

  diffSign(row: RemittanceResponse): string {
    const diff = money(row.difference);
    if (diff > 0) return '+';
    return '';
  }

  onCourierChange(value: string | null): void {
    this.updateQueryParams({ courier: value, page: null });
  }

  onStatusChange(value: RemittanceStatus | null): void {
    this.updateQueryParams({ status: value, page: null });
  }

  onDateFromChange(date: Date | null): void {
    this.updateQueryParams({ dateFrom: toIsoDate(date), page: null });
  }

  onDateToChange(date: Date | null): void {
    this.updateQueryParams({ dateTo: toIsoDate(date), page: null });
  }

  clearFilters(): void {
    this.updateQueryParams({ status: null, dateFrom: null, dateTo: null, courier: null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);

    this.remittanceApi.list(0, FETCH_ALL_SIZE).subscribe({
      next: (res) => {
        this.allRows.set(res.content);
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

function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
