import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  AdminGovernorateResponse,
  IdResponse,
  Money,
  ShippingRateRequest,
  ShippingZoneResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AdminShippingApiService {
  private readonly http = inject(HttpClient);

  getZones(): Observable<ShippingZoneResponse[]> {
    return this.http.get<ShippingZoneResponse[]>(API_ROUTES.admin.shipping.zones());
  }

  /** One call per (zone, size) pair — the endpoint takes a single size class. */
  setRate(body: ShippingRateRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.shipping.rates(), body);
  }

  setMaxShippingCost(zoneId: number, maxShippingCost: Money | null): Observable<void> {
    return this.http.put<void>(API_ROUTES.admin.shipping.maxShippingCost(zoneId), { maxShippingCost });
  }

  getGovernorates(): Observable<AdminGovernorateResponse[]> {
    return this.http.get<AdminGovernorateResponse[]>(API_ROUTES.admin.shipping.governorates());
  }

  assignGovernorateZone(governorateId: number, zoneId: number): Observable<void> {
    return this.http.put<void>(API_ROUTES.admin.shipping.governorateZone(governorateId), { zoneId });
  }

  closeGovernorate(governorateId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.shipping.governorateZone(governorateId));
  }
}
