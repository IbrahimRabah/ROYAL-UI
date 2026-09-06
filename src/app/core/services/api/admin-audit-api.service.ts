import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import { AuditEntryResponse, PageResponse } from '../../models';
import { buildHttpParams } from './http-params.util';

@Injectable({
  providedIn: 'root',
})
export class AdminAuditApiService {
  private readonly http = inject(HttpClient);

  list(action?: string, actorId?: number, page?: number, size?: number): Observable<PageResponse<AuditEntryResponse>> {
    const params = buildHttpParams({ action, actorId, page, size: size ?? APP_CONFIG.pagination.audit.size });
    return this.http.get<PageResponse<AuditEntryResponse>>(API_ROUTES.admin.audit.audit(), { params });
  }

  byEntity(entityType: string, entityId: string, page?: number, size?: number): Observable<PageResponse<AuditEntryResponse>> {
    const params = buildHttpParams({ page, size: size ?? APP_CONFIG.pagination.audit.size });
    return this.http.get<PageResponse<AuditEntryResponse>>(API_ROUTES.admin.audit.byEntity(entityType, entityId), { params });
  }
}
