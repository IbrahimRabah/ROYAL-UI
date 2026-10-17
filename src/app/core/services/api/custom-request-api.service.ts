import { HttpClient, HttpContext, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { CustomRequestAttachmentResponse, CustomRequestCreateRequest, CustomRequestCreated } from '../../models';

const quiet = (): HttpContext => new HttpContext().set(SUPPRESS_ERROR_TOAST, true);

@Injectable({
  providedIn: 'root',
})
export class CustomRequestApiService {
  private readonly http = inject(HttpClient);

  /** Every failure (field errors, 429 RATE_LIMITED) is answered inline by the page, so no toast. */
  create(body: CustomRequestCreateRequest): Observable<CustomRequestCreated> {
    return this.http.post<CustomRequestCreated>(API_ROUTES.customRequests.create(), body, { context: quiet() });
  }

  /**
   * One image per call: multipart part `file`, proof of ownership in `X-Request-Token` (the
   * attachmentToken from create, valid 24h). Emits progress events.
   */
  uploadAttachment(id: number, token: string, file: File): Observable<HttpEvent<CustomRequestAttachmentResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CustomRequestAttachmentResponse>(API_ROUTES.customRequests.attachments(id), form, {
      headers: new HttpHeaders({ 'X-Request-Token': token }),
      context: quiet(),
      reportProgress: true,
      observe: 'events',
    });
  }
}
