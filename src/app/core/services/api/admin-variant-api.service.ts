import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  VariantAdminResponse,
  VariantBulkUpsertRequest,
  VariantPreviewRequest,
  VariantPreviewResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AdminVariantApiService {
  private readonly http = inject(HttpClient);

  listByProduct(productId: number): Observable<VariantAdminResponse[]> {
    return this.http.get<VariantAdminResponse[]>(API_ROUTES.admin.variants.byProduct(productId));
  }

  preview(productId: number, body: VariantPreviewRequest): Observable<VariantPreviewResponse> {
    return this.http.post<VariantPreviewResponse>(API_ROUTES.admin.variants.preview(productId), body);
  }

  bulkUpsert(productId: number, body: VariantBulkUpsertRequest): Observable<VariantAdminResponse[]> {
    return this.http.post<VariantAdminResponse[]>(API_ROUTES.admin.variants.byProduct(productId), body);
  }

  archive(variantId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.variants.variant(variantId));
  }
}
