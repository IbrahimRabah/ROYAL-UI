import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { StoreProfileResponse, StoreProfileUpdateRequest } from '../../../../../core/models';
import { AdminSettingsApiService } from '../../../../../core/services/api/admin-settings-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-store-profile-page',
  templateUrl: './store-profile-page.component.html',
  styleUrl: './store-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreProfilePageComponent {
  private readonly settingsApi = inject(AdminSettingsApiService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly profile = signal<StoreProfileResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);

  readonly legalName = signal('');
  readonly legalNameEn = signal('');
  readonly address = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly taxNumber = signal('');
  readonly commercialRegister = signal('');
  readonly website = signal('');
  readonly invoiceFooterNote = signal('');

  readonly missingFields = computed(() => this.profile()?.missingFields ?? []);
  readonly canSubmit = computed(() => !this.saving() && this.legalName().trim().length > 0);

  constructor() {
    this.fetch();
  }

  retry(): void {
    this.fetch();
  }

  // The missing-fields banner emits the raw field key; jump to that field's input rather
  // than deciding anything about it — the server already decided it's incomplete.
  focusField(field: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const el = document.getElementById(`sp-${field}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLElement | null)?.focus();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.settings.confirmTitle'),
        message: this.translate.instant('admin.settings.confirmMessage'),
        confirmLabel: this.translate.instant('admin.settings.save'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.doSubmit();
        }
      });
  }

  private doSubmit(): void {
    this.saving.set(true);

    const body: StoreProfileUpdateRequest = {
      legalName: this.legalName().trim(),
      legalNameEn: this.legalNameEn().trim() || undefined,
      address: this.address().trim() || undefined,
      phone: this.phone().trim() || undefined,
      email: this.email().trim() || undefined,
      taxNumber: this.taxNumber().trim() || undefined,
      commercialRegister: this.commercialRegister().trim() || undefined,
      website: this.website().trim() || undefined,
      invoiceFooterNote: this.invoiceFooterNote().trim() || undefined,
    };

    this.settingsApi.updateStoreProfile(body).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.profile.set(profile);
        this.patchForm(profile);
        this.toast.success(this.translate.instant('toast.settings.profileSaved'));
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.settingsApi.getStoreProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.patchForm(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private patchForm(profile: StoreProfileResponse): void {
    this.legalName.set(profile.legalName ?? '');
    this.legalNameEn.set(profile.legalNameEn ?? '');
    this.address.set(profile.address ?? '');
    this.phone.set(profile.phone ?? '');
    this.email.set(profile.email ?? '');
    this.taxNumber.set(profile.taxNumber ?? '');
    this.commercialRegister.set(profile.commercialRegister ?? '');
    this.website.set(profile.website ?? '');
    this.invoiceFooterNote.set(profile.invoiceFooterNote ?? '');
  }
}
