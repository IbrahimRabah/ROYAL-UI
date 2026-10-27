import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import {
  AcceptQuoteRequest,
  MyCustomRequestDetail,
  MyCustomRequestSummary,
  MyCustomRequestSummaryCount,
  PageResponse,
} from '../../models';

/** Every failure here is answered inline by the page (404, QUOTE_CHANGED, QUOTE_ALREADY_ANSWERED), so no global toast. */
const quiet = (): { context: HttpContext } => ({ context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) });

@Injectable({
  providedIn: 'root',
})
export class MyCustomRequestApiService {
  private readonly http = inject(HttpClient);

  list(page: number): Observable<PageResponse<MyCustomRequestSummary>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<PageResponse<MyCustomRequestSummary>>(API_ROUTES.customRequests.mine(), { params, ...quiet() });
  }

  summary(): Observable<MyCustomRequestSummaryCount> {
    return this.http.get<MyCustomRequestSummaryCount>(API_ROUTES.customRequests.mineSummary(), quiet());
  }

  get(requestNumber: string): Observable<MyCustomRequestDetail> {
    return this.http.get<MyCustomRequestDetail>(API_ROUTES.customRequests.mineByNumber(requestNumber), quiet());
  }

  accept(requestNumber: string, body: AcceptQuoteRequest): Observable<unknown> {
    return this.http.post<unknown>(API_ROUTES.customRequests.mineAccept(requestNumber), body, quiet());
  }

  reject(requestNumber: string): Observable<unknown> {
    return this.http.post<unknown>(API_ROUTES.customRequests.mineReject(requestNumber), null, quiet());
  }
}
