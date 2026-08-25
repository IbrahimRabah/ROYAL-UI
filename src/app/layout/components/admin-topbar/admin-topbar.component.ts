import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { filter, map } from 'rxjs';

import { AuthApiService } from '../../../core/services/api/auth-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthStoreService } from '../../../core/state/auth-store.service';
import { PostAuthService } from '../../../modules/auth/services/post-auth.service';
import { getDisplayName } from '../../../shared/utils/display-name.util';

// First path segment under /admin -> the nav label key it corresponds to, reused as
// the topbar's page title so the two never drift out of sync.
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'admin.nav.dashboard',
  orders: 'admin.nav.orders',
  products: 'admin.nav.products',
  taxonomy: 'admin.nav.categories',
  inventory: 'admin.nav.inventory',
  invoices: 'admin.nav.invoices',
  remittances: 'admin.nav.remittances',
  customers: 'admin.nav.customers',
  shipping: 'admin.nav.shipping',
  exports: 'admin.nav.exports',
  audit: 'admin.nav.audit',
  settings: 'admin.nav.settings',
};

const titleKeyFromUrl = (url: string): string => {
  const segment = url.split('?')[0].split('/').filter(Boolean)[1] ?? '';
  return PAGE_TITLES[segment] ?? 'admin.nav.dashboard';
};

@Component({
  selector: 'app-admin-topbar',
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTopbarComponent {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStoreService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly postAuth = inject(PostAuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Output() readonly menuToggle = new EventEmitter<void>();

  @ViewChild('panel') private readonly panel!: Popover;
  @ViewChild('accountTrigger') private readonly accountTrigger!: ElementRef<HTMLButtonElement>;

  readonly loggingOut = signal(false);

  readonly pageTitleKey = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => titleKeyFromUrl(event.urlAfterRedirects)),
    ),
    { initialValue: titleKeyFromUrl(this.router.url) },
  );

  readonly adminName = computed(() => getDisplayName(this.authStore.user()));

  toggleAccountPanel(event: Event): void {
    // Explicit target — PrimeNG falls back to event.currentTarget/event.target when this
    // is omitted, which should already resolve to this button, but pinning it removes any
    // dependence on exactly where inside the button the click landed.
    this.panel.toggle(event, this.accountTrigger.nativeElement);
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
