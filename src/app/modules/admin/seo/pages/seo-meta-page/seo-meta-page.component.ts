import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SeoFilter, SeoMetaRequest, SeoRow } from '../../../../../core/models';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';
import { ToastService } from '../../../../../core/services/toast.service';

type Tab = 'products' | 'categories';

/** What Google shows before it cuts the text off. */
export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 155;

const FILTERS: SeoFilter[] = ['ALL', 'MISSING_TITLE', 'MISSING_DESCRIPTION', 'TOO_LONG', 'DUPLICATE', 'NO_FAQ'];
const PAGE_SIZE = 20;

/** The four texts of one row while it is being edited. */
type Draft = SeoMetaRequest;

/**
 * Meta titles and descriptions of products and categories, edited in place. Only these four texts can change
 * here: the name, price and URL of a product are not reachable from this screen.
 */
@Component({
  selector: 'app-seo-meta-page',
  templateUrl: './seo-meta-page.component.html',
  styleUrl: './seo-meta-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoMetaPageComponent {
  private readonly api = inject(AdminSeoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly titleLimit = TITLE_LIMIT;
  readonly descriptionLimit = DESCRIPTION_LIMIT;
  readonly filters = FILTERS;

  readonly tab = signal<Tab>('products');
  readonly filter = signal<SeoFilter>('ALL');
  readonly query = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);

  readonly rows = signal<SeoRow[]>([]);
  readonly drafts = signal<Record<number, Draft>>({});
  readonly saving = signal<number | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  private readonly search$ = new Subject<string>();

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('tab') === 'categories') {
      this.tab.set('categories');
    }
    const requested = params.get('filter') as SeoFilter | null;
    if (requested && FILTERS.includes(requested)) {
      this.filter.set(requested);
    }
    this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
      this.query.set(value);
      this.page.set(0);
      this.load();
    });
    this.load();
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.page.set(0);
    this.syncUrl();
    this.load();
  }

  setFilter(value: string): void {
    this.filter.set(value as SeoFilter);
    this.page.set(0);
    this.syncUrl();
    this.load();
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  goTo(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.page.set(page);
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    const request = this.tab() === 'products'
      ? this.api.products(this.query(), this.filter(), null, this.page(), PAGE_SIZE)
      : this.api.categories(this.query(), this.filter(), this.page(), PAGE_SIZE);
    request.subscribe({
      next: (result) => {
        this.rows.set(result.content);
        this.totalPages.set(result.totalPages);
        this.totalElements.set(result.totalElements);
        this.drafts.set(Object.fromEntries(result.content.map((r) => [r.id, this.draftOf(r)])));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------- editing

  draft(row: SeoRow): Draft {
    return this.drafts()[row.id] ?? this.draftOf(row);
  }

  edit(row: SeoRow, field: keyof Draft, value: string): void {
    this.drafts.update((all) => ({ ...all, [row.id]: { ...this.draft(row), [field]: value } }));
  }

  dirty(row: SeoRow): boolean {
    const d = this.draft(row);
    const o = this.draftOf(row);
    return (['metaTitleAr', 'metaDescriptionAr', 'metaTitleEn', 'metaDescriptionEn'] as (keyof Draft)[])
      .some((k) => (d[k] ?? '') !== (o[k] ?? ''));
  }

  overTitle(text: string | null | undefined): boolean {
    return (text ?? '').length > TITLE_LIMIT;
  }

  overDescription(text: string | null | undefined): boolean {
    return (text ?? '').length > DESCRIPTION_LIMIT;
  }

  revert(row: SeoRow): void {
    this.drafts.update((all) => ({ ...all, [row.id]: this.draftOf(row) }));
  }

  save(row: SeoRow): void {
    if (this.saving() !== null || !this.dirty(row)) {
      return;
    }
    this.saving.set(row.id);
    const body = this.draft(row);
    const call = this.tab() === 'products' ? this.api.updateProduct(row.id, body) : this.api.updateCategory(row.id, body);
    call.subscribe({
      next: (saved) => {
        this.saving.set(null);
        this.rows.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
        this.drafts.update((all) => ({ ...all, [saved.id]: this.draftOf(saved) }));
        this.toast.success(this.translate.instant('seo.meta.saved'));
      },
      error: () => this.saving.set(null),
    });
  }

  private draftOf(row: SeoRow): Draft {
    return {
      metaTitleAr: row.metaTitleAr ?? '',
      metaDescriptionAr: row.metaDescriptionAr ?? '',
      metaTitleEn: row.metaTitleEn ?? '',
      metaDescriptionEn: row.metaDescriptionEn ?? '',
    };
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.tab(), filter: this.filter() === 'ALL' ? null : this.filter() },
      replaceUrl: true,
    });
  }
}
