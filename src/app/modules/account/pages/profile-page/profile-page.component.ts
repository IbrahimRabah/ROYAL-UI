import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { UserResponse } from '../../../../core/models';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStoreService } from '../../../../core/state/auth-store.service';
import { getDisplayName } from '../../../../shared/utils/display-name.util';
import { PostAuthService } from '../../../auth/services/post-auth.service';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly postAuth = inject(PostAuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly me = signal<UserResponse | null>(null);
  readonly loading = signal(true);
  readonly signingOutAll = signal(false);

  readonly displayName = computed(() => getDisplayName(this.authStore.user()));
  readonly phone = computed(() => this.me()?.phone ?? null);
  readonly email = computed(() => this.me()?.email ?? null);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.authApi.me().subscribe({
      next: (user) => {
        this.me.set(user);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  signOutAllDevices(): void {
    this.confirmDialogService
      .confirm({
        title: this.translate.instant('account.profile.confirmLogoutAllTitle'),
        message: this.translate.instant('account.profile.confirmLogoutAllMessage'),
        confirmLabel: this.translate.instant('account.profile.signOutAll'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed || this.signingOutAll()) {
          return;
        }
        this.signingOutAll.set(true);
        this.authApi.logoutAll().subscribe({
          next: () => {
            this.authStore.clear();
            this.postAuth.completeLogout();
            this.signingOutAll.set(false);
            this.toast.success(this.translate.instant('toast.auth.signedOut'));
            this.router.navigateByUrl('/');
          },
          error: () => this.signingOutAll.set(false),
        });
      });
  }
}
