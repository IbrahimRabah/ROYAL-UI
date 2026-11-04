import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  AdminFaq,
  FaqScope,
  FaqSaveRequest,
  FaqStatus,
  FaqTopic,
  PageResponse,
  SeoFilter,
  SeoMetaRequest,
  SeoOverview,
  SeoPageAdmin,
  SeoPageRequest,
  SeoRow,
  StaffRole,
  TeamMember,
} from '../../models';
import { buildHttpParams } from './http-params.util';

/** The SEO team's screens: meta texts, static pages and FAQs. */
@Injectable({
  providedIn: 'root',
})
export class AdminSeoApiService {
  private readonly http = inject(HttpClient);

  overview(): Observable<SeoOverview> {
    return this.http.get<SeoOverview>(API_ROUTES.admin.seo.overview());
  }

  products(q: string | null, filter: SeoFilter, status: string | null, page: number, size = 20): Observable<PageResponse<SeoRow>> {
    const params = buildHttpParams({ q: q || null, filter, status, page, size });
    return this.http.get<PageResponse<SeoRow>>(API_ROUTES.admin.seo.products(), { params });
  }

  updateProduct(id: number, body: SeoMetaRequest): Observable<SeoRow> {
    return this.http.put<SeoRow>(API_ROUTES.admin.seo.product(id), body);
  }

  categories(q: string | null, filter: SeoFilter, page: number, size = 50): Observable<PageResponse<SeoRow>> {
    const params = buildHttpParams({ q: q || null, filter, page, size });
    return this.http.get<PageResponse<SeoRow>>(API_ROUTES.admin.seo.categories(), { params });
  }

  updateCategory(id: number, body: SeoMetaRequest): Observable<SeoRow> {
    return this.http.put<SeoRow>(API_ROUTES.admin.seo.category(id), body);
  }

  pages(): Observable<SeoPageAdmin[]> {
    return this.http.get<SeoPageAdmin[]>(API_ROUTES.admin.seo.pages());
  }

  updatePage(key: string, body: SeoPageRequest): Observable<SeoPageAdmin> {
    return this.http.put<SeoPageAdmin>(API_ROUTES.admin.seo.page(key), body);
  }

  // ---------------------------------------------------------------------- FAQs

  faqs(
    filters: { scope: FaqScope | null; status: FaqStatus | null; topic: FaqTopic | null; targetId: number | null; q: string | null },
    page: number,
    size = 100,
  ): Observable<PageResponse<AdminFaq>> {
    // In display order, so the list reads the way the page will and the arrows move what they seem to.
    const params = buildHttpParams({ ...filters, page, size, sort: 'position,asc' });
    return this.http.get<PageResponse<AdminFaq>>(API_ROUTES.admin.faqs.list(), { params });
  }

  createFaq(body: FaqSaveRequest): Observable<AdminFaq> {
    return this.http.post<AdminFaq>(API_ROUTES.admin.faqs.list(), body);
  }

  updateFaq(id: number, body: FaqSaveRequest): Observable<AdminFaq> {
    return this.http.put<AdminFaq>(API_ROUTES.admin.faqs.one(id), body);
  }

  deleteFaq(id: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.faqs.one(id));
  }

  /** The ids in the order they should appear. */
  reorderFaqs(ids: number[]): Observable<{ reordered: number }> {
    return this.http.put<{ reordered: number }>(API_ROUTES.admin.faqs.reorder(), { ids });
  }

  bulkFaqStatus(ids: number[], status: FaqStatus): Observable<{ changed: number }> {
    return this.http.post<{ changed: number }>(API_ROUTES.admin.faqs.bulkStatus(), { ids, status });
  }

  // ---------------------------------------------------------------------- team

  team(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(API_ROUTES.admin.team.list());
  }

  lookupMember(email: string): Observable<TeamMember> {
    return this.http.get<TeamMember>(API_ROUTES.admin.team.lookup(), { params: buildHttpParams({ email }) });
  }

  setRoles(userId: number, roles: StaffRole[]): Observable<TeamMember> {
    return this.http.put<TeamMember>(API_ROUTES.admin.team.roles(userId), { roles });
  }
}
