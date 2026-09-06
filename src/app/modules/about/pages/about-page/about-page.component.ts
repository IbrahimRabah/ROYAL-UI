import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { CategoryNode } from '../../../../core/models';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { findCategoryIds } from '../../models/category-ids';

@Component({
  selector: 'app-about-page',
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly categories = signal<CategoryNode[]>([]);
  readonly categoryIds = computed(() => findCategoryIds(this.categories()));

  constructor() {
    effect(() => {
      this.languageStore.lang();

      this.catalogApi.getCategoryTree().subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => {},
      });
    }, { allowSignalWrites: true });
  }
}
