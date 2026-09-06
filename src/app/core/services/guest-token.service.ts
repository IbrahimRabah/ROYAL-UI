import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';

import { API_ROUTES } from '../constants/api-routes';
import { GuestTokenResponse } from '../models';

const COOKIE_NAME = 'velora_guest_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; 
@Injectable({
  providedIn: 'root',
})
export class GuestTokenService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private pendingRequest$: Observable<string> | null = null;

  getToken(): string | null {
    return this.readCookie();
  }

  ensureToken(): Observable<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return of('');
    }

    const existing = this.readCookie();
    if (existing) {
      return of(existing);
    }

    return this.request();
  }

  refresh(): Observable<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return of('');
    }

    this.deleteCookie();
    this.pendingRequest$ = null;
    return this.request();
  }

  clear(): void {
    this.deleteCookie();
    this.pendingRequest$ = null;
  }

  private request(): Observable<string> {
    if (!this.pendingRequest$) {
      this.pendingRequest$ = this.http.post<GuestTokenResponse>(API_ROUTES.cart.guestToken(), null).pipe(
        map((response) => response.guestToken),
        tap((token) => this.writeCookie(token)),
        finalize(() => {
          this.pendingRequest$ = null;
        }),
        shareReplay(1),
      );
    }
    return this.pendingRequest$;
  }

  private readCookie(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const match = this.document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private writeCookie(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
  }

  private deleteCookie(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
  }
}
