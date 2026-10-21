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
    // Only the HTTP status decides whether this is a session problem. 403 means an
    // authenticated caller lacks permission: no refresh, no logout, the caller handles it.
    if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
      return throwError(() => err);
    }

    // `code` is read only for the exclusions below; it is undefined for blob bodies, which
    // is fine because none of those exclusions apply to blob requests.
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
    if (PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p))) {
      return throwError(() => err);
    }

    if (!this.tokenStorage.getRefreshToken()) {
      this.clearSessionAndRedirect();
      return throwError(() => err);
    }

    return this.performRefresh().pipe(
      catchError((refreshErr: unknown) => {
        this.clearSessionAndRedirect();
        return throwError(() => refreshErr);
      }),
      switchMap((auth) =>
        next.handle(this.withAuth(req, auth.accessToken)).pipe(
          catchError((replayErr: unknown) => {
            // A fresh token that is still rejected with 401 is a dead session; a 403 or any
            // other replay failure is the caller's to handle.
            if (replayErr instanceof HttpErrorResponse && replayErr.status === 401) {
              this.clearSessionAndRedirect();
            }
            return throwError(() => replayErr);
          }),
        ),
      ),
    );
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
    const current = this.router.url;
    const onAuthPage = current.startsWith('/auth/');
    void this.router.navigate(['/auth/login'], {
      queryParams: onAuthPage || current === '/' ? {} : { returnUrl: current },
    });
  }
}
