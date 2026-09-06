import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { InvoiceResponse, Money, money } from '../../../../../core/models';
import { InvoiceStatus } from '../../../../../core/enums/invoice-status';
import { Language } from '../../../../../core/enums/language';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import {
  INVOICE_STATUS_LABELS_AR,
  INVOICE_STATUS_LABELS_EN,
  INVOICE_STATUS_TONE,
} from '../../../../../core/constants/invoice-status.constants';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-invoice-list-page',
  templateUrl: './invoice-list-page.component.html',
  styleUrl: './invoice-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly listReturn = inject(AdminListReturnService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly pageSize = 20;
  readonly InvoiceStatus = InvoiceStatus;
  readonly statusOptions = Object.values(InvoiceStatus);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly status = computed<InvoiceStatus | null>(() => {
    const raw = this.queryParamMap().get('status');
    return raw && (Object.values(InvoiceStatus) as string[]).includes(raw) ? (raw as InvoiceStatus) : null;
  });

  readonly search = computed(() => this.queryParamMap().get('q') ?? '');
  readonly dateFrom = computed(() => this.queryParamMap().get('dateFrom'));
  readonly dateTo = computed(() => this.queryParamMap().get('dateTo'));
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly dateFromDate = computed(() => (this.dateFrom() ? new Date(this.dateFrom()!) : null));
  readonly dateToDate = computed(() => (this.dateTo() ? new Date(this.dateTo()!) : null));

  readonly hasActiveFilters = computed(() => !!(this.status() || this.dateFrom() || this.dateTo() || this.search()));

  readonly searchDraft = signal('');
  readonly filtersOpen = signal(false);
  readonly rows = signal<InvoiceResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly downloadingId = signal<number | null>(null);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchDraft.set(this.search());

    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.updateQueryParams({ q: value || null, page: null }));

    let first = true;
    effect(
      () => {
        const page = this.page();
        this.status();
        this.search();
        this.dateFrom();
        this.dateTo();
        if (!first) {
          this.searchDraft.set(this.search());
        }
        first = false;
        this.listReturn.remember('/admin/invoices', this.router.url);
        this.fetch(page);
      },
      { allowSignalWrites: true },
    );
  }

  statusLabel(status: InvoiceStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? INVOICE_STATUS_LABELS_AR : INVOICE_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: InvoiceStatus): StatusTone {
    return INVOICE_STATUS_TONE[status];
  }

  formatAmount(value: Money): string {
    return NUMBER_FORMATTER.format(money(value));
  }

  onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
    this.searchInput$.next(value);
  }

  onStatusChange(value: InvoiceStatus | null): void {
    this.updateQueryParams({ status: value, page: null });
  }

  onDateFromChange(date: Date | null): void {
    this.updateQueryParams({ dateFrom: toIsoDate(date), page: null });
  }

  onDateToChange(date: Date | null): void {
    this.updateQueryParams({ dateTo: toIsoDate(date), page: null });
  }

  clearFilters(): void {
    this.searchDraft.set('');
    this.updateQueryParams({ status: null, dateFrom: null, dateTo: null, q: null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetch(this.page());
  }

  downloadPdf(row: InvoiceResponse): void {
    if (!isPlatformBrowser(this.platformId) || this.downloadingId() !== null) {
      return;
    }
    this.downloadingId.set(row.id);
    this.invoiceApi.downloadPdf(row.id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${row.invoiceNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloadingId.set(null),
    });
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.error.set(false);

    this.invoiceApi.list(page, this.pageSize).subscribe({
      next: (res) => {
        let content = res.content;
        const status = this.status();
        if (status) {
          content = content.filter((r) => r.status === status);
        }

        const q = this.search().trim().toLowerCase();
        if (q) {
          content = content.filter(
            (r) => r.invoiceNumber.toLowerCase().includes(q) || r.orderNumber.toLowerCase().includes(q),
          );
        }

        const from = this.dateFrom();
        if (from) {
          const fromTime = new Date(from).getTime();
          content = content.filter((r) => new Date(r.issuedAt).getTime() >= fromTime);
        }

        const to = this.dateTo();
        if (to) {
          const toTime = new Date(to).getTime() + 24 * 3_600_000 - 1;
          content = content.filter((r) => new Date(r.issuedAt).getTime() <= toTime);
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
