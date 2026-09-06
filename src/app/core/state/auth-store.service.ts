import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthResponse, UserResponse } from '../models';
import { TokenStorageService } from '../services/token-storage.service';


@Injectable({
  providedIn: 'root',
})
export class AuthStoreService {
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _user = signal<UserResponse | null>(null);
  private readonly _isReady = signal(false);

  readonly user = this._user.asReadonly();
  readonly isReady = this._isReady.asReadonly();

  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.roles.includes('ADMIN') ?? false);

  setSession(auth: AuthResponse): void {
    this.tokenStorage.setSession(auth);
    this._user.set(auth.user);
    this._isReady.set(true);
  }

  setUser(user: UserResponse): void {
    this.tokenStorage.setUser(user);
    this._user.set(user);
  }

  clear(): void {
    this.tokenStorage.clear();
    this._user.set(null);
    this._isReady.set(true);
  }

  restore(): void {
    this._user.set(this.tokenStorage.getUser());
    this._isReady.set(true);
  }
}
