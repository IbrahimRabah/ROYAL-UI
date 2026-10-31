import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { SUPPRESS_ERROR_TOAST } from '../../interceptors/error.interceptor';
import { ImageBulkResponse, ImageImportMode, ImageMatchRequest, ImageMatchResponse } from '../../models';

/**
 * Bulk image upload, matched to products by file name = SKU. Both calls report their own failures on the page
 * (a batch that fails must be retried file by file, not announced with one toast per request), so the global
 * error toast is off for them.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminProductImageImportApiService {
  private readonly http = inject(HttpClient);

  private readonly ownErrors = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);

  /** Step 1: file NAMES only. Says which file belongs to which product; nothing is written. */
  match(request: ImageMatchRequest): Observable<ImageMatchResponse> {
    return this.http.post<ImageMatchResponse>(API_ROUTES.admin.productImageImport.match(), request, {
      context: this.ownErrors,
    });
  }

  /**
   * Step 2: a few pictures at a time (the server takes at most 12 and 10 MB per request). Each file has its
   * own result, so one bad file never fails the request. `runId` is the same for every request of one run.
   */
  upload(runId: string, mode: ImageImportMode, files: File[]): Observable<ImageBulkResponse> {
    const formData = new FormData();
    formData.append('runId', runId);
    formData.append('mode', mode);
    // The file keeps the name it had in the folder: that name is the SKU rule. Its bytes may be the resized copy.
    files.forEach((f) => formData.append('files', f, f.name));
    return this.http.post<ImageBulkResponse>(API_ROUTES.admin.productImageImport.bulk(), formData, {
      context: this.ownErrors,
    });
  }
}
