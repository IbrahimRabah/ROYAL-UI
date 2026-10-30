import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import {
  ImportBatchResponse,
  ImportCommitResponse,
  ImportRowResponse,
  ImportRowStatus,
  ImportRowUpdateResponse,
  ImportSkuCheck,
  PageResponse,
} from '../../models';
import { buildHttpParams } from './http-params.util';

/**
 * Bulk product upload. Upload and commit report their own failures on the page (the server's
 * `detail` names the differing columns or the failing row), so the global error toast is off for
 * those two calls and the caller reads the error itself.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminProductImportApiService {
  private readonly http = inject(HttpClient);

  private readonly ownErrors = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);

  /** The empty .xlsx: the only file the upload accepts. */
  template(): Observable<Blob> {
    return this.http.get(API_ROUTES.admin.productImports.template(), { responseType: 'blob' });
  }

  /** Step 1: parse and validate. Saves nothing to the catalogue. */
  upload(file: File): Observable<ImportBatchResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportBatchResponse>(API_ROUTES.admin.productImports.imports(), formData, {
      context: this.ownErrors,
    });
  }

  get(batchId: number): Observable<ImportBatchResponse> {
    return this.http.get<ImportBatchResponse>(API_ROUTES.admin.productImports.batch(batchId));
  }

  rows(batchId: number, status: ImportRowStatus | null, page: number, size: number): Observable<PageResponse<ImportRowResponse>> {
    const params = buildHttpParams({ status, page, size });
    return this.http.get<PageResponse<ImportRowResponse>>(API_ROUTES.admin.productImports.rows(batchId), { params });
  }

  /**
   * Fixes one row of a preview. The server checks it exactly as an uploaded row and answers with the row
   * and the batch totals; a mistake in the new values is a finding in the answer, not an error.
   */
  editRow(batchId: number, rowNo: number, values: Record<string, string>): Observable<ImportRowUpdateResponse> {
    return this.http.put<ImportRowUpdateResponse>(API_ROUTES.admin.productImports.row(batchId, rowNo), { values });
  }

  /** Is this SKU unique? Pass the row being edited so it does not clash with itself. */
  checkSku(batchId: number, sku: string, rowNo: number): Observable<ImportSkuCheck> {
    const params = buildHttpParams({ sku, rowNo });
    return this.http.get<ImportSkuCheck>(API_ROUTES.admin.productImports.skuCheck(batchId), { params });
  }

  /** Step 2: all products are written in one transaction, or none. */
  commit(batchId: number): Observable<ImportCommitResponse> {
    return this.http.post<ImportCommitResponse>(API_ROUTES.admin.productImports.commit(batchId), null, {
      context: this.ownErrors,
    });
  }

  discard(batchId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.admin.productImports.batch(batchId));
  }
}
