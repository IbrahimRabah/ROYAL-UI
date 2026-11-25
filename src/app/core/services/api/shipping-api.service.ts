import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { ShippingSizeClass } from '../../enums/shipping-size-class';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { DeliveryOptionResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class ShippingApiService {
  private readonly http = inject(HttpClient);

  /** Served governorates only (a closed one is simply absent). No cart needed. */
  deliveryOptions(sizeClass?: ShippingSizeClass | null): Observable<DeliveryOptionResponse[]> {
    const params = sizeClass ? new HttpParams().set('sizeClass', sizeClass) : undefined;
    return this.http.get<DeliveryOptionResponse[]>(API_ROUTES.shipping.deliveryOptions(), {
      params,
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }
}
