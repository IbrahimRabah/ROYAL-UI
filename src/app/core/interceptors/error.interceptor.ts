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

const CONCURRENT_STOCK_RETRIED = new HttpContextToken<boolean>(() => false);

export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export interface ValidationFailedError {
  readonly kind: 'VALIDATION_FAILED';
  readonly message: string;
  readonly fieldErrors: FieldError[];
}

export interface StockConflictError {
  readonly kind: 'STOCK_CONFLICT';
  readonly code: ErrorCode.NEGATIVE_STOCK | ErrorCode.STOCK_BELOW_RESERVED;
  readonly message: string;
}

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

    if (err.status === 401) {
      return throwError(() => err);
    }
    if (req.context.get(SUPPRESS_ERROR_TOAST)) {
      return throwError(() => err);
    }

    const apiError = isApiError(err.error) ? err.error : undefined;
    const code = apiError?.code;

    if (apiError && err.status === 400 && code === ErrorCode.VALIDATION_FAILED) {
      const validationError: ValidationFailedError = {
        kind: 'VALIDATION_FAILED',
        message: this.translate(ErrorCode.VALIDATION_FAILED),
        fieldErrors: apiError.errors ?? [],
      };
      return throwError(() => validationError);
    }
    if (
      err.status === 409 &&
      code === ErrorCode.CONCURRENT_STOCK_CHANGE &&
      !req.context.get(CONCURRENT_STOCK_RETRIED)
    ) {
      const retriedReq = req.clone({ context: req.context.set(CONCURRENT_STOCK_RETRIED, true) });
      return next.handle(retriedReq).pipe(catchError((retryErr: unknown) => this.handle(retryErr, retriedReq, next)));
    }
    if (
      apiError &&
      err.status === 409 &&
      (code === ErrorCode.NEGATIVE_STOCK || code === ErrorCode.STOCK_BELOW_RESERVED)
    ) {
      const stockError: StockConflictError = { kind: 'STOCK_CONFLICT', code, message: this.translate(code) };
      return throwError(() => stockError);
    }

    if (err.status === 500 && this.isKnownBuggy500(req.url)) {
      this.toast.error(this.translate(ErrorCode.INTERNAL_ERROR));
      return throwError(() => err);
    }

    this.toast.error(code ? this.translate(code) : this.translate(ErrorCode.INTERNAL_ERROR));
    return throwError(() => err);
  }

  private isKnownBuggy500(url: string): boolean {
    return url === API_ROUTES.cart.merge() || url.endsWith('/payment-status') || url === API_ROUTES.admin.audit.audit();
  }

  private translate(code: ErrorCode): string {
    const table = this.languageService.getCurrentLanguage() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
