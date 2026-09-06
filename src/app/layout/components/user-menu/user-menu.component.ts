import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';

import { AuthApiService } from '../../../core/services/api/auth-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthStoreService } from '../../../core/state/auth-store.service';
import { PostAuthService } from '../../../modules/auth/services/post-auth.service';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMenuComponent {
  private readonly authStore = inject(AuthStoreService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly postAuth = inject(PostAuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  @ViewChild('panel') private readonly panel!: Popover;

  readonly isLoggedIn = this.authStore.isLoggedIn;
  readonly isAdmin = this.authStore.isAdmin;
  readonly user = this.authStore.user;
  readonly loggingOut = signal(false);

  toggle(event: Event): void {
    this.panel.toggle(event);
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.panel.hide();
    const refreshToken = this.tokenStorage.getRefreshToken();
    const finish = () => {
      this.authStore.clear();
      this.postAuth.completeLogout();
      this.loggingOut.set(false);
      this.toast.success(this.translate.instant('toast.auth.signedOut'));
      this.router.navigateByUrl('/');
    };
    if (!refreshToken) {
      finish();
      return;
    }
    this.authApi.logout(refreshToken).subscribe({ next: finish, error: finish });
  }
}
