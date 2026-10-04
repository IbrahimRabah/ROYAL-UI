import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import {
  PageResponse,
  PortfolioAdminResponse,
  PortfolioImage,
  PortfolioImageUpdateRequest,
  PortfolioUpsertRequest,
} from '../../models';

/**
 * Calls that the form screen answers inline (slug conflicts, archived items) pass `inline: true`
 * so the global interceptor doesn't also toast the same error.
 */
const quiet = (inline: boolean): { context?: HttpContext } =>
  inline ? { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) } : {};

@Injectable({
  providedIn: 'root',
})
export class AdminPortfolioApiService {
  private readonly http = inject(HttpClient);

  list(page: number, size: number, includeArchived: boolean, categoryId?: number | null): Observable<PageResponse<PortfolioAdminResponse>> {
    let params = new HttpParams().set('page', page).set('size', size).set('includeArchived', includeArchived);
    if (categoryId != null) params = params.set('categoryId', categoryId);
    return this.http.get<PageResponse<PortfolioAdminResponse>>(API_ROUTES.admin.portfolio.list(), { params });
  }

  get(id: number): Observable<PortfolioAdminResponse> {
    return this.http.get<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.item(id), quiet(true));
  }

  create(body: PortfolioUpsertRequest): Observable<PortfolioAdminResponse> {
    return this.http.post<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.list(), body, quiet(true));
  }

  update(id: number, body: PortfolioUpsertRequest): Observable<PortfolioAdminResponse> {
    return this.http.put<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.item(id), body, quiet(true));
  }

  /** Explicit state, not a toggle. */
  setPublished(id: number, published: boolean, inline = false): Observable<PortfolioAdminResponse> {
    return this.http.patch<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.publish(id), { published }, quiet(inline));
  }

  /** DELETE archives — the row and its images are kept. */
  archive(id: number): Observable<PortfolioAdminResponse> {
    return this.http.delete<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.item(id));
  }

  /** Brings an archived item back as an unpublished draft. */
  restore(id: number): Observable<PortfolioAdminResponse> {
    return this.http.patch<PortfolioAdminResponse>(API_ROUTES.admin.portfolio.restore(id), {});
  }

  listImages(id: number): Observable<PortfolioImage[]> {
    return this.http.get<PortfolioImage[]>(API_ROUTES.admin.portfolio.images(id));
  }

  /** Multipart with a part named `file`; the browser sets the Content-Type boundary. */
  uploadImage(id: number, file: File): Observable<PortfolioImage> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PortfolioImage>(API_ROUTES.admin.portfolio.images(id), formData, quiet(true));
  }

  updateImage(id: number, imageId: number, body: PortfolioImageUpdateRequest): Observable<PortfolioImage> {
    return this.http.patch<PortfolioImage>(API_ROUTES.admin.portfolio.image(id, imageId), body, quiet(true));
  }

  deleteImage(id: number, imageId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.portfolio.image(id, imageId), quiet(true));
  }
}
