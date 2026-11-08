import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import {
  AdminAnnouncement,
  AdminPromotion,
  AnnouncementSaveRequest,
  PageResponse,
  PromotionImpact,
  PromotionSaveRequest,
  PromotionState,
} from '../../models';
import { buildHttpParams } from './http-params.util';

export type BannerKind = 'DESKTOP' | 'MOBILE';

/** Discounts and the announcement bar: the admin side. */
@Injectable({
  providedIn: 'root',
})
export class AdminMarketingApiService {
  private readonly http = inject(HttpClient);

  // ----------------------------------------------------------------- discounts

  promotions(state: PromotionState | null, page: number, size = 50): Observable<PageResponse<AdminPromotion>> {
    const params = buildHttpParams({ state, page, size });
    return this.http.get<PageResponse<AdminPromotion>>(API_ROUTES.admin.promotions.list(), { params });
  }

  createPromotion(body: PromotionSaveRequest): Observable<AdminPromotion> {
    return this.http.post<AdminPromotion>(API_ROUTES.admin.promotions.list(), body);
  }

  updatePromotion(id: number, body: PromotionSaveRequest): Observable<AdminPromotion> {
    return this.http.put<AdminPromotion>(API_ROUTES.admin.promotions.one(id), body);
  }

  /** What it would do, before it is switched on. Changes nothing. */
  impact(id: number): Observable<PromotionImpact> {
    return this.http.get<PromotionImpact>(API_ROUTES.admin.promotions.impact(id));
  }

  /** Also resumes a paused one. Refused (409) when a variant would sell below cost. */
  activate(id: number): Observable<AdminPromotion> {
    return this.http.post<AdminPromotion>(API_ROUTES.admin.promotions.action(id, 'activate'), null);
  }

  pause(id: number): Observable<AdminPromotion> {
    return this.http.post<AdminPromotion>(API_ROUTES.admin.promotions.action(id, 'pause'), null);
  }

  end(id: number): Observable<AdminPromotion> {
    return this.http.post<AdminPromotion>(API_ROUTES.admin.promotions.action(id, 'end'), null);
  }

  deletePromotion(id: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.promotions.one(id));
  }

  uploadBanner(id: number, kind: BannerKind, file: File): Observable<AdminPromotion> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<AdminPromotion>(API_ROUTES.admin.promotions.banner(id), form, { params: buildHttpParams({ kind }) });
  }

  removeBanner(id: number, kind: BannerKind): Observable<AdminPromotion> {
    return this.http.delete<AdminPromotion>(API_ROUTES.admin.promotions.banner(id), { params: buildHttpParams({ kind }) });
  }

  // ------------------------------------------------------------- announcements

  announcements(): Observable<AdminAnnouncement[]> {
    return this.http.get<AdminAnnouncement[]>(API_ROUTES.admin.announcements.list());
  }

  createAnnouncement(body: AnnouncementSaveRequest): Observable<AdminAnnouncement> {
    return this.http.post<AdminAnnouncement>(API_ROUTES.admin.announcements.list(), body);
  }

  updateAnnouncement(id: number, body: AnnouncementSaveRequest): Observable<AdminAnnouncement> {
    return this.http.put<AdminAnnouncement>(API_ROUTES.admin.announcements.one(id), body);
  }

  setAnnouncementActive(id: number, active: boolean): Observable<AdminAnnouncement> {
    return this.http.post<AdminAnnouncement>(API_ROUTES.admin.announcements.toggle(id, active), null);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.announcements.one(id));
  }

  reorderAnnouncements(ids: number[]): Observable<{ reordered: number }> {
    return this.http.put<{ reordered: number }>(API_ROUTES.admin.announcements.reorder(), { ids });
  }
}
