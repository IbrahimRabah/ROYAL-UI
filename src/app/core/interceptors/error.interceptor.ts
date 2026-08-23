import { Injectable, inject } from '@angular/core';
import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { API_ROUTES } from '../constants/api-routes';
import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../constants/error-messages';
import { ErrorCode } from '../enums/error-code';
import { Language } from '../enums/language';
import { FieldError, isApiError } from '../models';
import { LanguageService } from '../services/language.service';
import { ToastService } from '../services/toast.service';

// Guards the "retry once" rule for the optimistic-lock conflict below.
const CONCURRENT_STOCK_RETRIED = new HttpContextToken<boolean>(() => false);

// Set by order-api.service.place() — checkout renders STOCK_UNAVAILABLE, GOVERNORATE_NOT_SERVED,
// CART_EMPTY and DUPLICATE_ORDER inline (above the Place Order button, or as a distinct
// "still processing" state for the 409), never as a toast. Every other caller is unaffected.
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

// Thrown instead of the raw HttpErrorResponse for 400 VALIDATION_FAILED, so forms can
// check `error.kind` and render `fieldErrors` under each control by `field` name instead
// of digging through err.error.errors themselves.
export interface ValidationFailedError {
  readonly kind: 'VALIDATION_FAILED';
  readonly message: string;
  readonly fieldErrors: FieldError[];
}

// Thrown instead of the raw HttpErrorResponse for 409 NEGATIVE_STOCK / STOCK_BELOW_RESERVED
// on the receive/adjust inventory mutations — the operator needs to see this right next to
// the figures they're editing, never as a toast (see handleInventoryMutationError).
export interface StockConflictError {
  readonly kind: 'STOCK_CONFLICT';
  readonly code: ErrorCode.NEGATIVE_STOCK | ErrorCode.STOCK_BELOW_RESERVED;
  readonly message: string;
}

/**
 * err.error is read as the contract's RFC 7807 ApiError shape and its `code` translated
 * via ERROR_MESSAGES_*. Three codes get special handling; everything else falls through
 * to a translated toast. 401s are deliberately never touched here — auth.interceptor and
 * guest-token.interceptor sit further out in the response chain (this interceptor is
 * registered *after* them, so it sees the raw response first) and need to see the
 * untouched error to run their own refresh/retry logic.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly languageService = inject(LanguageService);
  private readonly toast = inject(ToastService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(catchError((err: unknown) => this.handle(err, req, next)));
  }

  private handle(err: unknown, req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!(err instanceof HttpErrorResponse)) {
      return throwError(() => err);
    }

    // Owned by auth.interceptor / guest-token.interceptor — never toast or transform.
    if (err.status === 401) {
      return throwError(() => err);
    }

    // Caller owns its own inline error handling — pass the raw HttpErrorResponse through
    // untouched, including for 400 VALIDATION_FAILED (checkout's own address form already
    // validates required fields client-side, so this is a rare edge case handled generically).
    if (req.context.get(SUPPRESS_ERROR_TOAST)) {
      return throwError(() => err);
    }

    const apiError = isApiError(err.error) ? err.error : undefined;
    const code = apiError?.code;

    // 400 VALIDATION_FAILED — no toast, hand the form a typed, field-addressable error.
    if (apiError && err.status === 400 && code === ErrorCode.VALIDATION_FAILED) {
      const validationError: ValidationFailedError = {
        kind: 'VALIDATION_FAILED',
        message: this.translate(ErrorCode.VALIDATION_FAILED),
        fieldErrors: apiError.errors ?? [],
      };
      return throwError(() => validationError);
    }

    // 409 CONCURRENT_STOCK_CHANGE — optimistic-lock conflict; the contract says the
    // client should just retry. One silent retry, no error shown unless it fails again.
    if (
      err.status === 409 &&
      code === ErrorCode.CONCURRENT_STOCK_CHANGE &&
      !req.context.get(CONCURRENT_STOCK_RETRIED)
    ) {
      const retriedReq = req.clone({ context: req.context.set(CONCURRENT_STOCK_RETRIED, true) });
      return next.handle(retriedReq).pipe(catchError((retryErr: unknown) => this.handle(retryErr, retriedReq, next)));
    }

    // 409 NEGATIVE_STOCK / STOCK_BELOW_RESERVED — the receive/adjust dialogs render these
    // inline next to the variant's current figures so the operator can correct right
    // there; never a toast, same treatment as VALIDATION_FAILED above.
    if (
      apiError &&
      err.status === 409 &&
      (code === ErrorCode.NEGATIVE_STOCK || code === ErrorCode.STOCK_BELOW_RESERVED)
    ) {
      const stockError: StockConflictError = { kind: 'STOCK_CONFLICT', code, message: this.translate(code) };
      return throwError(() => stockError);
    }

    // Known backend bugs (documented in the contract) that can return a malformed or
    // misleading 500 body — never try to interpret it, just show the generic message.
    if (err.status === 500 && this.isKnownBuggy500(req.url)) {
      this.toast.error(this.translate(ErrorCode.INTERNAL_ERROR));
      return throwError(() => err);
    }

    this.toast.error(code ? this.translate(code) : this.translate(ErrorCode.INTERNAL_ERROR));
    return throwError(() => err);
  }

  private isKnownBuggy500(url: string): boolean {
    // POST /cart/merge without a Bearer token: principal.id() with no null check -> NPE.
    // PATCH .../admin/orders/{id}/payment-status: PaymentStatus.valueOf() throws unchecked.
    // GET /admin/audit: AuditAction.valueOf() throws unchecked on an unrecognized `action`.
    return url === API_ROUTES.cart.merge() || url.endsWith('/payment-status') || url === API_ROUTES.admin.audit.audit();
  }

  private translate(code: ErrorCode): string {
    const table = this.languageService.getCurrentLanguage() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
