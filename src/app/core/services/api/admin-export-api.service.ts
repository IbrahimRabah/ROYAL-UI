import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { OrderExportFilter } from '../../models';
import { buildHttpParams } from './http-params.util';

@Injectable({
  providedIn: 'root',
})
export class AdminExportApiService {
  private readonly http = inject(HttpClient);

  accounting(filter: OrderExportFilter): Observable<Blob> {
    return this.http.get(API_ROUTES.admin.exports.accounting(), {
      params: this.buildParams(filter),
      responseType: 'blob',
    });
  }

  pickingList(filter: OrderExportFilter): Observable<Blob> {
    return this.http.get(API_ROUTES.admin.exports.pickingList(), {
      params: this.buildParams(filter),
      responseType: 'blob',
    });
  }

  private buildParams(filter: OrderExportFilter): HttpParams {
    return buildHttpParams({
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      fulfillmentStatus: filter.fulfillmentStatus,
      paymentStatus: filter.paymentStatus,
      governorateId: filter.governorateId,
      excludeCancelled: filter.excludeCancelled,
    });
  }
}
