import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BrandAdminResponse } from '../../../../../core/models';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { brandDisplayName } from '../../../../../shared/utils/brand-display-name.util';

@Component({
  selector: 'app-brand-list-page',
  templateUrl: './brand-list-page.component.html',
  styleUrl: './brand-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandListPageComponent {
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly brands = signal<BrandAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly dialogTarget = signal<BrandAdminResponse | 'new' | null>(null);

  readonly dialogOpen = computed(() => this.dialogTarget() !== null);
  readonly editingBrand = computed(() => {
    const target = this.dialogTarget();
    return target && target !== 'new' ? target : null;
  });

  constructor() {
    this.fetchAll();
  }

  displayName(brand: BrandAdminResponse): string {
    return brandDisplayName(brand, this.languageStore.lang());
  }

  retry(): void {
    this.fetchAll();
  }

  openNew(): void {
    this.dialogTarget.set('new');
  }

  openEdit(brand: BrandAdminResponse): void {
    this.dialogTarget.set(brand);
  }

  closeDialog(): void {
    this.dialogTarget.set(null);
  }

  onSaved(): void {
    this.dialogTarget.set(null);
    this.fetchAll();
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.error.set(false);
    this.taxonomyApi.listBrands().subscribe({
      next: (brands) => {
        this.brands.set(brands);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
