import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';

import { CustomRequestStatus, MyCustomRequestSummary } from '../../../../core/models';
import { MyCustomRequestApiService } from '../../../../core/services/api/my-custom-request-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { PillTone } from '../../utils/order-status-pill.util';
import { customRequestPillTone, formatApiDate, formatQuoteAmount } from '../../utils/custom-request-status.util';

@Component({
  selector: 'app-custom-requests-page',
  templateUrl: './custom-requests-page.component.html',
  styleUrl: './custom-requests-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomRequestsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(MyCustomRequestApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly lang = this.languageStore.lang;

  readonly requests = signal<MyCustomRequestSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly page = signal(0);
  readonly totalPages = signal(0);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.fetch(0);
  }

  onPageChange(page: number): void {
    this.fetch(page);
  }

  retry(): void {
    this.fetch(this.page());
  }

  /** A request waiting for the customer's answer, decided by the server's own flags. */
  needsAnswer(r: MyCustomRequestSummary): boolean {
    return r.canAccept || r.canReject;
  }

  tone(status: CustomRequestStatus): PillTone {
    return customRequestPillTone(status);
  }

  formatDate(iso: string): string {
    return formatApiDate(iso, this.lang());
  }

  amount(r: MyCustomRequestSummary): string | null {
    return r.quotedAmount == null ? null : formatQuoteAmount(r.quotedAmount);
  }

  trackByNumber = (_: number, r: MyCustomRequestSummary): string => r.requestNumber;

  private fetch(page: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.list(page).subscribe({
      next: (res) => {
        this.requests.set(res.content);
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
