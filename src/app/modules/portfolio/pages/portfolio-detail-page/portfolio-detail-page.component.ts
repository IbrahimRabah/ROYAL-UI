import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { PortfolioDetail } from '../../../../core/models';
import { PortfolioApiService } from '../../../../core/services/api/portfolio-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';

@Component({
  selector: 'app-portfolio-detail-page',
  templateUrl: './portfolio-detail-page.component.html',
  styleUrl: './portfolio-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDetailPageComponent {
  private readonly api = inject(PortfolioApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly languageStore = inject(LanguageStoreService);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), { initialValue: '' });

  readonly item = signal<PortfolioDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  readonly images = computed(() =>
    [...(this.item()?.images ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
  );

  readonly completed = computed(() => {
    const raw = this.item()?.completedAt;
    if (!raw) return null;
    const date = new Date(`${raw}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    const locale = this.languageStore.lang() === 'ar' ? 'ar-EG' : 'en-GB';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      this.languageStore.lang();
      if (!slug) return;

      this.loading.set(true);
      this.notFound.set(false);
      this.api.getBySlug(slug).subscribe({
        next: (item) => {
          this.item.set(item);
          this.loading.set(false);
        },
        error: () => {
          this.item.set(null);
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }
}
