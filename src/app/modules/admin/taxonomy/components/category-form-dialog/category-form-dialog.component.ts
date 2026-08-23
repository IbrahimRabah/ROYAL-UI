import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { CategoryAdminResponse, CategoryUpsertRequest } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleTaxonomyMutationError } from '../../../../../shared/utils/taxonomy-mutation-error.util';

export interface ParentOption {
  id: number;
  name: string;
  depth: number;
}

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

  @Input() open = false;
  @Input() category: CategoryAdminResponse | null = null;
  @Input() initialParentId: number | null = null;
  // Pre-filtered by the parent page to exclude the category being edited and its own
  // descendants — see category-tree-page's parentOptions (409 CATEGORY_CYCLE avoidance).
  @Input() parentOptions: ParentOption[] = [];

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly slugFieldError = signal<string | null>(null);
  readonly inlineError = signal<string | null>(null);

  private originalSlug = '';

  readonly form = this.fb.nonNullable.group({
    parentId: this.fb.control<number | null>(null),
    slug: [''],
    displayOrder: [0],
    active: [true],
    imageUrl: [''],
    bannerUrl: [''],
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

  get isEdit(): boolean {
    return this.category !== null;
  }

  // A category with children can't be moved — its subtree would need to move with it,
  // and the contract only offers a single parentId, not a subtree reparent.
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

    // Categories have no shortDescription column at all — confirmed by the backend, the
    // field doesn't exist on the entity even though the shared translation shapes used
    // elsewhere (products) carry it. Sending it would just be silently dropped, so the
    // category-specific request type (CategoryTranslationInput) doesn't have it to send.
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
      imageUrl: v.imageUrl.trim() || null,
      bannerUrl: v.bannerUrl.trim() || null,
      displayOrder: v.displayOrder,
      active: v.active,
    };

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
        this.inlineError.set(result.inlineMessage);
      },
    });
  }

  private resetForm(): void {
    const c = this.category;
    const ar = c?.translations.find((t) => t.locale === Language.AR);
    const en = c?.translations.find((t) => t.locale === Language.EN);
    this.originalSlug = c?.slug ?? '';

    this.form.reset({
      parentId: c ? c.parentId : this.initialParentId,
      slug: this.originalSlug,
      displayOrder: c?.displayOrder ?? 0,
      active: c?.active ?? true,
      imageUrl: c?.imageUrl ?? '',
      bannerUrl: c?.bannerUrl ?? '',
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
