import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';

import { AuthApiService } from '../../../core/services/api/auth-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthStoreService } from '../../../core/state/auth-store.service';
import { CustomRequestSummaryStoreService } from '../../../core/state/custom-request-summary-store.service';
import { PostAuthService } from '../../../modules/auth/services/post-auth.service';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMenuComponent implements OnDestroy {
  private readonly authStore = inject(AuthStoreService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly postAuth = inject(PostAuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly summaryStore = inject(CustomRequestSummaryStoreService);

  @ViewChild('panel') private readonly panel!: Popover;
  @ViewChild('trigger') private readonly trigger!: ElementRef<HTMLButtonElement>;

  private readonly navSub: Subscription = this.router.events
    .pipe(filter((e) => e instanceof NavigationStart))
    .subscribe(() => this.panel?.hide());

  /** Mirrors the popover's real state (also set by its outside-click and Escape handling). */
  readonly open = signal(false);

  readonly isLoggedIn = this.authStore.isLoggedIn;
  readonly isAdmin = this.authStore.isAdmin;
  readonly user = this.authStore.user;
  readonly loggingOut = signal(false);

  /** Custom requests waiting for the customer's answer — loaded once per session by the store. */
  readonly awaitingResponse = this.summaryStore.awaiting;

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
  }

  // The trigger alone decides open vs close. Popover.toggle() silently ignores clicks while its
  // show/hide animation runs, so a quick second click would do nothing; hide() has no such guard.
  toggle(event: Event): void {
    if (this.open()) {
      this.panel.hide();
    } else {
      this.panel.show(event, event.currentTarget);
    }
  }

  onShow(): void {
    this.open.set(true);
  }

  onHide(): void {
    this.open.set(false);
  }

  /** Choosing a link or button closes the menu, even when the link targets the current route. */
  onPanelClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a, button')) {
      this.panel.hide();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.open()) {
      this.panel.hide();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.panel.hide();
      this.trigger.nativeElement.focus();
    }
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.panel.hide();
    const refreshToken = this.tokenStorage.getRefreshToken();
    const finish = () => {
      this.summaryStore.reset();
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
