import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import { AdminImageResponse, ImageUpdateRequest, PageResponse, ProductAdminResponse, ProductUpsertRequest } from '../../models';
import { buildHttpParams } from './http-params.util';

@Injectable({
  providedIn: 'root',
})
export class AdminProductApiService {
  private readonly http = inject(HttpClient);

  list(page?: number, size?: number): Observable<PageResponse<ProductAdminResponse>> {
    const params = buildHttpParams({ page, size: size ?? APP_CONFIG.pagination.adminProducts.size });
    return this.http.get<PageResponse<ProductAdminResponse>>(API_ROUTES.admin.products.products(), { params });
  }

  get(productId: number): Observable<ProductAdminResponse> {
    return this.http.get<ProductAdminResponse>(API_ROUTES.admin.products.product(productId));
  }

  create(body: ProductUpsertRequest): Observable<ProductAdminResponse> {
    return this.http.post<ProductAdminResponse>(API_ROUTES.admin.products.products(), body);
  }

  update(productId: number, body: ProductUpsertRequest): Observable<ProductAdminResponse> {
    return this.http.put<ProductAdminResponse>(API_ROUTES.admin.products.product(productId), body);
  }

  publish(productId: number): Observable<ProductAdminResponse> {
    return this.http.patch<ProductAdminResponse>(API_ROUTES.admin.products.publish(productId), null);
  }

  unpublish(productId: number): Observable<ProductAdminResponse> {
    return this.http.patch<ProductAdminResponse>(API_ROUTES.admin.products.unpublish(productId), null);
  }

  archive(productId: number): Observable<ProductAdminResponse> {
    return this.http.patch<ProductAdminResponse>(API_ROUTES.admin.products.archive(productId), null);
  }

  duplicate(productId: number): Observable<ProductAdminResponse> {
    return this.http.post<ProductAdminResponse>(API_ROUTES.admin.products.duplicate(productId), null);
  }

  listImages(productId: number): Observable<AdminImageResponse[]> {
    return this.http.get<AdminImageResponse[]>(API_ROUTES.admin.products.images(productId));
  }

  uploadImage(productId: number, file: File, variantId?: number): Observable<AdminImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const params = buildHttpParams({ variantId });
    return this.http.post<AdminImageResponse>(API_ROUTES.admin.products.images(productId), formData, { params });
  }

  updateImage(productId: number, imageId: number, body: ImageUpdateRequest): Observable<AdminImageResponse> {
    return this.http.put<AdminImageResponse>(API_ROUTES.admin.products.image(productId, imageId), body);
  }

  deleteImage(productId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.products.image(productId, imageId));
  }
}
