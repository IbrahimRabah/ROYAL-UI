import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { CartResponse } from '../models';
import { CartStoreService } from '../state/cart-store.service';
import { CartApiService } from './api/cart-api.service';
import { ToastService } from './toast.service';

/**
 * The one path from the UI to the cart API for add / change quantity / remove / reload. The cart page,
 * the product page and the mini cart panel all go through here, so the store update and the 409
 * recovery rule live in exactly one place.
 */
@Injectable({
  providedIn: 'root',
})
export class CartActionsService {
  private readonly cartApi = inject(CartApiService);
  private readonly cartStore = inject(CartStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  refresh(): Observable<CartResponse> {
    return this.cartApi.getCart().pipe(tap((cart) => this.cartStore.set(cart)));
  }

  add(variantId: number, quantity = 1): Observable<CartResponse> {
    return this.cartApi.addItem({ variantId, quantity }).pipe(tap((cart) => this.cartStore.set(cart)));
  }

  updateQuantity(itemId: number, quantity: number): Observable<CartResponse> {
    return this.cartApi.updateItem(itemId, { quantity }).pipe(
      tap((cart) => this.cartStore.set(cart)),
      catchError((err: unknown) => {
        // 409 = stock moved under the customer: reload the real cart; the error still reaches the caller.
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.cartApi.getCart().subscribe((cart) => this.cartStore.set(cart));
        }
        return throwError(() => err);
      }),
    );
  }

  remove(itemId: number): Observable<CartResponse> {
    return this.cartApi.removeItem(itemId).pipe(
      tap((cart) => {
        this.cartStore.set(cart);
        this.toast.success(this.translate.instant('toast.cart.itemRemoved'));
      }),
    );
  }
}
