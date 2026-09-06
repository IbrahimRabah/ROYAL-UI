import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { ErrorCode } from '../../../../core/enums/error-code';
import { OrderResponse, isApiError } from '../../../../core/models';
import { OrderApiService } from '../../../../core/services/api/order-api.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const REASON_MAX_LENGTH = 255;

@Component({
  selector: 'app-cancel-order-dialog',
  templateUrl: './cancel-order-dialog.component.html',
  styleUrl: './cancel-order-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CancelOrderDialogComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly orderApi = inject(OrderApiService);
  private readonly translate = inject(TranslateService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() open = false;
  @Input({ required: true }) orderNumber!: string;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<OrderResponse>();
  @Output() readonly orderStale = new EventEmitter<void>();

  @ViewChild('panel') private readonly panelRef?: ElementRef<HTMLElement>;

  readonly reason = signal('');
  readonly saving = signal(false);
  readonly scrolled = signal(false);

  readonly maxLength = REASON_MAX_LENGTH;
  readonly suggestedReasonKeys: readonly string[] = [
    'account.cancelDialog.chips.changedMind',
    'account.cancelDialog.chips.orderedByMistake',
    'account.cancelDialog.chips.foundElsewhere',
    'account.cancelDialog.chips.deliveryTooLong',
  ];

  private lastFocused: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  get canSubmit(): boolean {
    return this.reason().trim().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.reason.set('');
      this.scrolled.set(false);
      if (isPlatformBrowser(this.platformId)) {
        this.lastFocused = document.activeElement as HTMLElement | null;
        this.lockBodyScroll();
        setTimeout(() => this.panelRef?.nativeElement.focus());
      }
    } else if (isPlatformBrowser(this.platformId)) {
      this.unlockBodyScroll();
      this.lastFocused?.focus();
      this.lastFocused = null;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.appendChild(document.body, this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.unlockBodyScroll();
    const node = this.elementRef.nativeElement;
    if (node.parentNode) {
      this.renderer.removeChild(node.parentNode, node);
    }
  }

  setReason(value: string): void {
    this.reason.set(value.slice(0, this.maxLength));
  }

  fillReason(key: string): void {
    this.reason.set((this.translate.instant(key) as string).slice(0, this.maxLength));
  }

  onBodyScroll(event: Event): void {
    this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
  }

  onTab(domEvent: Event): void {
    const event = domEvent as KeyboardEvent;
    const panelEl = this.panelRef?.nativeElement;
    if (!panelEl) {
      return;
    }
    const focusable = Array.from(panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panelEl.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (this.saving() || !this.canSubmit) {
      return;
    }
    this.saving.set(true);
    this.orderApi.cancel(this.orderNumber, { reason: this.reason().trim() }).subscribe({
      next: (order) => {
        this.saving.set(false);
        this.cancelled.emit(order);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (
          err instanceof HttpErrorResponse &&
          err.status === 409 &&
          isApiError(err.error) &&
          err.error.code === ErrorCode.ORDER_CANNOT_BE_CANCELLED
        ) {
          this.orderStale.emit();
          return;
        }
      },
    });
  }

  private lockBodyScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }
    document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }
}
