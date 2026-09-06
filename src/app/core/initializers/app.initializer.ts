import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { AuthApiService } from '../services/api/auth-api.service';
import { CartApiService } from '../services/api/cart-api.service';
import { GuestTokenService } from '../services/guest-token.service';
import { AuthStoreService } from '../state/auth-store.service';
import { CartStoreService } from '../state/cart-store.service';
import { LanguageStoreService } from '../state/language-store.service';

export function appInitializer(
  platformId: object,
  languageStore: LanguageStoreService,
  authStore: AuthStoreService,
  authApi: AuthApiService,
  guestTokenService: GuestTokenService,
  cartApi: CartApiService,
  cartStore: CartStoreService,
): () => Observable<void> {
  return () => {
    void languageStore;

    if (!isPlatformBrowser(platformId)) {
      return of(undefined);
    }

    authStore.restore();

    const sessionConfirmed$: Observable<void> = authStore.isLoggedIn()
      ? authApi.me().pipe(
          map(() => undefined),
          catchError(() => {
            authStore.clear();
            return of(undefined);
          }),
        )
      : of(undefined);

    return sessionConfirmed$.pipe(
      switchMap(() => (authStore.isLoggedIn() ? of('') : guestTokenService.ensureToken())),
      switchMap(() => cartApi.getCart()),
      tap((cart) => cartStore.set(cart)),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  };
}
