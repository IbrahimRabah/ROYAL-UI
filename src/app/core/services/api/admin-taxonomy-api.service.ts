import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  AttributeAdminResponse,
  AttributeUpsertRequest,
  BrandAdminResponse,
  BrandUpsertRequest,
  CategoryAdminResponse,
  CategoryImageType,
  CategoryUpsertRequest,
  IdResponse,
} from '../../models';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { buildHttpParams } from './http-params.util';

const NO_TOAST = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

@Injectable({
  providedIn: 'root',
})
export class AdminTaxonomyApiService {
  private readonly http = inject(HttpClient);

  listCategories(): Observable<CategoryAdminResponse[]> {
    return this.http.get<CategoryAdminResponse[]>(API_ROUTES.admin.categories.categories());
  }

  createCategory(body: CategoryUpsertRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(API_ROUTES.admin.categories.categories(), body, NO_TOAST);
  }

  updateCategory(categoryId: number, body: CategoryUpsertRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.categories.category(categoryId), body, NO_TOAST);
  }

  uploadCategoryImage(categoryId: number, imageType: CategoryImageType, file: File): Observable<CategoryAdminResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const params = buildHttpParams({ imageType });
    return this.http.post<CategoryAdminResponse>(API_ROUTES.admin.categories.images(categoryId), formData, { params, ...NO_TOAST });
  }

  deleteCategoryImage(categoryId: number, imageType: CategoryImageType): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.categories.image(categoryId, imageType), NO_TOAST);
  }

  listBrands(): Observable<BrandAdminResponse[]> {
    return this.http.get<BrandAdminResponse[]>(API_ROUTES.admin.brands.brands());
  }

  createBrand(body: BrandUpsertRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(API_ROUTES.admin.brands.brands(), body, NO_TOAST);
  }

  updateBrand(brandId: number, body: BrandUpsertRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.brands.brand(brandId), body, NO_TOAST);
  }

  listAttributes(variantDefining?: boolean): Observable<AttributeAdminResponse[]> {
    const params = buildHttpParams({ variantDefining });
    return this.http.get<AttributeAdminResponse[]>(API_ROUTES.admin.attributes.attributes(), { params });
  }

  createAttribute(body: AttributeUpsertRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(API_ROUTES.admin.attributes.attributes(), body, NO_TOAST);
  }

  updateAttribute(attributeId: number, body: AttributeUpsertRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.attributes.attribute(attributeId), body, NO_TOAST);
  }
}
