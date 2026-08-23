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
  CategoryUpsertRequest,
  IdResponse,
} from '../../models';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { buildHttpParams } from './http-params.util';

// Every write below suppresses the interceptor's automatic error toast — callers handle
// their own errors via shared/utils/taxonomy-mutation-error.util.ts, since ATTRIBUTE_CODE_EXISTS
// / ATTRIBUTE_VALUE_CODE_EXISTS / SLUG_ALREADY_EXISTS / BRAND_SLUG_EXISTS bind inline to a
// field and ATTRIBUTE_IN_USE / CATEGORY_CYCLE / CATEGORY_NOT_EMPTY show as an inline banner
// — never a toast for any of these (same pattern as AdminOrderApiService's mutations).
const NO_TOAST = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

@Injectable({
  providedIn: 'root',
})
export class AdminTaxonomyApiService {
  private readonly http = inject(HttpClient);

  // Full tree including inactive categories — the admin DTO (CategoryAdminResponse), not
  // the storefront tree shape.
  listCategories(): Observable<CategoryAdminResponse[]> {
    return this.http.get<CategoryAdminResponse[]>(API_ROUTES.admin.categories.categories());
  }

  createCategory(body: CategoryUpsertRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(API_ROUTES.admin.categories.categories(), body, NO_TOAST);
  }

  updateCategory(categoryId: number, body: CategoryUpsertRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.categories.category(categoryId), body, NO_TOAST);
  }

  // All brands including inactive — the admin DTO (BrandAdminResponse), not the
  // storefront shape.
  listBrands(): Observable<BrandAdminResponse[]> {
    return this.http.get<BrandAdminResponse[]>(API_ROUTES.admin.brands.brands());
  }

  createBrand(body: BrandUpsertRequest): Observable<IdResponse> {
    return this.http.post<IdResponse>(API_ROUTES.admin.brands.brands(), body, NO_TOAST);
  }

  updateBrand(brandId: number, body: BrandUpsertRequest): Observable<IdResponse> {
    return this.http.put<IdResponse>(API_ROUTES.admin.brands.brand(brandId), body, NO_TOAST);
  }

  // variantDefining is optional — omit it entirely (not `undefined`) to list every
  // attribute; pass true/false to filter to SKU-generating vs. specification-only ones.
  //
  // There is no GET /admin/attributes/{id} — confirmed 405, not in the contract (only
  // GET /admin/attributes and PUT /admin/attributes/{id} exist). The list already
  // returns each attribute in full, including its complete values[], so
  // attribute-form-page loads from here and finds the matching id itself rather than
  // fetching a single attribute. See BACKEND_NOTES.
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
