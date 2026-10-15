import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { PortfolioSummary } from '../../../../core/models';
import { PortfolioApiService } from '../../../../core/services/api/portfolio-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-portfolio-list-page',
  templateUrl: './portfolio-list-page.component.html',
  styleUrl: './portfolio-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioListPageComponent {
  private readonly api = inject(PortfolioApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly items = signal<PortfolioSummary[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly failed = signal(false);
  readonly hasMore = signal(false);
  readonly skeletons = [0, 1];

  private page = 0;

  constructor() {
    // Titles follow Accept-Language, so reload from page 0 when the language changes.
    effect(() => {
      this.languageStore.lang();
      this.load(true);
    }, { allowSignalWrites: true });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.page += 1;
    this.load(false);
  }

  retry(): void {
    this.load(true);
  }

  year(item: PortfolioSummary): string | null {
    return item.completedAt ? item.completedAt.slice(0, 4) : null;
  }

  trackById = (_: number, item: PortfolioSummary): number => item.id;

  private load(reset: boolean): void {
    if (reset) {
      this.page = 0;
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.failed.set(false);

    this.api.list(this.page, PAGE_SIZE).subscribe({
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
