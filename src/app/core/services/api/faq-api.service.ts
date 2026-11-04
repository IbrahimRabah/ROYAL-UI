import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { Faq, FaqTopic, PublicSeoPage } from '../../models';
import { buildHttpParams } from './http-params.util';

/**
 * What the storefront reads: published FAQs and the head text of the static pages. Both are decoration on a
 * page that works without them, so a failure never shows an error toast.
 */
@Injectable({
  providedIn: 'root',
})
export class FaqApiService {
  private readonly http = inject(HttpClient);

  private readonly quiet = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);

  forProduct(slug: string): Observable<Faq[]> {
    return this.http.get<Faq[]>(API_ROUTES.faq.product(slug), { context: this.quiet });
  }

  forCategory(categoryId: number): Observable<Faq[]> {
    return this.http.get<Faq[]>(API_ROUTES.faq.category(categoryId), { context: this.quiet });
  }

  general(topic?: FaqTopic | null): Observable<Faq[]> {
    const params = buildHttpParams({ topic: topic ?? null });
    return this.http.get<Faq[]>(API_ROUTES.faq.general(), { params, context: this.quiet });
  }

  seoPage(key: string): Observable<PublicSeoPage> {
    return this.http.get<PublicSeoPage>(API_ROUTES.faq.seoPage(key), { context: this.quiet });
  }
}
