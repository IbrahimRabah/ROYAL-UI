import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { AuthResponse, UserResponse } from '../models';

const ACCESS_TOKEN_KEY = 'velora_access_token';
const REFRESH_TOKEN_KEY = 'velora_refresh_token';
const USER_KEY = 'velora_user';

/**
 * Stores accessToken, refreshToken and the full UserResponse from login/register.
 *
 * IMPORTANT: POST /auth/me returns firstName/lastName/fullName = null — it's built from
 * JWT claims, not a DB lookup. No other endpoint returns the user's name. That means the
 * name must be captured from the login/register response and kept as-is; callers must
 * NOT pass the raw /auth/me response into setUser(), or they will overwrite a real name
 * with null. /auth/me is only good for confirming id/roles/verification flags/locale.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);

  getAccessToken(): string | null {
    return this.read(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.read(REFRESH_TOKEN_KEY);
  }

  getUser(): UserResponse | null {
    const raw = this.read(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserResponse;
    } catch {
      return null;
    }
  }

  setSession(auth: AuthResponse): void {
    this.write(ACCESS_TOKEN_KEY, auth.accessToken);
    this.write(REFRESH_TOKEN_KEY, auth.refreshToken);
    this.setUser(auth.user);
  }

  setAccessToken(token: string): void {
    this.write(ACCESS_TOKEN_KEY, token);
  }

  setRefreshToken(token: string): void {
    this.write(REFRESH_TOKEN_KEY, token);
  }

  setUser(user: UserResponse): void {
    this.write(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    this.remove(ACCESS_TOKEN_KEY);
    this.remove(REFRESH_TOKEN_KEY);
    this.remove(USER_KEY);
  }

  private read(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(key);
  }

  private write(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(key, value);
  }

  private remove(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(key);
  }
}
