import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SeoPageAdmin, SeoPageRequest } from '../../../../../core/models';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';
import { ToastService } from '../../../../../core/services/toast.service';

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

/** The title and description of the pages that have no product or category behind them, and «hide from search». */
@Component({
  selector: 'app-seo-pages-page',
  templateUrl: './seo-pages-page.component.html',
  styleUrl: './seo-pages-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoPagesPageComponent {
  private readonly api = inject(AdminSeoApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly titleLimit = TITLE_LIMIT;
  readonly descriptionLimit = DESCRIPTION_LIMIT;

  readonly pages = signal<SeoPageAdmin[]>([]);
  readonly drafts = signal<Record<string, SeoPageRequest>>({});
  readonly saving = signal<string | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.pages().subscribe({
      next: (pages) => {
        this.pages.set(pages);
        this.drafts.set(Object.fromEntries(pages.map((p) => [p.pageKey, this.draftOf(p)])));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  draft(page: SeoPageAdmin): SeoPageRequest {
    return this.drafts()[page.pageKey] ?? this.draftOf(page);
  }

  edit(page: SeoPageAdmin, field: keyof SeoPageRequest, value: string | boolean): void {
    this.drafts.update((all) => ({ ...all, [page.pageKey]: { ...this.draft(page), [field]: value } }));
  }

  dirty(page: SeoPageAdmin): boolean {
    const d = this.draft(page);
    const o = this.draftOf(page);
    return d.titleAr !== o.titleAr || d.descriptionAr !== o.descriptionAr || d.titleEn !== o.titleEn
      || d.descriptionEn !== o.descriptionEn || d.noindex !== o.noindex;
  }

  save(page: SeoPageAdmin): void {
    if (this.saving() !== null || !this.dirty(page)) {
      return;
    }
    this.saving.set(page.pageKey);
    this.api.updatePage(page.pageKey, this.draft(page)).subscribe({
      next: (saved) => {
        this.saving.set(null);
        this.pages.update((list) => list.map((p) => (p.pageKey === saved.pageKey ? saved : p)));
        this.drafts.update((all) => ({ ...all, [saved.pageKey]: this.draftOf(saved) }));
        this.toast.success(this.translate.instant('seo.meta.saved'));
      },
      error: () => this.saving.set(null),
    });
  }

  private draftOf(p: SeoPageAdmin): SeoPageRequest {
    return {
      titleAr: p.titleAr ?? '',
      descriptionAr: p.descriptionAr ?? '',
      titleEn: p.titleEn ?? '',
      descriptionEn: p.descriptionEn ?? '',
      noindex: p.noindex,
    };
  }
}
