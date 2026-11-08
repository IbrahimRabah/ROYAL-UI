import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { PublicAnnouncement, PublicPromotion } from '../../models';

/**
 * What the storefront reads: the message strip and the running sale banners. Both are decoration on a page that
 * works without them, so a failure never shows an error toast.
 */
@Injectable({
  providedIn: 'root',
})
export class MarketingApiService {
  private readonly http = inject(HttpClient);

  private readonly quiet = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);

  announcements(): Observable<PublicAnnouncement[]> {
    return this.http.get<PublicAnnouncement[]>(API_ROUTES.marketing.announcements(), { context: this.quiet });
  }

  promotions(): Observable<PublicPromotion[]> {
    return this.http.get<PublicPromotion[]>(API_ROUTES.marketing.promotions(), { context: this.quiet });
  }
}
