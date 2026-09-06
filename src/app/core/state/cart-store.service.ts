import { Injectable, computed, signal } from '@angular/core';

import { BLOCKING_CART_WARNINGS, CartWarning } from '../enums/cart-warning';
import { CartResponse, CartWarningEntry } from '../models';


@Injectable({
  providedIn: 'root',
})
export class CartStoreService {
  private readonly _cart = signal<CartResponse | null>(null);

  readonly cart = this._cart.asReadonly();

  readonly itemCount = computed(() => this._cart()?.itemCount ?? 0);
  readonly totalQuantity = computed(() => this._cart()?.totalQuantity ?? 0);
  readonly checkoutReady = computed(() => this._cart()?.checkoutReady ?? false);
  readonly isEmpty = computed(() => this.itemCount() === 0);

  readonly blockingWarnings = computed<CartWarningEntry[]>(() =>
    (this._cart()?.warnings ?? []).filter((warning) => BLOCKING_CART_WARNINGS.includes(warning.code)),
  );

  readonly hasPriceChange = computed(() =>
    (this._cart()?.warnings ?? []).some((warning) => warning.code === CartWarning.PRICE_CHANGED),
  );

  set(cart: CartResponse): void {
    this._cart.set(cart);
  }
}
