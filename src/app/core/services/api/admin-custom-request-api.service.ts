import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import {
  CustomRequestDetail,
  CustomRequestListFilter,
  CustomRequestQuoteRequest,
  CustomRequestStatusRequest,
  CustomRequestSummary,
  PageResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AdminCustomRequestApiService {
  private readonly http = inject(HttpClient);

  /** The queue is worked oldest-first, so `sort=createdAt,asc`. */
  list(filter: CustomRequestListFilter, page: number, size: number): Observable<PageResponse<CustomRequestSummary>> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'createdAt,asc');
    if (filter.status) params = params.set('status', filter.status);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.governorateId != null) params = params.set('governorateId', filter.governorateId);
    if (filter.q) params = params.set('q', filter.q);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<PageResponse<CustomRequestSummary>>(API_ROUTES.admin.customRequests.list(), { params });
  }

  /** How many requests are waiting for a first call — drives the sidebar badge and the dashboard tile. */
  countNew(): Observable<number> {
    const params = new HttpParams().set('status', 'NEW').set('size', 1);
    return this.http
      .get<PageResponse<CustomRequestSummary>>(API_ROUTES.admin.customRequests.list(), {
        params,
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map((page) => page.totalElements));
  }

  /** The not-found case is answered by the screen itself, so no global toast. */
  get(id: number): Observable<CustomRequestDetail> {
    return this.http.get<CustomRequestDetail>(API_ROUTES.admin.customRequests.item(id), {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }

  setStatus(id: number, body: CustomRequestStatusRequest): Observable<CustomRequestDetail> {
    return this.http.patch<CustomRequestDetail>(API_ROUTES.admin.customRequests.status(id), body);
  }

  quote(id: number, body: CustomRequestQuoteRequest): Observable<CustomRequestDetail> {
    return this.http.patch<CustomRequestDetail>(API_ROUTES.admin.customRequests.quote(id), body);
  }
}
