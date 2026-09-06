import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import { FulfillmentStatus } from '../../enums/fulfillment-status';
import { PaymentStatus } from '../../enums/payment-status';
import { CancelOrderRequest, OrderResponse, OrderSummaryResponse, PageResponse, UpdateFulfillmentRequest } from '../../models';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { buildHttpParams } from './http-params.util';

const NO_TOAST = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

@Injectable({
  providedIn: 'root',
})
export class AdminOrderApiService {
  private readonly http = inject(HttpClient);

  list(status?: FulfillmentStatus, phone?: string, page?: number, size?: number): Observable<PageResponse<OrderSummaryResponse>> {
    const params = buildHttpParams({ status, phone, page, size: size ?? APP_CONFIG.pagination.adminOrders.size });
    return this.http.get<PageResponse<OrderSummaryResponse>>(API_ROUTES.admin.orders.orders(), { params });
  }

  get(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(API_ROUTES.admin.orders.order(orderId));
  }

  confirm(orderId: number, note?: string): Observable<OrderResponse> {
    const params = buildHttpParams({ note });
    return this.http.post<OrderResponse>(API_ROUTES.admin.orders.confirm(orderId), null, { params, ...NO_TOAST });
  }
  setFulfillment(orderId: number, body: UpdateFulfillmentRequest): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(API_ROUTES.admin.orders.fulfillmentStatus(orderId), body, NO_TOAST);
  }

  setPayment(orderId: number, status: PaymentStatus, note?: string): Observable<OrderResponse> {
    const params = buildHttpParams({ status, note });
    return this.http.patch<OrderResponse>(API_ROUTES.admin.orders.paymentStatus(orderId), null, { params, ...NO_TOAST });
  }

  cancel(orderId: number, body: CancelOrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(API_ROUTES.admin.orders.cancel(orderId), body, NO_TOAST);
  }
}
