import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { CartApiService } from '../services/api/cart-api.service';
import { CartStoreService } from '../state/cart-store.service';

export const checkoutReadyGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const cartStore = inject(CartStoreService);
  const cartApi = inject(CartApiService);
  const router = inject(Router);

  const decide = (): boolean | UrlTree => (cartStore.checkoutReady() ? true : router.createUrlTree(['/cart']));

  if (cartStore.cart() !== null) {
    return decide();
  }

  return cartApi.getCart().pipe(
    tap((cart) => cartStore.set(cart)),
    map(() => decide()),
    catchError(() => of(router.createUrlTree(['/cart']))),
  );
};
