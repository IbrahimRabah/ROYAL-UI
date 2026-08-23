import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { AttributeAdminResponse, AttributeUpsertRequest, AttributeValueUpsertItem } from '../../../../../core/models';
import { AttributeDataType } from '../../../../../core/enums/attribute-data-type';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { handleTaxonomyMutationError } from '../../../../../shared/utils/taxonomy-mutation-error.util';
import { AttributeValueRow } from '../../components/attribute-values-editor/attribute-values-editor.component';

@Component({
  selector: 'app-attribute-form-page',
  templateUrl: './attribute-form-page.component.html',
  styleUrl: './attribute-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeFormPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly isNew = !this.route.snapshot.paramMap.has('id');
  private readonly routeAttributeId = this.route.snapshot.paramMap.get('id');
  readonly attributeId = this.routeAttributeId ? Number(this.routeAttributeId) : null;

  readonly loading = signal(!this.isNew);
  readonly error = signal(false);
  // The route id doesn't match anything in the list — a stale link, a typo, or the
  // attribute was somehow removed. Distinct from `error` (a failed request): this is a
  // successful request that just doesn't contain the id, so retrying the same fetch
  // wouldn't help — only going back to the list would.
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly codeFieldError = signal<string | null>(null);
  readonly inlineError = signal<string | null>(null);
  readonly valueRows = signal<AttributeValueRow[]>([]);

  readonly AttributeDataType = AttributeDataType;

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    dataType: this.fb.nonNullable.control<AttributeDataType>(AttributeDataType.TEXT, Validators.required),
    variantDefining: [false],
    filterable: [false],
    displayOrder: [0],
    translations: this.fb.nonNullable.group({
      ar: this.fb.nonNullable.group({ name: ['', Validators.required] }),
      en: this.fb.nonNullable.group({ name: [''] }),
    }),
  });

  get isEdit(): boolean {
    return !this.isNew;
  }

  constructor() {
    if (!this.attributeId) {
      return;
    }

    // The list page can pass the row it already has via router state to skip a second
    // request — but this only exists on an in-app click, never on a hard refresh or a
    // direct link, so it's purely an optimization: the fetch-and-find path below is the
    // one that must always work on its own.
    const passed = this.router.getCurrentNavigation()?.extras.state?.['attribute'] as AttributeAdminResponse | undefined;
    if (passed && passed.id === this.attributeId) {
      this.patchForm(passed);
      this.loading.set(false);
      return;
    }

    this.fetch();
  }

  // There is no GET /admin/attributes/{id} (confirmed 405 — not in the contract). The
  // list already returns every attribute in full, including complete values[], so this
  // loads the whole list and finds the matching id itself. See BACKEND_NOTES.
  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    this.taxonomyApi.listAttributes().subscribe({
      next: (attrs) => {
        const attr = attrs.find((a) => a.id === this.attributeId);
        if (attr) {
          this.patchForm(attr);
        } else {
          this.notFound.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  retry(): void {
    if (this.attributeId) {
      this.fetch();
    }
  }

  private patchForm(attr: AttributeAdminResponse): void {
    this.form.patchValue({
      code: attr.code,
      dataType: attr.dataType,
      variantDefining: attr.variantDefining,
      filterable: attr.filterable,
      displayOrder: attr.displayOrder,
      translations: {
        ar: { name: attr.nameAr },
        en: { name: attr.nameEn },
      },
    });
    // variantDefining is locked once loaded for an existing attribute — disabled entirely
    // in the template, but disable the control too so a stray submit can't smuggle a
    // changed value through (the backend would reject it anyway with 409 ATTRIBUTE_IN_USE
    // once in use, but there's no reason to let the operator try in the first place).
    this.form.controls.variantDefining.disable();
    // The CRITICAL RULE: load every existing value into the editor — the next PUT must
    // resend the complete set, including rows the operator never touches. attr.values
    // here is the list endpoint's own complete array (same one PUT expects back), not a
    // partial per-id projection — nothing is dropped between load and save.
    this.valueRows.set(
      attr.values.map((v) => ({ id: v.id, code: v.code, hexColor: v.hexColor, nameAr: v.nameAr, nameEn: v.nameEn })),
    );
  }

  submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Effectively permanent once in use (409 ATTRIBUTE_IN_USE) — make the operator
    // explicitly acknowledge that before it's ever saved, not after a failed second edit.
    if (this.isNew && this.form.getRawValue().variantDefining) {
      this.confirmDialog
        .confirm({
          title: this.translate.instant('admin.attributes.form.confirmVariantDefining.title'),
          message: this.translate.instant('admin.attributes.form.confirmVariantDefining.message'),
          confirmLabel: this.translate.instant('admin.attributes.form.confirmVariantDefining.confirm'),
          cancelLabel: this.translate.instant('admin.attributes.form.confirmVariantDefining.cancel'),
        })
        .subscribe((confirmed) => {
          if (confirmed) {
            this.doSubmit();
          }
        });
      return;
    }

    this.doSubmit();
  }

  private doSubmit(): void {
    const v = this.form.getRawValue();
    const body: AttributeUpsertRequest = {
      code: v.code,
      dataType: v.dataType,
      variantDefining: v.variantDefining,
      filterable: v.filterable,
      displayOrder: v.displayOrder,
      translations: [
        { locale: Language.AR, name: v.translations.ar.name },
        { locale: Language.EN, name: v.translations.en.name || v.translations.ar.name },
      ],
    };
    if (v.dataType === AttributeDataType.LIST) {
      body.values = this.buildValuesPayload();
    }

    this.saving.set(true);
    this.codeFieldError.set(null);
    this.inlineError.set(null);
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    const request$ = this.attributeId
      ? this.taxonomyApi.updateAttribute(this.attributeId, body)
      : this.taxonomyApi.createAttribute(body);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.translate.instant(this.attributeId ? 'toast.attributes.updated' : 'toast.attributes.created'));
        this.router.navigate(['/admin/attributes']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const result = handleTaxonomyMutationError(err, this.toast, lang);
        this.codeFieldError.set(result.fieldErrors.code ?? null);
        this.inlineError.set(result.inlineMessage);
      },
    });
  }

  // Draft rows use a unique negative id (see attribute-values-editor) purely for local
  // list identity — never a real value id, so they must become `id: null` (create) here.
  private buildValuesPayload(): AttributeValueUpsertItem[] {
    return this.valueRows().map((row) => ({
      id: row.id !== null && row.id > 0 ? row.id : null,
      code: row.code,
      hexColor: row.hexColor,
      translations: [
        { locale: Language.AR, name: row.nameAr },
        { locale: Language.EN, name: row.nameEn || row.nameAr },
      ],
    }));
  }
}
