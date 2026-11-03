import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  AdminReview,
  PageResponse,
  ReviewBulkAction,
  ReviewBulkResponse,
  ReviewCounts,
  ReviewStatus,
} from '../../models';
import { buildHttpParams } from './http-params.util';

/** Where staff decide which reviews the public sees. */
@Injectable({
  providedIn: 'root',
})
export class AdminReviewApiService {
  private readonly http = inject(HttpClient);

  list(
    filters: { status: ReviewStatus | null; rating: number | null; q: string | null; productId?: number | null },
    page: number,
    size = 20,
  ): Observable<PageResponse<AdminReview>> {
    const params = buildHttpParams({ ...filters, page, size });
    return this.http.get<PageResponse<AdminReview>>(API_ROUTES.admin.reviews.list(), { params });
  }

  counts(): Observable<ReviewCounts> {
    return this.http.get<ReviewCounts>(API_ROUTES.admin.reviews.counts());
  }

  approve(id: number, note?: string | null): Observable<AdminReview> {
    return this.http.post<AdminReview>(API_ROUTES.admin.reviews.approve(id), { note: note ?? null });
  }

  /** Also how an approved review is taken down. The note is shown to the customer. */
  reject(id: number, note?: string | null): Observable<AdminReview> {
    return this.http.post<AdminReview>(API_ROUTES.admin.reviews.reject(id), { note: note ?? null });
  }

  /** At most 500 ids. */
  bulk(action: ReviewBulkAction, ids: number[], note?: string | null): Observable<ReviewBulkResponse> {
    return this.http.post<ReviewBulkResponse>(API_ROUTES.admin.reviews.bulk(), { action, ids, note: note ?? null });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.reviews.one(id));
  }
}
