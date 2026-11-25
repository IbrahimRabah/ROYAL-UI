import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { APP_CONFIG } from '../../../../core/constants/app-config';
import { SortOption } from '../../../../core/enums/sort-option';
import { CategoryNode, ProductSummaryResponse } from '../../../../core/models';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { DepartmentTile } from '../../components/category-banner/category-banner.component';

/** The furniture department's own home page: its banner, every product category as a tile, the newest pieces. */
@Component({
  selector: 'app-furniture-page',
  templateUrl: './furniture-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurniturePageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly bannerUrl = APP_CONFIG.departments.furniture.banner;
  readonly categories = signal<CategoryNode[]>([]);
  readonly products = signal<ProductSummaryResponse[]>([]);
  readonly productsLoading = signal(true);

  readonly tiles = computed<DepartmentTile[]>(() =>
    this.categories().map((c) => ({ label: c.name, imageUrl: c.imageUrl, link: '/products', queryParams: { categoryId: c.id } })),
  );

  constructor() {
    effect(() => {
      this.languageStore.lang();

      this.catalogApi.getCategoryTree().subscribe({ next: (tree) => this.categories.set(tree), error: () => {} });

      this.productsLoading.set(true);
      this.catalogApi.searchProducts({ sort: SortOption.NEWEST, size: 12 }).subscribe({
        next: (page) => {
          this.products.set(page.content);
          this.productsLoading.set(false);
        },
        error: () => this.productsLoading.set(false),
      });
    }, { allowSignalWrites: true });
  }
}
