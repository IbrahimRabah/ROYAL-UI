import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { PageResponse, PortfolioCategory, PortfolioDetail, PortfolioSummary } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PortfolioApiService {
  private readonly http = inject(HttpClient);

  /** size is capped at 50 by the server (silently clamped). categoryId is an exact match; omit it for "All". */
  list(page: number, size = 12, categoryId?: number | null): Observable<PageResponse<PortfolioSummary>> {
    let params = new HttpParams().set('page', page).set('size', Math.min(size, 50));
    if (categoryId != null) params = params.set('categoryId', categoryId);
    return this.http.get<PageResponse<PortfolioSummary>>(API_ROUTES.portfolio.list(), { params });
  }

  /** Plain array of active portfolio categories; failure just hides the filter row, so no toast. */
  categories(): Observable<PortfolioCategory[]> {
    return this.http.get<PortfolioCategory[]>(API_ROUTES.portfolio.categories(), {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }

  /** 404 PORTFOLIO_ITEM_NOT_FOUND is answered inline by the page, so no toast. */
  getBySlug(slug: string): Observable<PortfolioDetail> {
    return this.http.get<PortfolioDetail>(API_ROUTES.portfolio.bySlug(slug), {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }
}
