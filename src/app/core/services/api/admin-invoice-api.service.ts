import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import { CancelInvoiceRequest, InvoiceResponse, PageResponse, UninvoicedReport } from '../../models';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { buildHttpParams } from './http-params.util';
const NO_TOAST = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

@Injectable({
  providedIn: 'root',
})
export class AdminInvoiceApiService {
  private readonly http = inject(HttpClient);

  list(page?: number, size?: number): Observable<PageResponse<InvoiceResponse>> {
    const params = buildHttpParams({ page, size: size ?? APP_CONFIG.pagination.invoices.size });
    return this.http.get<PageResponse<InvoiceResponse>>(API_ROUTES.admin.invoices.invoices(), { params });
  }

  get(invoiceId: number): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(API_ROUTES.admin.invoices.invoice(invoiceId));
  }

  downloadPdf(invoiceId: number): Observable<Blob> {
    return this.http.get(API_ROUTES.admin.invoices.pdf(invoiceId), { responseType: 'blob' });
  }
  issue(orderId: number): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(API_ROUTES.admin.invoices.issue(orderId), null, NO_TOAST);
  }

  cancel(invoiceId: number, body: CancelInvoiceRequest): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(API_ROUTES.admin.invoices.cancel(invoiceId), body, NO_TOAST);
  }

  uninvoiced(): Observable<UninvoicedReport> {
    return this.http.get<UninvoicedReport>(API_ROUTES.admin.invoices.uninvoiced());
  }
}
