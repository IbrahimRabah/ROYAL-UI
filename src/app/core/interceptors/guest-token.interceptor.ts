import { Injectable, inject } from '@angular/core';
import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { ErrorCode } from '../enums/error-code';
import { isApiError } from '../models';
import { GuestTokenService } from '../services/guest-token.service';
import { isGuestTokenScopeUrl } from './guest-scope.util';

export const GUEST_TOKEN_RETRIED = new HttpContextToken<boolean>(() => false);

@Injectable()
export class GuestTokenInterceptor implements HttpInterceptor {
  private readonly guestTokenService = inject(GuestTokenService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!isGuestTokenScopeUrl(req.url) || req.headers.has('Authorization')) {
      return next.handle(req);
    }

    return next.handle(this.withGuestToken(req)).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
          return throwError(() => err);
        }

        const code = isApiError(err.error) ? err.error.code : undefined;
        const alreadyRetried = req.context.get(GUEST_TOKEN_RETRIED);
        if (code !== ErrorCode.TOKEN_INVALID || alreadyRetried) {
          return throwError(() => err);
        }

        return this.guestTokenService.refresh().pipe(
          switchMap((token) => {
            const retriedReq = req.clone({
              setHeaders: token ? { 'X-Guest-Token': token } : {},
              context: req.context.set(GUEST_TOKEN_RETRIED, true),
            });
            return next.handle(retriedReq);
          }),
        );
      }),
    );
  }

  private withGuestToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.guestTokenService.getToken();
    return token ? req.clone({ setHeaders: { 'X-Guest-Token': token } }) : req;
  }
}
