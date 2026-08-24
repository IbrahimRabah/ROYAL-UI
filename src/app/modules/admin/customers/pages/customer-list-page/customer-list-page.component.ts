import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CustomerSummaryResponse } from '../../../../../core/models';
import { AdminCustomerApiService } from '../../../../../core/services/api/admin-customer-api.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';

@Component({
  selector: 'app-customer-list-page',
  templateUrl: './customer-list-page.component.html',
  styleUrl: './customer-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerApi = inject(AdminCustomerApiService);
  private readonly listReturn = inject(AdminListReturnService);

  readonly pageSize = 25;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  // Passed to the API untouched — phone search is normalised server-side (an operator
  // typing 01012345678 must still find a customer stored as +201012345678).
  readonly search = computed(() => this.queryParamMap().get('q') ?? '');
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly searchDraft = signal('');
  readonly rows = signal<CustomerSummaryResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

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
        this.search();
        if (!first) {
          this.searchDraft.set(this.search());
        }
        first = false;
        this.listReturn.remember('/admin/customers', this.router.url);
        this.fetch(page);
      },
      { allowSignalWrites: true },
    );
  }

  isRepeatCustomer(row: CustomerSummaryResponse): boolean {
    return row.orderCount > 1;
  }

  onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
    this.searchInput$.next(value);
  }

  clearSearch(): void {
    this.searchDraft.set('');
    this.updateQueryParams({ q: null, page: null });
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

    this.customerApi.list(this.search() || undefined, 'spent_desc', page, this.pageSize).subscribe({
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
