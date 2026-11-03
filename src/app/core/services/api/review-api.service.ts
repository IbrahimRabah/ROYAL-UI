import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { EligibleReview, MyReview, PageResponse, ProductReviews, ReviewWriteRequest } from '../../models';
import { buildHttpParams } from './http-params.util';

/** Reviews from the storefront: the public list of a product, and the signed-in customer's own. */
@Injectable({
  providedIn: 'root',
})
export class ReviewApiService {
  private readonly http = inject(HttpClient);

  /** Approved reviews only, with the average and the star breakdown. */
  forProduct(slug: string, page: number, size = 10): Observable<ProductReviews> {
    const params = buildHttpParams({ page, size });
    return this.http.get<ProductReviews>(API_ROUTES.reviews.forProduct(slug), { params });
  }

  mine(page: number, size = 10): Observable<PageResponse<MyReview>> {
    const params = buildHttpParams({ page, size });
    return this.http.get<PageResponse<MyReview>>(API_ROUTES.reviews.mine(), { params });
  }

  /** Products on a delivered order of mine that I have not reviewed. */
  eligible(): Observable<EligibleReview[]> {
    return this.http.get<EligibleReview[]>(API_ROUTES.reviews.eligible());
  }

  create(productId: number, body: ReviewWriteRequest): Observable<MyReview> {
    return this.http.post<MyReview>(API_ROUTES.reviews.mine(), { productId, ...body });
  }

  /** Editing sends the review back to PENDING. */
  update(reviewId: number, body: ReviewWriteRequest): Observable<MyReview> {
    return this.http.put<MyReview>(API_ROUTES.reviews.one(reviewId), body);
  }
}
