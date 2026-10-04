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
import { FulfillmentType, isReadyMade } from '../../../../../core/enums/fulfillment-type';
import { ShippingSizeClass } from '../../../../../core/enums/shipping-size-class';
import { money } from '../../../../../core/models';
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

  readonly isNew = !this.route.snapshot.paramMap.has('id');
  private readonly routeProductId = this.route.snapshot.paramMap.get('id');

  readonly productId = signal<number | null>(this.routeProductId ? Number(this.routeProductId) : null);
  readonly product = signal<ProductAdminResponse | null>(null);
  readonly loading = signal(!this.isNew);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly actionBusy = signal(false);
  readonly activeTab = signal('details');

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
    fulfillmentType: this.fb.nonNullable.control<FulfillmentType>(FulfillmentType.READY_MADE),
    shippingSizeClass: this.fb.control<ShippingSizeClass | null>(null, Validators.required),
    requiresAssembly: this.fb.nonNullable.control<boolean>(false),
    assemblyFee: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
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
    this.syncSizeRequirement(this.form.controls.fulfillmentType.value);
    this.form.controls.fulfillmentType.valueChanges.subscribe((type) => this.syncSizeRequirement(type));

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

  /** The size class is only mandatory for ready-made products; the server enforces the same rule. */
  private syncSizeRequirement(type: FulfillmentType): void {
    const size = this.form.controls.shippingSizeClass;
    if (type === FulfillmentType.READY_MADE) {
      size.addValidators(Validators.required);
    } else {
      size.removeValidators(Validators.required);
    }
    size.updateValueAndValidity({ emitEvent: false });
  }

  readonly readyMade = computed(() => isReadyMade(this.product()));

  hasUnsavedChanges(): boolean {
    if (this.loading()) {
      return false;
    }
    return this.snapshot() !== this.savedSnapshot;
  }

  private snapshot(): string {
    return JSON.stringify({ form: this.form.getRawValue(), specs: this.specRows() });
  }
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
      this.activeTab.set('details');
      const sizeMissing = this.form.controls.shippingSizeClass.hasError('required');
      this.toast.error(
        this.translate.instant(sizeMissing ? 'admin.products.form.sales.size.requiredToast' : 'toast.products.validationError'),
      );
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

  private patchForm(p: ProductAdminResponse): void {
    const ar = p.translations.find((t) => t.locale === Language.AR);
    const en = p.translations.find((t) => t.locale === Language.EN);
    this.form.patchValue({
      categoryId: p.categoryId,
      brandId: p.brandId,
      slug: p.slug,
      featured: p.featured,
      newArrival: p.newArrival,
      fulfillmentType: p.fulfillmentType ?? FulfillmentType.READY_MADE,
      shippingSizeClass: p.shippingSizeClass ?? null,
      requiresAssembly: p.requiresAssembly ?? false,
      assemblyFee: p.assemblyFee == null ? 0 : money(p.assemblyFee),
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
      fulfillmentType: v.fulfillmentType,
      ...(v.shippingSizeClass ? { shippingSizeClass: v.shippingSizeClass } : {}),
      requiresAssembly: v.requiresAssembly,
      assemblyFee: v.requiresAssembly ? v.assemblyFee : 0,
      translations,
      specifications: this.specRows(),
    };
  }
}
