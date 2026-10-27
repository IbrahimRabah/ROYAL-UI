import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';

import { MyCustomRequestApiService } from '../services/api/my-custom-request-api.service';
import { AuthStoreService } from './auth-store.service';

/**
 * How many of the signed-in customer's custom requests are waiting for their answer.
 * There is no email in this system, so this count is the only way a customer learns a quote arrived.
 *
 * It loads once when a session starts (sign-in or restored session) and is cleared on sign-out.
 * Pages call refresh() only after something changed (accept / reject / a stale answer).
 */
@Injectable({
  providedIn: 'root',
})
export class CustomRequestSummaryStoreService {
  private readonly api = inject(MyCustomRequestApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _awaiting = signal(0);
  readonly awaiting = this._awaiting.asReadonly();

  constructor() {
    effect(() => {
      const signedIn = this.authStore.isLoggedIn();
      untracked(() => {
        if (signedIn && this.isBrowser) {
          this.refresh();
        } else {
          this.reset();
        }
      });
    }, { allowSignalWrites: true });
  }

  refresh(): void {
    this.api.summary().subscribe({
      next: (s) => this._awaiting.set(s.awaitingResponse ?? 0),
      // A failed count must not break the page; keep whatever was last known.
      error: () => {},
    });
  }

  reset(): void {
    this._awaiting.set(0);
  }
}
