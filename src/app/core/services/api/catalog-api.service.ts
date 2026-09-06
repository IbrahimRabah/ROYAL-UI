import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import {
  BrandResponse,
  CategoryDetailResponse,
  CategoryNode,
  FilterFacetsResponse,
  PageResponse,
  ProductDetailResponse,
  ProductFilter,
  ProductSummaryResponse,
  VariantAvailabilityResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  searchProducts(filter: ProductFilter): Observable<PageResponse<ProductSummaryResponse>> {
    return this.http.get<PageResponse<ProductSummaryResponse>>(API_ROUTES.catalog.products(), {
      params: this.buildProductParams(filter),
    });
  }

  getProduct(slug: string): Observable<ProductDetailResponse> {
    return this.http.get<ProductDetailResponse>(API_ROUTES.catalog.productBySlug(slug));
  }

  getRelated(productId: number): Observable<ProductSummaryResponse[]> {
    return this.http.get<ProductSummaryResponse[]>(API_ROUTES.catalog.relatedProducts(productId));
  }

  getFeatured(page?: number, size?: number): Observable<PageResponse<ProductSummaryResponse>> {
    const params = this.buildPageParams(page, size ?? APP_CONFIG.pagination.featuredProducts.size);
    return this.http.get<PageResponse<ProductSummaryResponse>>(API_ROUTES.catalog.featuredProducts(), { params });
  }

  getNewArrivals(page?: number, size?: number): Observable<PageResponse<ProductSummaryResponse>> {
    const params = this.buildPageParams(page, size ?? APP_CONFIG.pagination.newArrivals.size);
    return this.http.get<PageResponse<ProductSummaryResponse>>(API_ROUTES.catalog.newArrivals(), { params });
  }

  getCategoryTree(): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(API_ROUTES.catalog.categoryTree());
  }

  getCategory(slug: string): Observable<CategoryDetailResponse> {
    return this.http.get<CategoryDetailResponse>(API_ROUTES.catalog.categoryBySlug(slug));
  }

  getFilters(categoryId?: number): Observable<FilterFacetsResponse> {
    const params = categoryId == null ? undefined : new HttpParams().set('categoryId', categoryId);
    return this.http
      .get<FilterFacetsResponse>(API_ROUTES.catalog.categoryFilters(), { params })
      .pipe(
        map((res) => ({
          ...res,
          brands: dedupeById(res.brands),
          attributes: res.attributes.map((group) => ({ ...group, values: dedupeById(group.values) })),
        })),
      );
  }

  getBrands(): Observable<BrandResponse[]> {
    return this.http.get<BrandResponse[]>(API_ROUTES.catalog.brands());
  }

  getAvailability(variantId: number): Observable<VariantAvailabilityResponse> {
    return this.http.get<VariantAvailabilityResponse>(API_ROUTES.catalog.variantAvailability(variantId));
  }

  private buildProductParams(filter: ProductFilter): HttpParams {
    let params = new HttpParams();
    params = this.appendString(params, 'q', filter.q);
    params = this.appendNumber(params, 'categoryId', filter.categoryId);
    params = this.appendArray(params, 'brandIds', filter.brandIds);
    params = this.appendNumber(params, 'minPrice', filter.minPrice);
    params = this.appendNumber(params, 'maxPrice', filter.maxPrice);
    params = this.appendArray(params, 'attributeValueIds', filter.attributeValueIds);
    params = this.appendBoolean(params, 'inStockOnly', filter.inStockOnly);
    params = this.appendBoolean(params, 'featured', filter.featured);
    params = this.appendBoolean(params, 'newArrival', filter.newArrival);
    params = this.appendString(params, 'sort', filter.sort);
    params = this.appendNumber(params, 'page', filter.page);
    params = this.appendNumber(params, 'size', filter.size ?? APP_CONFIG.pagination.products.size);
    return params;
  }

  private buildPageParams(page: number | undefined, size: number | undefined): HttpParams {
    let params = new HttpParams();
    params = this.appendNumber(params, 'page', page);
    params = this.appendNumber(params, 'size', size);
    return params;
  }

  private appendString(params: HttpParams, key: string, value: string | undefined | null): HttpParams {
    return value === undefined || value === null || value === '' ? params : params.set(key, value);
  }

  private appendNumber(params: HttpParams, key: string, value: number | undefined | null): HttpParams {
    return value === undefined || value === null ? params : params.set(key, value);
  }

  private appendBoolean(params: HttpParams, key: string, value: boolean | undefined | null): HttpParams {
    return value === undefined || value === null ? params : params.set(key, value);
  }

  private appendArray(params: HttpParams, key: string, value: number[] | undefined | null): HttpParams {
    return value === undefined || value === null || value.length === 0 ? params : params.set(key, value.join(','));
  }
}

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}
