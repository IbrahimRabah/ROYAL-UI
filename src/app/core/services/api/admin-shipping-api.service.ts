import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { IdResponse, ShippingRateRequest, ShippingZoneResponse } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AdminShippingApiService {
  private readonly http = inject(HttpClient);

  getZones(): Observable<ShippingZoneResponse[]> {
    return this.http.get<ShippingZoneResponse[]>(API_ROUTES.admin.shipping.zones());
  }

  setRate(body: ShippingRateRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.shipping.rates(), body);
  }
}
