import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { PortfolioAdminResponse, PortfolioState, portfolioState } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { AdminPortfolioApiService } from '../../../../../core/services/api/admin-portfolio-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { FlatCategoryOption, flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';

type StateFilter = 'all' | 'draft' | 'published' | 'archived';
const STATE_FILTERS: StateFilter[] = ['all', 'draft', 'published', 'archived'];
const PAGE_SIZE = 100;

const STATE_TONE: Record<PortfolioState, StatusTone> = {
  DRAFT: 'warn',
  PUBLISHED: 'ok',
  ARCHIVED: 'muted',
};

@Component({
  selector: 'app-portfolio-list-page',
  templateUrl: './portfolio-list-page.component.html',
  styleUrl: './portfolio-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminPortfolioApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly stateFilters = STATE_FILTERS;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly stateFilter = computed<StateFilter>(() => {
    const raw = this.queryParamMap().get('state') as StateFilter | null;
    return raw && STATE_FILTERS.includes(raw) ? raw : 'all';
  });
  readonly categoryFilter = computed(() => {
    const raw = this.queryParamMap().get('categoryId');
    return raw ? Number(raw) : null;
  });

  readonly items = signal<PortfolioAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly busyId = signal<number | null>(null);
  readonly categoryOptions = signal<FlatCategoryOption[]>([]);

  readonly rows = computed(() => {
    const filter = this.stateFilter();
    return this.items().filter((item) => {
      const state = portfolioState(item);
      if (filter === 'draft') return state === 'DRAFT';
      if (filter === 'published') return state === 'PUBLISHED';
      if (filter === 'archived') return state === 'ARCHIVED';
      return state !== 'ARCHIVED';
    });
  });

  /** Nothing exists at all (vs. nothing matching the filters). */
  readonly trulyEmpty = computed(() => !this.loading() && !this.error() && !this.items().length && this.stateFilter() === 'all' && this.categoryFilter() === null);

  constructor() {
    this.taxonomyApi.listCategories().subscribe({
      next: (tree) => this.categoryOptions.set(flattenCategoryTree(tree, this.languageStore.lang())),
      error: () => {},
    });
    this.fetch();
  }

  title(item: PortfolioAdminResponse): string {
    const lang = this.languageStore.lang();
    const primary = lang === Language.AR ? item.titleAr : item.titleEn;
    const fallback = lang === Language.AR ? item.titleEn : item.titleAr;
    return primary || fallback || item.slug;
  }

  state(item: PortfolioAdminResponse): PortfolioState {
    return portfolioState(item);
  }

  tone(item: PortfolioAdminResponse): StatusTone {
    return STATE_TONE[portfolioState(item)];
  }

  mainImage(item: PortfolioAdminResponse): string | null {
    const main = item.images.find((i) => i.main) ?? item.images[0];
    return main?.url ?? null;
  }

  mainAlt(item: PortfolioAdminResponse): string {
    const main = item.images.find((i) => i.main) ?? item.images[0];
    return (this.languageStore.lang() === Language.AR ? main?.altTextAr : main?.altTextEn) || this.title(item);
  }

  setState(filter: StateFilter): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { state: filter === 'all' ? null : filter }, queryParamsHandling: 'merge' });
    this.fetch(filter);
  }

  setCategory(value: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { categoryId: value || null }, queryParamsHandling: 'merge' });
    this.fetch(this.stateFilter(), value ? Number(value) : null);
  }

  retry(): void {
    this.fetch();
  }

  publish(item: PortfolioAdminResponse, published: boolean): void {
    this.run(item, this.api.setPublished(item.id, published), published ? 'toast.portfolio.published' : 'toast.portfolio.unpublished');
  }

  restore(item: PortfolioAdminResponse): void {
    this.run(item, this.api.restore(item.id), 'toast.portfolio.restored');
  }

  archive(item: PortfolioAdminResponse): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.portfolio.archiveConfirm.title', { name: this.title(item) }),
        message: this.translate.instant('admin.portfolio.archiveConfirm.message'),
        confirmLabel: this.translate.instant('admin.portfolio.archiveConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((ok) => {
        if (ok) this.run(item, this.api.archive(item.id), 'toast.portfolio.archived');
      });
  }

  private run(item: PortfolioAdminResponse, call: Observable<PortfolioAdminResponse>, toastKey: string): void {
    if (this.busyId() !== null) return;
    this.busyId.set(item.id);
    call.subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(this.translate.instant(toastKey));
        this.fetch(this.stateFilter(), this.categoryFilter(), false);
      },
      error: () => this.busyId.set(null),
    });
  }

  /** Archived items only come back when the filter asks for them (includeArchived defaults to false). */
  private fetch(filter: StateFilter = this.stateFilter(), categoryId: number | null = this.categoryFilter(), skeleton = true): void {
    if (skeleton) this.loading.set(true);
    this.error.set(false);
    const includeArchived = filter === 'archived';
    this.api
      .list(0, PAGE_SIZE, includeArchived, categoryId)
      .pipe(
        switchMap((first) => {
          if (first.totalPages <= 1) return of(first.content);
          const rest = Array.from({ length: first.totalPages - 1 }, (_, i) => this.api.list(i + 1, PAGE_SIZE, includeArchived, categoryId));
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
