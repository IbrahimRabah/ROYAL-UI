import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { CategoryNode, PortfolioCategory, ProductSummaryResponse } from '../../../../core/models';
import { APP_CONFIG } from '../../../../core/constants/app-config';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { PortfolioApiService } from '../../../../core/services/api/portfolio-api.service';
import { DepartmentTile } from '../../components/category-banner/category-banner.component';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly categories = signal<CategoryNode[]>([]);
  readonly furnitureBanner = APP_CONFIG.departments.furniture.banner;
  readonly architecturalBanner = APP_CONFIG.departments.architectural.banner;
  readonly workCategories = signal<PortfolioCategory[]>([]);

  /** Every product category is a tile under the furniture banner. */
  readonly furnitureTiles = computed<DepartmentTile[]>(() =>
    this.categories().map((c) => ({ label: c.name, imageUrl: c.imageUrl, link: '/products', queryParams: { categoryId: c.id } })),
  );
  /** Portfolio categories are the tiles under the architectural banner. */
  readonly architecturalTiles = computed<DepartmentTile[]>(() =>
    this.workCategories().map((c) => ({ label: c.name, imageUrl: c.imageUrl, link: '/portfolio', queryParams: { category: c.slug } })),
  );
  readonly bestSellers = signal<ProductSummaryResponse[]>([]);
  readonly bestSellersLoading = signal(true);
  readonly newArrivals = signal<ProductSummaryResponse[]>([]);
  readonly newArrivalsLoading = signal(true);

  constructor() {
    effect(() => {
      this.languageStore.lang();

      this.catalogApi.getCategoryTree().subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => {},
      });

      this.portfolioApi.categories().subscribe({ next: (list) => this.workCategories.set(list), error: () => this.workCategories.set([]) });

      this.bestSellersLoading.set(true);
      this.catalogApi.getBestSellers().subscribe({
        next: (page) => {
          this.bestSellers.set(page.content);
          this.bestSellersLoading.set(false);
        },
        error: () => this.bestSellersLoading.set(false),
      });

      this.newArrivalsLoading.set(true);
      this.catalogApi.getNewArrivals().subscribe({
        next: (page) => {
          this.newArrivals.set(page.content);
          this.newArrivalsLoading.set(false);
        },
        error: () => this.newArrivalsLoading.set(false),
      });
    }, { allowSignalWrites: true });
  }
}
