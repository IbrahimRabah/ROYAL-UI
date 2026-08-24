import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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

  readonly courierDraft = signal('');
  readonly filtersOpen = signal(false);
  readonly rows = signal<RemittanceResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  private readonly courierInput$ = new Subject<string>();

  constructor() {
    this.courierDraft.set(this.courier());

    this.courierInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.updateQueryParams({ courier: value || null, page: null }));

    let first = true;
    effect(
      () => {
        const page = this.page();
        this.status();
        this.courier();
        this.dateFrom();
        this.dateTo();
        if (!first) {
          this.courierDraft.set(this.courier());
        }
        first = false;
        this.listReturn.remember('/admin/remittances', this.router.url);
        this.fetch(page);
      },
      { allowSignalWrites: true },
    );
  }

  statusLabel(status: RemittanceStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? REMITTANCE_STATUS_LABELS_AR : REMITTANCE_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: RemittanceStatus): StatusTone {
    return REMITTANCE_STATUS_TONE[status];
  }

  formatAmount(value: Money): string {
    return NUMBER_FORMATTER.format(money(value));
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

  onCourierDraftChange(value: string): void {
    this.courierDraft.set(value);
    this.courierInput$.next(value);
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
    this.courierDraft.set('');
    this.updateQueryParams({ status: null, dateFrom: null, dateTo: null, courier: null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetch(this.page());
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.error.set(false);

    this.remittanceApi.list(page, this.pageSize).subscribe({
      next: (res) => {
        let content = res.content;

        // GET /admin/remittances has no filter query params — courier/status/date-range
        // are applied client-side over the fetched page, same approach as invoices/orders.
        const status = this.status();
        if (status) {
          content = content.filter((r) => r.status === status);
        }

        const courierQuery = this.courier().trim().toLowerCase();
        if (courierQuery) {
          content = content.filter((r) => r.courierName.toLowerCase().includes(courierQuery));
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
