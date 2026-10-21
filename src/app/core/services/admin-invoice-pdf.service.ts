import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, catchError, tap } from 'rxjs';

import { InvoiceResponse } from '../models';
import { AdminInvoiceApiService } from './api/admin-invoice-api.service';
import { downloadBlob } from './file-download.util';
import { ToastService } from './toast.service';

/**
 * Admin invoice PDFs live behind an authenticated endpoint, so they are fetched as a blob
 * through HttpClient (the auth interceptor adds the bearer token) and saved from an object
 * URL. Errors are mapped to a toast here; the returned stream always completes without
 * erroring so callers only need `finalize` to reset their loading flag.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminInvoicePdfService {
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  /** `pdfUrl` is stripped from the response when no PDF is stored, so its absence means "no PDF". */
  hasPdf(invoice: Pick<InvoiceResponse, 'pdfUrl'>): boolean {
    return !!invoice.pdfUrl;
  }

  download(invoice: Pick<InvoiceResponse, 'id' | 'invoiceNumber'>): Observable<Blob> {
    return this.invoiceApi.downloadPdf(invoice.id).pipe(
      tap((blob) => downloadBlob(blob, `${invoice.invoiceNumber}.pdf`, this.platformId)),
      catchError((err: unknown) => {
        this.toast.error(this.translate.instant(this.errorKey(err)));
        return EMPTY;
      }),
    );
  }

  private errorKey(err: unknown): string {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    switch (status) {
      case 0:
        return 'toast.invoices.pdf.network';
      case 403:
        return 'toast.invoices.pdf.forbidden';
      case 404:
        return 'toast.invoices.pdf.notFound';
      default:
        return 'toast.invoices.pdf.failed';
    }
  }
}
