import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import {
  AuditEntryResponse,
  CustomRequestDetail,
  CustomRequestStatus,
  CustomRequestType,
  money,
} from '../../../../../core/models';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { AdminAuditApiService } from '../../../../../core/services/api/admin-audit-api.service';
import { AdminCustomRequestApiService } from '../../../../../core/services/api/admin-custom-request-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ValidationFailedError } from '../../../../../core/interceptors/error.interceptor';
import { errorMessageFor, parseApiError } from '../../../portfolio/portfolio-error.util';
import { RequestActionMode, RequestActionPayload } from '../../components/request-action-dialog/request-action-dialog.component';
import { REQUEST_STATUS_TONE, REQUEST_TYPE_TONE } from '../request-list-page/request-list-page.component';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const DATE_TIME = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface TimelineItem {
  key: string;
  kind: 'created' | 'status' | 'quote';
  at: string;
  from: string | null;
  to: string | null;
  note: string | null;
  actor: string | null;
}

@Component({
  selector: 'app-request-detail-page',
  templateUrl: './request-detail-page.component.html',
  styleUrl: './request-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminCustomRequestApiService);
  private readonly auditApi = inject(AdminAuditApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly requestId = Number(this.route.snapshot.paramMap.get('id'));

  readonly request = signal<CustomRequestDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly loadError = signal(false);
  readonly timeline = signal<TimelineItem[]>([]);

  readonly dialogMode = signal<RequestActionMode | null>(null);
  readonly dialogSaving = signal(false);
  readonly dialogError = signal<string | null>(null);
  readonly busy = signal(false);

  readonly lightboxIndex = signal<number | null>(null);

  readonly status = computed<CustomRequestStatus | null>(() => this.request()?.status ?? null);
  readonly hasQuote = computed(() => {
    const amount = this.request()?.quotedAmount;
    return amount != null && money(amount) > 0;
  });
  readonly quotedNumber = computed(() => (this.hasQuote() ? money(this.request()!.quotedAmount) : null));
  readonly isClosed = computed(() => this.status() === 'ACCEPTED' || this.status() === 'REJECTED' || this.status() === 'CONVERTED');

  readonly canContact = computed(() => this.status() === 'NEW');
  readonly canQuote = computed(() => ['NEW', 'CONTACTED', 'QUOTED'].includes(this.status() ?? ''));
  readonly canReject = computed(() => ['NEW', 'CONTACTED', 'QUOTED'].includes(this.status() ?? ''));
  /** Accepting needs a quote; before then the button is shown but disabled, with the reason. */
  readonly canAccept = computed(() => this.status() === 'QUOTED');
  readonly showAccept = computed(() => ['NEW', 'CONTACTED', 'QUOTED'].includes(this.status() ?? ''));

  /** Only the dimensions that exist — one, two or all three. */
  readonly dimensions = computed(() => {
    const r = this.request();
    if (!r) return null;
    const parts = [r.widthCm, r.heightCm, r.depthCm].filter((v): v is number => v != null).map((v) => String(Number(v)));
    return parts.length ? `${parts.join(' × ')} cm` : null;
  });

  readonly hasAddress = computed(() => {
    const r = this.request();
    return !!(r?.area || r?.streetAddress);
  });

  constructor() {
    this.fetch();
  }

  // ---------------------------------------------------------------- display

  statusTone(status: CustomRequestStatus): StatusTone {
    return REQUEST_STATUS_TONE[status];
  }

  typeTone(type: CustomRequestType): StatusTone {
    return REQUEST_TYPE_TONE[type];
  }

  telHref(phone: string): string {
    return 'tel:' + (phone.startsWith('0') ? '+2' + phone : phone);
  }

  formatMoney(value: number | string | null | undefined): string {
    return MONEY_FORMATTER.format(money(value));
  }

  formatDateTime(iso: string): string {
    return DATE_TIME.format(new Date(iso));
  }

  trackTimeline(_index: number, item: TimelineItem): string {
    return item.key;
  }

  // ---------------------------------------------------------------- actions

  openAction(mode: RequestActionMode): void {
    this.dialogError.set(null);
    this.dialogMode.set(mode);
  }

  closeDialog(): void {
    if (this.dialogSaving()) return;
    this.dialogMode.set(null);
    this.dialogError.set(null);
  }

  submitAction(payload: RequestActionPayload): void {
    const mode = this.dialogMode();
    if (!mode || this.dialogSaving()) return;
    this.dialogSaving.set(true);
    this.dialogError.set(null);

    const call =
      mode === 'quote'
        ? this.api.quote(this.requestId, { amount: payload.amount!, note: payload.note })
        : this.api.setStatus(this.requestId, { status: mode === 'reject' ? 'REJECTED' : 'CONTACTED', note: payload.note });

    call.subscribe({
      next: (res) => {
        this.dialogSaving.set(false);
        this.dialogMode.set(null);
        this.applyResult(res, mode === 'quote' ? 'toast.customRequests.quoted' : mode === 'reject' ? 'toast.customRequests.rejected' : 'toast.customRequests.contacted');
      },
      error: (err: unknown) => {
        this.dialogSaving.set(false);
        this.handleError(err, true);
      },
    });
  }

  accept(): void {
    if (!this.canAccept() || this.busy()) return;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.customRequests.acceptConfirm.title'),
        message: this.translate.instant('admin.customRequests.acceptConfirm.message'),
        confirmLabel: this.translate.instant('admin.customRequests.acceptConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.busy.set(true);
        this.api.setStatus(this.requestId, { status: 'ACCEPTED' }).subscribe({
          next: (res) => {
            this.busy.set(false);
            this.applyResult(res, 'toast.customRequests.accepted');
          },
          error: (err: unknown) => {
            this.busy.set(false);
            this.handleError(err, false);
          },
        });
      });
  }

  /** The interceptor already toasted anything that isn't a validation error; this adds the recovery. */
  private handleError(err: unknown, inDialog: boolean): void {
    const validation = err as Partial<ValidationFailedError>;
    if (validation?.kind === 'VALIDATION_FAILED') {
      this.dialogError.set(validation.fieldErrors?.[0]?.message || validation.message || null);
      return;
    }
    const parsed = parseApiError(err instanceof HttpErrorResponse ? err : null);
    const message = errorMessageFor(parsed, this.languageStore.lang());
    switch (parsed.code) {
      case ErrorCode.CUSTOM_REQUEST_QUOTE_REQUIRED:
        this.dialogMode.set('quote');
        this.dialogError.set(message);
        break;
      case ErrorCode.INVALID_STATUS_TRANSITION:
        // The request moved on elsewhere — reload and close, the buttons will match the real state.
        this.dialogMode.set(null);
        this.fetch(false);
        break;
      case ErrorCode.CUSTOM_REQUEST_NOT_FOUND:
        this.dialogMode.set(null);
        this.notFound.set(true);
        break;
      default:
        if (inDialog) this.dialogError.set(message);
    }
  }

  private applyResult(res: CustomRequestDetail, toastKey: string): void {
    this.request.set(res);
    this.toast.success(this.translate.instant(toastKey));
    this.loadTimeline();
  }

  // ---------------------------------------------------------------- lightbox

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  stepLightbox(delta: number): void {
    const index = this.lightboxIndex();
    const count = this.request()?.attachments.length ?? 0;
    if (index === null || !count) return;
    this.lightboxIndex.set((index + delta + count) % count);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.lightboxIndex() === null) return;
    const rtl = document.documentElement.dir === 'rtl';
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowRight') this.stepLightbox(rtl ? -1 : 1);
    if (event.key === 'ArrowLeft') this.stepLightbox(rtl ? 1 : -1);
  }

  // ---------------------------------------------------------------- load

  retry(): void {
    this.fetch();
  }

  private fetch(showSkeleton = true): void {
    if (showSkeleton) this.loading.set(true);
    this.loadError.set(false);
    this.notFound.set(false);
    this.api.get(this.requestId).subscribe({
      next: (res) => {
        this.request.set(res);
        this.loading.set(false);
        this.loadTimeline();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const parsed = parseApiError(err);
        if (parsed.code === ErrorCode.CUSTOM_REQUEST_NOT_FOUND) this.notFound.set(true);
        else this.loadError.set(true);
      },
    });
  }

  /** The request keeps only its latest note and quote — the audit log is the history. */
  private loadTimeline(): void {
    const request = this.request();
    if (!request) return;
    const created: TimelineItem = { key: 'created', kind: 'created', at: request.createdAt, from: null, to: null, note: null, actor: null };
    this.timeline.set([created]);
    this.auditApi.byEntity('CUSTOM_REQUEST', String(this.requestId), 0, 100).subscribe({
      next: (page) => {
        const events = page.content
          .filter((e) => e.action === 'CUSTOM_REQUEST_STATUS_CHANGED' || e.action === 'CUSTOM_REQUEST_QUOTED')
          .map((e: AuditEntryResponse): TimelineItem => ({
            key: String(e.id),
            kind: e.action === 'CUSTOM_REQUEST_QUOTED' ? 'quote' : 'status',
            at: e.createdAt,
            from: e.oldValue || null,
            to: e.newValue || null,
            note: e.reason || null,
            actor: e.actorName || null,
          }))
          .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        this.timeline.set([created, ...events]);
      },
      error: () => {},
    });
  }
}
