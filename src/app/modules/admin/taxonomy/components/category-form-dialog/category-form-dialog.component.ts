import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { CategoryAdminResponse, CategoryImageType, CategoryScope, CategoryUpsertRequest } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleTaxonomyMutationError } from '../../../../../shared/utils/taxonomy-mutation-error.util';

export interface ParentOption {
  id: number;
  name: string;
  depth: number;
  scope: CategoryScope;
}

interface ImageSlotConfig {
  type: CategoryImageType;
  labelKey: string;
}

const IMAGE_SLOTS: ImageSlotConfig[] = [
  { type: 'CARD', labelKey: 'admin.categories.form.images.cardLabel' },
  { type: 'BANNER', labelKey: 'admin.categories.form.images.bannerLabel' },
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.component.html',
  styleUrl: './category-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input() open = false;
  @Input() category: CategoryAdminResponse | null = null;
  @Input() initialParentId: number | null = null;
  @Input() parentOptions: ParentOption[] = [];

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly slugFieldError = signal<string | null>(null);
  readonly inlineError = signal<string | null>(null);

  readonly imageSlots = IMAGE_SLOTS;
  readonly categoryImages = signal<Record<CategoryImageType, string | null>>({ CARD: null, BANNER: null });
  readonly uploadingImage = signal<CategoryImageType | null>(null);
  readonly dragOverSlot = signal<CategoryImageType | null>(null);

  private originalSlug = '';

  readonly form = this.fb.nonNullable.group({
    parentId: this.fb.control<number | null>(null),
    scope: this.fb.nonNullable.control<CategoryScope>('PRODUCT'),
    slug: [''],
    displayOrder: [0],
    active: [true],
    translations: this.fb.nonNullable.group({
      ar: this.fb.nonNullable.group({
        name: ['', Validators.required],
        description: [''],
        metaTitle: [''],
        metaDescription: [''],
      }),
      en: this.fb.nonNullable.group({
        name: [''],
        description: [''],
        metaTitle: [''],
        metaDescription: [''],
      }),
    }),
  });

  private originalScope: CategoryScope = 'PRODUCT';

  readonly scopeOptions: { value: CategoryScope; labelKey: string }[] = [
    { value: 'PRODUCT', labelKey: 'admin.categories.scope.PRODUCT' },
    { value: 'PORTFOLIO', labelKey: 'admin.categories.scope.PORTFOLIO' },
  ];

  constructor() {
    super();
    // Under a parent the scope is the parent's: show it, do not offer a choice the server would refuse.
    this.form.controls.parentId.valueChanges.subscribe((parentId) => this.syncScopeToParent(parentId));
  }

  /** A category with a parent has no say over its scope. */
  get scopeLocked(): boolean {
    return this.form.controls.parentId.value !== null;
  }

  /** Parents offered in the picker: on edit only those on the category's current side (others are refused). */
  get visibleParentOptions(): ParentOption[] {
    if (!this.isEdit) {
      return this.parentOptions;
    }
    const scope = this.form.controls.scope.value;
    return this.parentOptions.filter((o) => o.scope === scope);
  }

  private syncScopeToParent(parentId: number | null): void {
    const scope = this.form.controls.scope;
    const parent = parentId === null ? null : this.parentOptions.find((o) => o.id === parentId);
    if (parent) {
      scope.setValue(parent.scope, { emitEvent: false });
      scope.disable({ emitEvent: false });
    } else {
      scope.enable({ emitEvent: false });
    }
  }

  get isEdit(): boolean {
    return this.category !== null;
  }

  get parentSelectDisabled(): boolean {
    return this.category !== null && this.category.children.length > 0;
  }

  get slugChanged(): boolean {
    return this.isEdit && this.form.controls.slug.value !== this.originalSlug;
  }

  get arName() {
    return this.form.get('translations.ar.name');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('open' in changes)) {
      return;
    }
    if (this.open) {
      this.saving.set(false);
      this.slugFieldError.set(null);
      this.inlineError.set(null);
      this.resetForm();
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const translations: CategoryUpsertRequest['translations'] = [
      {
        locale: Language.AR,
        name: v.translations.ar.name,
        description: v.translations.ar.description,
        metaTitle: v.translations.ar.metaTitle,
        metaDescription: v.translations.ar.metaDescription,
      },
    ];
    if (v.translations.en.name) {
      translations.push({
        locale: Language.EN,
        name: v.translations.en.name,
        description: v.translations.en.description,
        metaTitle: v.translations.en.metaTitle,
        metaDescription: v.translations.en.metaDescription,
      });
    }

    const body: CategoryUpsertRequest = {
      parentId: v.parentId,
      slug: v.slug.trim() || undefined,
      translations,
      displayOrder: v.displayOrder,
      active: v.active,
    };
    // Scope rules: under a parent it is inherited (send nothing); on update, omitted = "no change",
    // so only send it when the admin actually changed it.
    if (v.parentId === null && (!this.category || v.scope !== this.originalScope)) {
      body.scope = v.scope;
    }

    this.saving.set(true);
    this.slugFieldError.set(null);
    this.inlineError.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const request$ = this.category
      ? this.taxonomyApi.updateCategory(this.category.id, body)
      : this.taxonomyApi.createCategory(body);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant(this.category ? 'toast.categories.updated' : 'toast.categories.created'));
        this.saved.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleTaxonomyMutationError(err, this.toast, lang);
        this.slugFieldError.set(result.fieldErrors.slug ?? null);
        this.inlineError.set(
          result.code === 'CATEGORY_SCOPE_IN_USE' ? this.withScopeUsage(result.inlineMessage) : result.inlineMessage,
        );
      },
    });
  }

  onImageDragOver(type: CategoryImageType, event: DragEvent): void {
    if (!this.isEdit) {
      return;
    }
    event.preventDefault();
    this.dragOverSlot.set(type);
  }

  onImageDragLeave(): void {
    this.dragOverSlot.set(null);
  }

  onImageDrop(type: CategoryImageType, event: DragEvent): void {
    event.preventDefault();
    this.dragOverSlot.set(null);
    if (!this.isEdit) {
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleImageFile(type, file);
    }
  }

  onImageFileInputChange(type: CategoryImageType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleImageFile(type, file);
    }
    input.value = '';
  }

  removeImage(type: CategoryImageType): void {
    if (!this.category) {
      return;
    }
    const categoryId = this.category.id;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.categories.form.images.deleteConfirm.title'),
        message: this.translate.instant('admin.categories.form.images.deleteConfirm.message'),
        confirmLabel: this.translate.instant('admin.categories.form.images.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.taxonomyApi.deleteCategoryImage(categoryId, type).subscribe({
          next: () => {
            this.categoryImages.update((imgs) => ({ ...imgs, [type]: null }));
            this.toast.success(this.translate.instant('toast.categories.imageDeleted'));
          },
          error: () => {},
        });
      });
  }

  private handleImageFile(type: CategoryImageType, file: File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.toast.error(this.translate.instant('admin.categories.form.images.errors.unsupportedType', { name: file.name }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      this.toast.error(this.translate.instant('admin.categories.form.images.errors.tooLarge', { name: file.name }));
      return;
    }
    this.uploadImage(type, file);
  }

  private uploadImage(type: CategoryImageType, file: File): void {
    if (!this.category) {
      return;
    }
    const categoryId = this.category.id;
    this.uploadingImage.set(type);
    this.taxonomyApi.uploadCategoryImage(categoryId, type, file).subscribe({
      next: (updated) => {
        this.uploadingImage.set(null);
        this.categoryImages.set({ CARD: updated.imageUrl, BANNER: updated.bannerUrl });
        this.toast.success(this.translate.instant('toast.categories.imageUploaded'));
      },
      error: () => {
        this.uploadingImage.set(null);
      },
    });
  }

  /** Adds what is known locally about what blocks the change (the server does not say which). */
  private withScopeUsage(message: string | null): string | null {
    const c = this.category;
    if (!message || !c) {
      return message;
    }
    const parts: string[] = [];
    if (c.children.length > 0) {
      parts.push(this.translate.instant('admin.categories.form.scopeUsage.children', { count: c.children.length }));
    }
    if ((c.productCount ?? 0) > 0) {
      parts.push(this.translate.instant('admin.categories.form.scopeUsage.products', { count: c.productCount }));
    }
    return parts.length
      ? `${message} ${this.translate.instant('admin.categories.form.scopeUsage.prefix')} ${parts.join(this.translate.instant('admin.categories.form.scopeUsage.join'))}.`
      : message;
  }

  private resetForm(): void {
    const c = this.category;
    this.originalScope = c?.scope ?? 'PRODUCT';
    const ar = c?.translations.find((t) => t.locale === Language.AR);
    const en = c?.translations.find((t) => t.locale === Language.EN);
    this.originalSlug = c?.slug ?? '';
    this.categoryImages.set({ CARD: c?.imageUrl ?? null, BANNER: c?.bannerUrl ?? null });
    this.uploadingImage.set(null);
    this.dragOverSlot.set(null);

    this.form.reset({
      parentId: c ? c.parentId : this.initialParentId,
      scope: c?.scope ?? 'PRODUCT',
      slug: this.originalSlug,
      displayOrder: c?.displayOrder ?? 0,
      active: c?.active ?? true,
      translations: {
        ar: {
          name: ar?.name ?? '',
          description: ar?.description ?? '',
          metaTitle: ar?.metaTitle ?? '',
          metaDescription: ar?.metaDescription ?? '',
        },
        en: {
          name: en?.name ?? '',
          description: en?.description ?? '',
          metaTitle: en?.metaTitle ?? '',
          metaDescription: en?.metaDescription ?? '',
        },
      },
    });
  }
}
