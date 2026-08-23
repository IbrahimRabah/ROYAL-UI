import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import {
  BrandAdminResponse,
  CategoryAdminResponse,
  ProductAdminResponse,
  ProductSpecificationInput,
  ProductUpsertRequest,
} from '../../../../../core/models';
import { isSpecRowIncomplete } from '../../components/product-specs-tab/product-specs-tab.component';
import { brandDisplayName } from '../../../../../shared/utils/brand-display-name.util';
import { ProductStatus } from '../../../../../core/enums/product-status';
import { Language } from '../../../../../core/enums/language';
import {
  PRODUCT_STATUS_LABELS_AR,
  PRODUCT_STATUS_LABELS_EN,
  PRODUCT_STATUS_TONE,
} from '../../../../../core/constants/product-status.constants';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { AdminProductApiService } from '../../../../../core/services/api/admin-product-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { CanComponentDeactivate } from '../../../../../core/guards/unsaved-changes.guard';
import { ValidationFailedError } from '../../../../../core/interceptors/error.interceptor';
import { flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';

@Component({
  selector: 'app-product-form-page',
  templateUrl: './product-form-page.component.html',
  styleUrl: './product-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormPageComponent implements CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly productApi = inject(AdminProductApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  // The 'new' and ':id' routes both point at this component but are distinct route
  // configs, so Angular recreates the component (fresh constructor run) when save()
  // navigates from one to the other — no need to react to paramMap changes mid-lifetime.
  readonly isNew = !this.route.snapshot.paramMap.has('id');
  private readonly routeProductId = this.route.snapshot.paramMap.get('id');

  readonly productId = signal<number | null>(this.routeProductId ? Number(this.routeProductId) : null);
  readonly product = signal<ProductAdminResponse | null>(null);
  readonly loading = signal(!this.isNew);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly actionBusy = signal(false);
  readonly activeTab = signal('details');

  // The specs tab's draft state, lifted up here so the single Save action can send it —
  // same reasoning as `form` above: seeded once from the loaded product (see fetch()),
  // never re-synced by refreshProductSilently(), and updated live via rowsChange as the
  // operator edits so it's still current if they switch tabs before saving.
  readonly specRows = signal<ProductSpecificationInput[]>([]);

  readonly categories = signal<CategoryAdminResponse[]>([]);
  readonly brands = signal<BrandAdminResponse[]>([]);
  readonly categoriesError = signal(false);
  readonly brandsError = signal(false);
  readonly categoryOptions = computed(() => flattenCategoryTree(this.categories(), this.languageStore.lang()));
  readonly brandOptions = computed(() => this.brands().map((b) => ({ id: b.id, name: brandDisplayName(b, this.languageStore.lang()) })));

  private savedSnapshot: string;

  readonly form = this.fb.group({
    categoryId: this.fb.control<number | null>(null, Validators.required),
    brandId: this.fb.control<number | null>(null),
    slug: this.fb.nonNullable.control<string>(''),
    featured: this.fb.nonNullable.control<boolean>(false),
    newArrival: this.fb.nonNullable.control<boolean>(false),
    translations: this.fb.group({
      ar: this.fb.group({
        name: this.fb.nonNullable.control<string>('', Validators.required),
        shortDescription: this.fb.nonNullable.control<string>(''),
        description: this.fb.nonNullable.control<string>(''),
        metaTitle: this.fb.nonNullable.control<string>(''),
        metaDescription: this.fb.nonNullable.control<string>(''),
      }),
      en: this.fb.group({
        name: this.fb.nonNullable.control<string>(''),
        shortDescription: this.fb.nonNullable.control<string>(''),
        description: this.fb.nonNullable.control<string>(''),
        metaTitle: this.fb.nonNullable.control<string>(''),
        metaDescription: this.fb.nonNullable.control<string>(''),
      }),
    }),
  });

  constructor() {
    // Deliberately independent of the rest of the form — if either of these fails, the
    // corresponding select shows an inline error and stays empty, but translations, slug
    // and the toggles must still be fully usable (see product-translations-tab).
    this.taxonomyApi.listCategories().subscribe({ next: (c) => this.categories.set(c), error: () => this.categoriesError.set(true) });
    this.taxonomyApi.listBrands().subscribe({ next: (b) => this.brands.set(b), error: () => this.brandsError.set(true) });

    const id = this.productId();
    if (id) {
      this.fetch(id);
      this.savedSnapshot = '';
    } else {
      this.savedSnapshot = this.snapshot();
    }
  }

  hasUnsavedChanges(): boolean {
    // While an existing product is still loading, savedSnapshot has no real baseline yet
    // (it's only set once fetch() resolves) — treating the form as "changed" during that
    // window makes unsavedChangesGuard prompt a confirm dialog for a navigation the user
    // never touched (e.g. an auth redirect firing before the product finished loading),
    // and that dialog then blocks navigation forever since nothing is there to answer it.
    if (this.loading()) {
      return false;
    }
    return this.snapshot() !== this.savedSnapshot;
  }

  // Covers both the Details form and the specs draft — specifications ride the same
  // single Save action now, so a change to either must count as "unsaved".
  private snapshot(): string {
    return JSON.stringify({ form: this.form.getRawValue(), specs: this.specRows() });
  }

  // Per the API's omit-null convention, a row's attributeValueId/valueText key can be
  // missing entirely rather than present as null — normalize both to null so every row
  // always has both keys, matching what the specs tab and the PUT body expect.
  private normalizeSpecs(specs: ProductSpecificationInput[] | undefined): ProductSpecificationInput[] {
    return (specs ?? []).map((s) => ({
      attributeId: s.attributeId,
      attributeValueId: s.attributeValueId ?? null,
      valueText: s.valueText ?? null,
    }));
  }

  displayName(): string {
    const p = this.product();
    if (!p) {
      return this.translate.instant('admin.products.form.newTitle');
    }
    const lang = this.languageStore.lang();
    const primary = lang === Language.AR ? p.nameAr : p.nameEn;
    const fallback = lang === Language.AR ? p.nameEn : p.nameAr;
    return primary || fallback || p.slug;
  }

  statusLabel(status: ProductStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? PRODUCT_STATUS_LABELS_AR : PRODUCT_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: ProductStatus): StatusTone {
    return PRODUCT_STATUS_TONE[status];
  }

  retry(): void {
    const id = this.productId();
    if (id) {
      this.fetch(id);
    }
  }

  // Variant changes (generate, bulk-save, archive) can flip variantCount/warnings/status —
  // refetch to pick those up without toggling `loading`, which would hide the tabs the
  // operator is actively working in behind the page-level skeleton.
  refreshProductSilently(): void {
    const id = this.productId();
    if (!id) {
      return;
    }
    this.productApi.get(id).subscribe({
      next: (p) => this.product.set(p),
      error: () => {},
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.translate.instant('toast.products.validationError'));
      return;
    }
    if (this.specRows().some(isSpecRowIncomplete)) {
      this.toast.error(this.translate.instant('admin.products.form.specs.incompleteRows'));
      return;
    }
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    const body = this.buildRequest();
    const id = this.productId();
    const request$ = id ? this.productApi.update(id, body) : this.productApi.create(body);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.product.set(res);
        this.specRows.set(this.normalizeSpecs(res.specifications));
        this.savedSnapshot = this.snapshot();
        this.toast.success(this.translate.instant('toast.products.saved'));
        if (!id) {
          this.router.navigate(['/admin/products', res.id], { replaceUrl: true });
        }
      },
      error: (err: unknown) => {
        this.saving.set(false);
        // Every other failure (404 CATEGORY_NOT_FOUND, generic 500, etc.) is already
        // toasted by the global error interceptor — only VALIDATION_FAILED is rethrown
        // untouched for the caller to handle, since it never auto-toasts.
        if (err && typeof err === 'object' && (err as Partial<ValidationFailedError>).kind === 'VALIDATION_FAILED') {
          const validationError = err as ValidationFailedError;
          this.toast.error(validationError.fieldErrors[0]?.message || validationError.message);
        }
      },
    });
  }

  publish(): void {
    const id = this.productId();
    if (!id || this.actionBusy()) {
      return;
    }
    this.actionBusy.set(true);
    this.productApi.publish(id).subscribe({
      next: (p) => {
        this.actionBusy.set(false);
        this.product.set(p);
        this.toast.success(this.translate.instant('toast.products.published'));
      },
      error: () => this.actionBusy.set(false),
    });
  }

  unpublish(): void {
    const id = this.productId();
    if (!id || this.actionBusy()) {
      return;
    }
    this.actionBusy.set(true);
    this.productApi.unpublish(id).subscribe({
      next: (p) => {
        this.actionBusy.set(false);
        this.product.set(p);
        this.toast.success(this.translate.instant('toast.products.unpublished'));
      },
      error: () => this.actionBusy.set(false),
    });
  }

  confirmArchive(): void {
    const id = this.productId();
    if (!id || this.actionBusy()) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.list.archiveConfirm.title'),
        message: this.translate.instant('admin.products.list.archiveConfirm.message', { name: this.displayName() }),
        confirmLabel: this.translate.instant('admin.products.list.archiveConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.actionBusy.set(true);
        this.productApi.archive(id).subscribe({
          next: (p) => {
            this.actionBusy.set(false);
            this.product.set(p);
            this.toast.success(this.translate.instant('toast.products.archived'));
          },
          error: () => this.actionBusy.set(false),
        });
      });
  }

  private fetch(id: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.productApi.get(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.patchForm(p);
        this.specRows.set(this.normalizeSpecs(p.specifications));
        this.savedSnapshot = this.snapshot();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  // translations[] is the source of truth for editing — nameAr/nameEn stay on the response
  // for the list table only. The API's global "omit null fields" convention means a locale
  // missing shortDescription/description/metaTitle/metaDescription just won't have that
  // key at all; default every one of them to '' rather than treating the gap as an error.
  private patchForm(p: ProductAdminResponse): void {
    const ar = p.translations.find((t) => t.locale === Language.AR);
    const en = p.translations.find((t) => t.locale === Language.EN);
    this.form.patchValue({
      categoryId: p.categoryId,
      brandId: p.brandId,
      slug: p.slug,
      featured: p.featured,
      newArrival: p.newArrival,
      translations: {
        ar: {
          name: ar?.name ?? '',
          shortDescription: ar?.shortDescription ?? '',
          description: ar?.description ?? '',
          metaTitle: ar?.metaTitle ?? '',
          metaDescription: ar?.metaDescription ?? '',
        },
        en: {
          name: en?.name ?? '',
          shortDescription: en?.shortDescription ?? '',
          description: en?.description ?? '',
          metaTitle: en?.metaTitle ?? '',
          metaDescription: en?.metaDescription ?? '',
        },
      },
    });
  }

  // PUT replaces the whole translation object per locale — it is not a partial patch, so
  // every one of the six fields must be sent on every save, including ones the operator
  // never touched. Empty string, never omitted/undefined, for anything blank.
  private buildRequest(): ProductUpsertRequest {
    const v = this.form.getRawValue();
    const translations: ProductUpsertRequest['translations'] = [
      {
        locale: Language.AR,
        name: v.translations.ar.name,
        shortDescription: v.translations.ar.shortDescription,
        description: v.translations.ar.description,
        metaTitle: v.translations.ar.metaTitle,
        metaDescription: v.translations.ar.metaDescription,
      },
    ];
    if (v.translations.en.name) {
      translations.push({
        locale: Language.EN,
        name: v.translations.en.name,
        shortDescription: v.translations.en.shortDescription,
        description: v.translations.en.description,
        metaTitle: v.translations.en.metaTitle,
        metaDescription: v.translations.en.metaDescription,
      });
    }

    return {
      categoryId: v.categoryId!,
      brandId: v.brandId ?? null,
      slug: v.slug || null,
      featured: v.featured ?? false,
      newArrival: v.newArrival ?? false,
      translations,
      specifications: this.specRows(),
    };
  }
}
