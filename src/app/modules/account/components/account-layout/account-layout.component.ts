import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { TokenStorageService } from '../../../../core/services/token-storage.service';
import { AuthStoreService } from '../../../../core/state/auth-store.service';
import { CustomRequestSummaryStoreService } from '../../../../core/state/custom-request-summary-store.service';
import { getDisplayName } from '../../../../shared/utils/display-name.util';
import { PostAuthService } from '../../../auth/services/post-auth.service';

function isIndexUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return path === '/me' || path === '/me/';
}

@Component({
  selector: 'app-account-layout',
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountLayoutComponent {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly postAuth = inject(PostAuthService);
  private readonly summaryStore = inject(CustomRequestSummaryStoreService);

  /** Requests waiting for the customer's answer; the only way they learn a quote arrived. */
  readonly awaitingResponse = this.summaryStore.awaiting;

  readonly isIndex = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => isIndexUrl(event.urlAfterRedirects)),
    ),
    { initialValue: isIndexUrl(this.router.url) },
  );

  readonly displayName = computed(() => getDisplayName(this.authStore.user()));
  readonly initial = computed(() => this.displayName().trim().charAt(0).toUpperCase() || '?');

  signOut(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    const finish = () => {
      this.summaryStore.reset();
      this.authStore.clear();
      this.postAuth.completeLogout();
      this.router.navigateByUrl('/');
    };
    if (!refreshToken) {
      finish();
      return;
    }
    this.authApi.logout(refreshToken).subscribe({ next: finish, error: finish });
  }
}
