import { Injectable, inject } from '@angular/core';
import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { API_ROUTES } from '../constants/api-routes';
import { ErrorCode } from '../enums/error-code';
import { AuthResponse, isApiError } from '../models';
import { TokenStorageService } from '../services/token-storage.service';
import { isGuestTokenScopeUrl } from './guest-scope.util';
/** Public auth endpoints — a 401 here is the answer, not an expired session. */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/otp/send',
  '/auth/otp/verify',
] as const;

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private refreshInProgress$: Observable<AuthResponse> | null = null;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const accessToken = this.tokenStorage.getAccessToken();
    const authorizedReq = accessToken ? this.withAuth(req, accessToken) : req;

    return next.handle(authorizedReq).pipe(catchError((err: unknown) => this.handle401(err, req, next)));
  }

  private handle401(err: unknown, req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!(err instanceof HttpErrorResponse) || err.status !== 401  && err.status !== 403) {
      return throwError(() => err);
    }

    const code = isApiError(err.error) ? err.error.code : undefined;
    if (req.url === API_ROUTES.auth.refresh()) {
      this.clearSessionAndRedirect();
      return throwError(() => err);
    }
    if (code === ErrorCode.INVALID_CREDENTIALS) {
      return throwError(() => err);
    }
    if (code === ErrorCode.TOKEN_INVALID && isGuestTokenScopeUrl(req.url)) {
      return throwError(() => err);
    }
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p));
 const isSecurityRejection = code === ErrorCode.UNAUTHORIZED || code === undefined;

    if (isSecurityRejection && !isPublicAuthPath) {
      if (!this.tokenStorage.getRefreshToken()) {
        this.clearSessionAndRedirect();
        return throwError(() => err);
      }

      return this.performRefresh().pipe(
        switchMap((auth) => next.handle(this.withAuth(req, auth.accessToken))),
        catchError((refreshErr: unknown) => {
          this.clearSessionAndRedirect();
          return throwError(() => refreshErr);
        }),
      );
    }

    return throwError(() => err);
  }

  private performRefresh(): Observable<AuthResponse> {
    if (!this.refreshInProgress$) {
      const refreshToken = this.tokenStorage.getRefreshToken();
      this.refreshInProgress$ = this.http
        .post<AuthResponse>(API_ROUTES.auth.refresh(), { refreshToken })
        .pipe(
          tap((auth) => this.tokenStorage.setSession(auth)),
          finalize(() => {
            this.refreshInProgress$ = null;
          }),
          shareReplay(1),
        );
    }
    return this.refreshInProgress$;
  }

  private withAuth(req: HttpRequest<unknown>, accessToken: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
  }

  private clearSessionAndRedirect(): void {
    this.tokenStorage.clear();
    void this.router.navigateByUrl('/auth/login');
  }
}
