import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, map } from 'rxjs';

import { PortfolioCategory, PortfolioSummary } from '../../../../core/models';
import { PortfolioApiService } from '../../../../core/services/api/portfolio-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

const PAGE_SIZE = 12;

type CategoriesState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-portfolio-list-page',
  templateUrl: './portfolio-list-page.component.html',
  styleUrl: './portfolio-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioListPageComponent {
  private readonly api = inject(PortfolioApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly items = signal<PortfolioSummary[]>([]);
  readonly categories = signal<PortfolioCategory[]>([]);
  private readonly categoriesState = signal<CategoriesState>('loading');
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly failed = signal(false);
  readonly hasMore = signal(false);
  readonly skeletons = [0, 1, 2];

  /** ?category=<slug> from the URL, null = "All". The URL is the single source of truth. */
  private readonly requestedSlug = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('category')?.trim() || null)),
    { initialValue: null },
  );

  /** The requested slug, only if it is a real category; a stale shared link falls back to "All". */
  readonly activeSlug = computed(() => {
    const slug = this.requestedSlug();
    return slug && this.categories().some((c) => c.slug === slug) ? slug : null;
  });

  /** The API wants the id; the categories array already loaded gives the slug → id link. */
  private readonly categoryId = computed(() => {
    const slug = this.activeSlug();
    return slug ? (this.categories().find((c) => c.slug === slug)?.id ?? null) : null;
  });

  /** With a ?category= in the URL, wait for the categories so the first request is already the right one. */
  private readonly canLoad = computed(() => !this.requestedSlug() || this.categoriesState() !== 'loading');

  private page = 0;
  private listSub: Subscription | null = null;

  constructor() {
    // Category names follow Accept-Language, so refetch them when the language changes.
    effect(() => {
      this.languageStore.lang();
      untracked(() => this.loadCategories());
    }, { allowSignalWrites: true });

    // A slug that is not in the list is a category that no longer exists: drop it from the URL, quietly.
    effect(() => {
      const slug = this.requestedSlug();
      if (slug && this.categoriesState() === 'ready' && !this.activeSlug()) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { category: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    // Reload from page 0 on a language change or a new filter. "All" sends no categoryId at all.
    effect(() => {
      this.languageStore.lang();
      const categoryId = this.categoryId();
      if (!this.canLoad()) return;
      untracked(() => this.load(true, categoryId));
    }, { allowSignalWrites: true });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.page += 1;
    this.load(false, this.categoryId());
  }

  retry(): void {
    this.load(true, this.categoryId());
  }

  year(item: PortfolioSummary): string | null {
    return item.completedAt ? item.completedAt.slice(0, 4) : null;
  }

  trackById = (_: number, item: PortfolioSummary): number => item.id;
  trackBySlug = (_: number, category: PortfolioCategory): string => category.slug;

  private loadCategories(): void {
    this.categoriesState.set('loading');
    // A failure just means no filter row; the grid is unaffected.
    this.api.categories().subscribe({
      next: (list) => {
        this.categories.set(list);
        this.categoriesState.set('ready');
      },
      error: () => {
        this.categories.set([]);
        this.categoriesState.set('failed');
      },
    });
  }

  private load(reset: boolean, categoryId: number | null): void {
    if (reset) {
      // A newer filter click must win over a slower, older response.
      this.listSub?.unsubscribe();
      this.page = 0;
      this.loading.set(true);
      this.loadingMore.set(false);
    } else {
      this.loadingMore.set(true);
    }
    this.failed.set(false);

    this.listSub = this.api.list(this.page, PAGE_SIZE, categoryId).subscribe({
      next: (res) => {
        this.items.set(reset ? res.content : [...this.items(), ...res.content]);
        this.hasMore.set(!res.last);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        if (reset) this.items.set([]);
        this.failed.set(true);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }
}
