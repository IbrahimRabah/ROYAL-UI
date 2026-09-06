import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { AddCartItemRequest, CartResponse, GuestTokenResponse, MergeCartRequest, UpdateCartItemRequest } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class CartApiService {
  private readonly http = inject(HttpClient);

  issueGuestToken(): Observable<GuestTokenResponse> {
    return this.http.post<GuestTokenResponse>(API_ROUTES.cart.guestToken(), null);
  }

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(API_ROUTES.cart.cart());
  }

  addItem(body: AddCartItemRequest): Observable<CartResponse> {
    return this.http.post<CartResponse>(API_ROUTES.cart.items(), body);
  }

  updateItem(itemId: number, body: UpdateCartItemRequest): Observable<CartResponse> {
    return this.http.patch<CartResponse>(API_ROUTES.cart.item(itemId), body);
  }

  removeItem(itemId: number): Observable<CartResponse> {
    return this.http.delete<CartResponse>(API_ROUTES.cart.item(itemId));
  }

  clear(): Observable<CartResponse> {
    return this.http.delete<CartResponse>(API_ROUTES.cart.cart());
  }

  merge(body: MergeCartRequest): Observable<CartResponse> {
    return this.http.post<CartResponse>(API_ROUTES.cart.merge(), body);
  }
}
