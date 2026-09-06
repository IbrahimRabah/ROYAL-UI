import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AuthResponse } from '../../../core/models';
import { CartApiService } from '../../../core/services/api/cart-api.service';
import { GuestTokenService } from '../../../core/services/guest-token.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStoreService } from '../../../core/state/auth-store.service';
import { CartStoreService } from '../../../core/state/cart-store.service';

/**
 * Runs the fixed sequence the contract requires after a successful login/register:
 * 1. Save the session, toast signed-in/account-created, 2. merge the guest cart (if any),
 * 3. drop the guest token, 4. push the merged cart into the store, 5. toast only if the
 * merge added items, 6. navigate. Must run exactly once per sign-in — calling POST /cart/merge twice with
 * the same guest token double-adds its quantities, so the guest token is only ever read
 * and cleared here, never re-issued mid-flow.
 *
 * The merge call is only ever fired from inside setSession()'s continuation (never in
 * parallel with the login/register request), and only after the access token is already
 * in storage — /cart/merge returns a misleading 500 instead of 401 when called without a
 * valid Bearer token (see CartApiService.merge), so firing it any earlier would hit that.
 */
@Injectable({
  providedIn: 'root',
})
export class PostAuthService {
  private readonly authStore = inject(AuthStoreService);
  private readonly cartApi = inject(CartApiService);
  private readonly cartStore = inject(CartStoreService);
  private readonly guestToken = inject(GuestTokenService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  completeAuth(auth: AuthResponse, returnUrl: string, kind: 'login' | 'register'): void {
    this.authStore.setSession(auth);
    this.toast.success(this.translate.instant(kind === 'login' ? 'toast.auth.signedIn' : 'toast.auth.accountCreated'));

    const token = this.guestToken.getToken();
    if (!token) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    this.cartApi
      .merge({ guestToken: token })
      .pipe(
        tap((cart) => {
          this.guestToken.clear();
          this.cartStore.set(cart);
          if (cart.itemCount > 0) {
            this.toast.success(this.translate.instant('toast.cart.merged'));
          }
        }),
        catchError((err: unknown) => {
          console.error('Cart merge failed', err);
          return this.cartApi.getCart().pipe(
            tap((cart) => this.cartStore.set(cart)),
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe(() => this.router.navigateByUrl(returnUrl));
  }

  
  completeLogout(): void {
    this.guestToken
      .ensureToken()
      .pipe(
        switchMap(() => this.cartApi.getCart()),
        tap((cart) => this.cartStore.set(cart)),
        catchError(() => of(null)),
      )
      .subscribe();
  }
}
