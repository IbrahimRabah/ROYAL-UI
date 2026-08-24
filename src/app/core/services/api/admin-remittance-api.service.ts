import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import { CreateRemittanceRequest, OutstandingRemittanceResponse, PageResponse, RemittanceResponse } from '../../models';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { buildHttpParams } from './http-params.util';

// create/cancel suppress the interceptor's automatic error toast — both are handled via
// admin-mutation-error.util.ts so a 400 VALIDATION_FAILED (e.g. a shortfall with no note)
// binds inline instead of toasting.
const NO_TOAST = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

@Injectable({
  providedIn: 'root',
})
export class AdminRemittanceApiService {
  private readonly http = inject(HttpClient);

  // A single object ({ orderCount, totalAmount, orders }), not a page.
  outstanding(): Observable<OutstandingRemittanceResponse> {
    return this.http.get<OutstandingRemittanceResponse>(API_ROUTES.admin.remittances.outstanding());
  }

  create(body: CreateRemittanceRequest): Observable<RemittanceResponse> {
    return this.http.post<RemittanceResponse>(API_ROUTES.admin.remittances.remittances(), body, NO_TOAST);
  }

  list(page?: number, size?: number): Observable<PageResponse<RemittanceResponse>> {
    const params = buildHttpParams({ page, size: size ?? APP_CONFIG.pagination.remittances.size });
    return this.http.get<PageResponse<RemittanceResponse>>(API_ROUTES.admin.remittances.remittances(), { params });
  }

  get(remittanceId: number): Observable<RemittanceResponse> {
    return this.http.get<RemittanceResponse>(API_ROUTES.admin.remittances.remittance(remittanceId));
  }

  // reason is a required query param, not a body field.
  cancel(remittanceId: number, reason: string): Observable<RemittanceResponse> {
    const params = buildHttpParams({ reason });
    return this.http.post<RemittanceResponse>(API_ROUTES.admin.remittances.cancel(remittanceId), null, { params, ...NO_TOAST });
  }
}
