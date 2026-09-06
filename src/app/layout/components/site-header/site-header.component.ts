import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CategoryNode } from '../../../core/models';
import { CatalogApiService } from '../../../core/services/api/catalog-api.service';
import { LanguageStoreService } from '../../../core/state/language-store.service';

@Component({
  selector: 'app-site-header',
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHeaderComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly categories = signal<CategoryNode[]>([]);
  readonly mobileNavOpen = signal(false);

  constructor() {
    effect(() => {
      this.languageStore.lang();
      this.catalogApi.getCategoryTree().subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => {},
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
