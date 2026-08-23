import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { BrandAdminResponse, BrandUpsertRequest } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';
import { handleTaxonomyMutationError } from '../../../../../shared/utils/taxonomy-mutation-error.util';

@Component({
  selector: 'app-brand-form-dialog',
  templateUrl: './brand-form-dialog.component.html',
  styleUrl: './brand-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandFormDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input() open = false;
  @Input() brand: BrandAdminResponse | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly slugFieldError = signal<string | null>(null);
  readonly inlineError = signal<string | null>(null);

  private originalSlug = '';

  readonly form = this.fb.nonNullable.group({
    slug: [''],
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    logoUrl: [''],
    active: [true],
  });

  get isEdit(): boolean {
    return this.brand !== null;
  }

  // Compared against the slug this dialog opened with — simpler than a valueChanges
  // subscription, which (this component instance persists across open/close, only its
  // *ngIf'd template content toggles) would otherwise accumulate one extra subscriber
  // every time the dialog reopens.
  get slugChanged(): boolean {
    return this.isEdit && this.form.controls.slug.value !== this.originalSlug;
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

    const raw = this.form.getRawValue();
    const body: BrandUpsertRequest = {
      slug: raw.slug.trim() || undefined,
      nameAr: raw.nameAr,
      nameEn: raw.nameEn,
      logoUrl: raw.logoUrl.trim() || null,
      active: raw.active,
    };

    this.saving.set(true);
    this.slugFieldError.set(null);
    this.inlineError.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const request$ = this.brand ? this.taxonomyApi.updateBrand(this.brand.id, body) : this.taxonomyApi.createBrand(body);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant(this.brand ? 'toast.brands.updated' : 'toast.brands.created'));
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
    const b = this.brand;
    this.originalSlug = b?.slug ?? '';
    this.form.reset({
      slug: this.originalSlug,
      nameAr: b?.nameAr ?? '',
      nameEn: b?.nameEn ?? '',
      logoUrl: b?.logoUrl ?? '',
      active: b?.active ?? true,
    });
  }
}
