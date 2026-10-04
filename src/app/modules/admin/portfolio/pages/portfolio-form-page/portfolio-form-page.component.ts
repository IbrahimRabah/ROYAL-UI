import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { PortfolioAdminResponse, PortfolioState, PortfolioUpsertRequest, portfolioState } from '../../../../../core/models';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { Language } from '../../../../../core/enums/language';
import { CanComponentDeactivate } from '../../../../../core/guards/unsaved-changes.guard';
import { AdminPortfolioApiService } from '../../../../../core/services/api/admin-portfolio-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { FlatCategoryOption, flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';
import { errorMessageFor, parseApiError } from '../../portfolio-error.util';

const STATE_TONE: Record<PortfolioState, StatusTone> = {
  DRAFT: 'warn',
  PUBLISHED: 'ok',
  ARCHIVED: 'muted',
};

@Component({
  selector: 'app-portfolio-form-page',
  templateUrl: './portfolio-form-page.component.html',
  styleUrl: './portfolio-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioFormPageComponent implements CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminPortfolioApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly isNew = !this.route.snapshot.paramMap.has('id');
  readonly itemId = signal<number | null>(this.route.snapshot.paramMap.get('id') ? Number(this.route.snapshot.paramMap.get('id')) : null);

  readonly item = signal<PortfolioAdminResponse | null>(null);
  readonly loading = signal(!this.isNew);
  readonly notFound = signal(false);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly busy = signal(false);
  /** Set when publish is attempted on an archived item (409) — offers Restore inline. */
  readonly archivedConflict = signal(false);
  readonly categoryOptions = signal<FlatCategoryOption[]>([]);

  readonly state = computed<PortfolioState | null>(() => {
    const item = this.item();
    return item ? portfolioState(item) : null;
  });
  readonly tone = computed<StatusTone>(() => STATE_TONE[this.state() ?? 'DRAFT']);
  readonly archived = computed(() => this.state() === 'ARCHIVED');

  private originalSlug = '';
  private savedSnapshot = '';
  /** Server-side messages bound to fields, keyed by control name. */
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    titleAr: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    titleEn: this.fb.nonNullable.control(''),
    descriptionAr: this.fb.nonNullable.control(''),
    descriptionEn: this.fb.nonNullable.control(''),
    categoryId: this.fb.control<number | null>(null),
    completedAt: this.fb.nonNullable.control(''),
    displayOrder: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    slug: this.fb.nonNullable.control(''),
  });

  constructor() {
    this.taxonomyApi.listCategories().subscribe({
      next: (tree) => this.categoryOptions.set(flattenCategoryTree(tree, this.languageStore.lang())),
      error: () => {},
    });

    const id = this.itemId();
    if (id !== null) {
      this.fetch(id);
    } else {
      this.savedSnapshot = this.snapshot();
    }

    this.form.valueChanges.subscribe(() => {
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
    });
  }

  // ---------------------------------------------------------------- derived

  displayName(): string {
    const item = this.item();
    if (!item) return this.translate.instant('admin.portfolio.form.newTitle');
    const lang = this.languageStore.lang();
    return (lang === Language.AR ? item.titleAr || item.titleEn : item.titleEn || item.titleAr) || item.slug;
  }

  get slugChanged(): boolean {
    return !this.isNew && this.form.controls.slug.value.trim() !== this.originalSlug;
  }

  fieldError(name: string): string | null {
    return this.serverErrors()[name] ?? null;
  }

  hasUnsavedChanges(): boolean {
    return !this.loading() && this.snapshot() !== this.savedSnapshot;
  }

  private snapshot(): string {
    return JSON.stringify(this.form.getRawValue());
  }

  // ---------------------------------------------------------------- save

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.translate.instant('admin.portfolio.form.fixFields'));
      return;
    }
    if (this.saving()) return;

    this.saving.set(true);
    this.serverErrors.set({});
    const id = this.itemId();
    const body = this.buildRequest();
    const call: Observable<PortfolioAdminResponse> = id === null ? this.api.create(body) : this.api.update(id, body);

    call.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.applyItem(res);
        this.toast.success(this.translate.instant(id === null ? 'toast.portfolio.created' : 'toast.portfolio.updated'));
        if (id === null) this.router.navigate(['/admin/portfolio', res.id], { replaceUrl: true });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.bindError(err);
      },
    });
  }

  /** PUT replaces the whole item — optional fields omitted are wiped — so everything is always sent. */
  private buildRequest(): PortfolioUpsertRequest {
    const v = this.form.getRawValue();
    const blank = (s: string) => (s.trim() === '' ? null : s.trim());
    return {
      slug: blank(v.slug),
      titleAr: v.titleAr.trim(),
      titleEn: blank(v.titleEn),
      descriptionAr: blank(v.descriptionAr),
      descriptionEn: blank(v.descriptionEn),
      categoryId: v.categoryId ?? null,
      completedAt: blank(v.completedAt),
      displayOrder: Number(v.displayOrder) || 0,
    };
  }

  private bindError(err: unknown): void {
    const parsed = parseApiError(err);
    if (parsed.code === ErrorCode.SLUG_ALREADY_EXISTS) {
      this.serverErrors.set({ slug: this.translate.instant('admin.portfolio.form.slugTaken') });
      return;
    }
    if (parsed.code === ErrorCode.VALIDATION_FAILED) {
      const bound: Record<string, string> = {};
      for (const fe of parsed.fieldErrors) {
        if (fe.field in this.form.controls) bound[fe.field] = fe.message;
      }
      if (Object.keys(bound).length) {
        this.serverErrors.set(bound);
      } else {
        this.toast.error(parsed.fieldErrors[0]?.message ?? errorMessageFor(parsed, this.languageStore.lang()));
      }
      return;
    }
    if (parsed.code === ErrorCode.PORTFOLIO_ITEM_NOT_FOUND) {
      this.notFound.set(true);
      return;
    }
    if (parsed.code === ErrorCode.CATEGORY_NOT_FOUND) {
      this.serverErrors.set({ categoryId: errorMessageFor(parsed, this.languageStore.lang()) });
      return;
    }
    this.toast.error(errorMessageFor(parsed, this.languageStore.lang()));
  }

  // ---------------------------------------------------------------- state changes

  publish(published: boolean): void {
    const id = this.itemId();
    if (id === null || this.busy()) return;
    this.busy.set(true);
    this.archivedConflict.set(false);
    this.api.setPublished(id, published, true).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.item.set(res);
        this.toast.success(this.translate.instant(published ? 'toast.portfolio.published' : 'toast.portfolio.unpublished'));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const parsed = parseApiError(err);
        if (parsed.code === ErrorCode.PORTFOLIO_ITEM_ARCHIVED) {
          this.archivedConflict.set(true);
        } else {
          this.bindError(err);
        }
      },
    });
  }

  archive(): void {
    const id = this.itemId();
    if (id === null || this.busy()) return;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.portfolio.archiveConfirm.title', { name: this.displayName() }),
        message: this.translate.instant('admin.portfolio.archiveConfirm.message'),
        confirmLabel: this.translate.instant('admin.portfolio.archiveConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.busy.set(true);
        this.api.archive(id).subscribe({
          next: (res) => {
            this.busy.set(false);
            this.item.set(res);
            this.toast.success(this.translate.instant('toast.portfolio.archived'));
          },
          error: () => this.busy.set(false),
        });
      });
  }

  restore(): void {
    const id = this.itemId();
    if (id === null || this.busy()) return;
    this.busy.set(true);
    this.api.restore(id).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.archivedConflict.set(false);
        this.item.set(res);
        this.toast.success(this.translate.instant('toast.portfolio.restored'));
      },
      error: () => this.busy.set(false),
    });
  }

  retry(): void {
    const id = this.itemId();
    if (id !== null) this.fetch(id);
  }

  // ---------------------------------------------------------------- load

  private fetch(id: number): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.notFound.set(false);
    this.api.get(id).subscribe({
      next: (item) => {
        this.applyItem(item);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (parseApiError(err).code === ErrorCode.PORTFOLIO_ITEM_NOT_FOUND) {
          this.notFound.set(true);
        } else {
          this.loadError.set(true);
        }
      },
    });
  }

  /** Every field is loaded back into the form so the next PUT can send the complete object. */
  private applyItem(item: PortfolioAdminResponse): void {
    this.item.set(item);
    this.originalSlug = item.slug;
    this.form.reset(
      {
        titleAr: item.titleAr ?? '',
        titleEn: item.titleEn ?? '',
        descriptionAr: item.descriptionAr ?? '',
        descriptionEn: item.descriptionEn ?? '',
        categoryId: item.categoryId ?? null,
        completedAt: item.completedAt ?? '',
        displayOrder: item.displayOrder ?? 0,
        slug: item.slug ?? '',
      },
      { emitEvent: false },
    );
    this.savedSnapshot = this.snapshot();
  }
}
