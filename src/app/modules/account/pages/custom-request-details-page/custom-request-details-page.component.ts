import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { ErrorCode } from '../../../../core/enums/error-code';
import { CustomRequestStatus, MyCustomRequestDetail, isApiError } from '../../../../core/models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { MyCustomRequestApiService } from '../../../../core/services/api/my-custom-request-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CustomRequestSummaryStoreService } from '../../../../core/state/custom-request-summary-store.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { PillTone } from '../../utils/order-status-pill.util';
import { customRequestPillTone, formatApiDate, formatQuoteAmount } from '../../utils/custom-request-status.util';

/** Shown above the request after something happened that the customer must read before deciding again. */
type Notice = 'changed' | 'answered' | 'failed';

@Component({
  selector: 'app-custom-request-details-page',
  templateUrl: './custom-request-details-page.component.html',
  styleUrl: './custom-request-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomRequestDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(MyCustomRequestApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly summaryStore = inject(CustomRequestSummaryStoreService);

  readonly requestNumber = this.route.snapshot.paramMap.get('number') ?? '';
  readonly lang = this.languageStore.lang;

  readonly request = signal<MyCustomRequestDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  /** 404 — not theirs or does not exist. One state, no distinction. */
  readonly notFound = signal(false);
  readonly busy = signal(false);
  readonly notice = signal<Notice | null>(null);

  /** The amount exactly as the current response carries it, formatted for display only. */
  readonly amountText = computed(() => {
    const amount = this.request()?.quotedAmount;
    return amount == null ? null : formatQuoteAmount(amount);
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.fetch(true);
  }

  retry(): void {
    this.fetch(true);
  }

  tone(status: CustomRequestStatus): PillTone {
    return customRequestPillTone(status);
  }

  formatDate(iso: string): string {
    return formatApiDate(iso, this.lang());
  }

  accept(): void {
    const r = this.request();
    // Only when the server says so — never derived from status.
    if (!r || !r.canAccept || r.quotedAmount == null || this.busy()) return;

    // The exact value the customer is looking at, captured now and sent back unchanged.
    const shown = r.quotedAmount;
    const amount = formatQuoteAmount(shown);
    const currency = this.translate.instant('account.customRequests.currency');

    this.confirmDialog
      .confirm({
        title: this.translate.instant('account.customRequests.acceptConfirm.title'),
        message: this.translate.instant('account.customRequests.acceptConfirm.message', { amount, currency }),
        confirmLabel: this.translate.instant('account.customRequests.acceptConfirm.confirm', { amount, currency }),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.busy.set(true);
        this.notice.set(null);
        this.api.accept(this.requestNumber, { quotedAmount: shown }).subscribe({
          next: () => this.afterAnswer('toast.myCustomRequests.accepted'),
          error: (err: unknown) => this.onError(err),
        });
      });
  }

  reject(): void {
    const r = this.request();
    if (!r || !r.canReject || this.busy()) return;

    this.confirmDialog
      .confirm({
        title: this.translate.instant('account.customRequests.rejectConfirm.title'),
        message: this.translate.instant('account.customRequests.rejectConfirm.message'),
        confirmLabel: this.translate.instant('account.customRequests.rejectConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.busy.set(true);
        this.notice.set(null);
        this.api.reject(this.requestNumber).subscribe({
          next: () => this.afterAnswer('toast.myCustomRequests.rejected'),
          error: (err: unknown) => this.onError(err),
        });
      });
  }

  private afterAnswer(toastKey: string): void {
    this.toast.success(this.translate.instant(toastKey));
    this.summaryStore.refresh();
    this.fetch(false);
  }

  private onError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 404) {
      this.busy.set(false);
      this.notFound.set(true);
      return;
    }
    const code = err instanceof HttpErrorResponse && isApiError(err.error) ? err.error.code : null;
    if (code === ErrorCode.QUOTE_CHANGED) {
      // Reload and show the NEW price; never retry and never accept it for them.
      this.fetch(false, 'changed');
      return;
    }
    if (code === ErrorCode.QUOTE_ALREADY_ANSWERED) {
      this.fetch(false, 'answered');
      return;
    }
    this.busy.set(false);
    this.notice.set('failed');
  }

  private fetch(showSkeleton: boolean, notice: Notice | null = null): void {
    if (showSkeleton) this.loading.set(true);
    this.error.set(false);
    this.api.get(this.requestNumber).subscribe({
      next: (r) => {
        this.request.set(r);
        this.notFound.set(false);
        this.loading.set(false);
        this.busy.set(false);
        if (notice) {
          this.notice.set(notice);
          // The request changed under the customer (price moved / already answered): the count may have too.
          this.summaryStore.refresh();
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.notFound.set(true);
        } else if (showSkeleton) {
          this.error.set(true);
        } else {
          this.notice.set('failed');
        }
      },
    });
  }
}
