import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { SeoOverview } from '../../../../../core/models';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';

interface Tile {
  labelKey: string;
  value: number;
  tone: 'ok' | 'warn' | 'stop' | 'plain';
  /** Where the number leads: the meta-texts screen already filtered to exactly these items. */
  query?: { tab: 'products' | 'categories'; filter: string };
}

/** The SEO team's start page: what is missing, too long or duplicated, each number a link to the fix. */
@Component({
  selector: 'app-seo-overview-page',
  templateUrl: './seo-overview-page.component.html',
  styleUrl: './seo-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoOverviewPageComponent {
  private readonly api = inject(AdminSeoApiService);

  readonly data = signal<SeoOverview | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.overview().subscribe({
      next: (overview) => {
        this.data.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  productTiles(o: SeoOverview): Tile[] {
    const p = o.products;
    return [
      { labelKey: 'seo.overview.total', value: p.total, tone: 'plain' },
      { labelKey: 'seo.overview.missingTitle', value: p.missingTitle, tone: this.issue(p.missingTitle), query: { tab: 'products', filter: 'MISSING_TITLE' } },
      { labelKey: 'seo.overview.missingDescription', value: p.missingDescription, tone: this.issue(p.missingDescription), query: { tab: 'products', filter: 'MISSING_DESCRIPTION' } },
      { labelKey: 'seo.overview.tooLong', value: p.titleTooLong + p.descriptionTooLong, tone: this.issue(p.titleTooLong + p.descriptionTooLong, 'warn'), query: { tab: 'products', filter: 'TOO_LONG' } },
      { labelKey: 'seo.overview.duplicate', value: p.duplicateTitle, tone: this.issue(p.duplicateTitle), query: { tab: 'products', filter: 'DUPLICATE' } },
      { labelKey: 'seo.overview.noFaq', value: p.withoutFaq, tone: 'plain', query: { tab: 'products', filter: 'NO_FAQ' } },
    ];
  }

  categoryTiles(o: SeoOverview): Tile[] {
    const c = o.categories;
    return [
      { labelKey: 'seo.overview.total', value: c.total, tone: 'plain' },
      { labelKey: 'seo.overview.missingTitle', value: c.missingTitle, tone: this.issue(c.missingTitle), query: { tab: 'categories', filter: 'MISSING_TITLE' } },
      { labelKey: 'seo.overview.missingDescription', value: c.missingDescription, tone: this.issue(c.missingDescription), query: { tab: 'categories', filter: 'MISSING_DESCRIPTION' } },
      { labelKey: 'seo.overview.noFaq', value: c.withoutFaq, tone: 'plain', query: { tab: 'categories', filter: 'NO_FAQ' } },
    ];
  }

  private issue(count: number, tone: 'warn' | 'stop' = 'stop'): Tile['tone'] {
    return count === 0 ? 'ok' : tone;
  }
}
