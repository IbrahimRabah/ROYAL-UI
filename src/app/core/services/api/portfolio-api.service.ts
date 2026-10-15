import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { PageResponse, PortfolioDetail, PortfolioSummary } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PortfolioApiService {
  private readonly http = inject(HttpClient);

  list(page: number, size = 12): Observable<PageResponse<PortfolioSummary>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<PortfolioSummary>>(API_ROUTES.portfolio.list(), { params });
  }

  /** 404 PORTFOLIO_ITEM_NOT_FOUND is answered inline by the page, so no toast. */
  getBySlug(slug: string): Observable<PortfolioDetail> {
    return this.http.get<PortfolioDetail>(API_ROUTES.portfolio.bySlug(slug), {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }
}
