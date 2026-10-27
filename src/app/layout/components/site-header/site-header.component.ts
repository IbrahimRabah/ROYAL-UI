import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CategoryNode, PortfolioCategory } from '../../../core/models';
import { CatalogApiService } from '../../../core/services/api/catalog-api.service';
import { PortfolioApiService } from '../../../core/services/api/portfolio-api.service';
import { LanguageStoreService } from '../../../core/state/language-store.service';

@Component({
  selector: 'app-site-header',
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHeaderComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly categories = signal<CategoryNode[]>([]);
  /** Architectural Work menu entries; empty (also on failure) collapses the menu to one plain link. */
  readonly workCategories = signal<PortfolioCategory[]>([]);
  readonly mobileNavOpen = signal(false);

  constructor() {
    effect(() => {
      this.languageStore.lang();
      this.catalogApi.getCategoryTree().subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => {},
      });
      // Category names follow Accept-Language, so this reloads with the language like the tree above.
      this.portfolioApi.categories().subscribe({
        next: (list) => this.workCategories.set(list),
        error: () => this.workCategories.set([]),
      });
    }, { allowSignalWrites: true });
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  onMobileNavVisibleChange(visible: boolean): void {
    this.mobileNavOpen.set(visible);
  }
}
