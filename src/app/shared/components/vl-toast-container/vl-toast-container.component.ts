import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { ToastMessage, ToastService, ToastSeverity } from '../../../core/services/toast.service';

const MAX_VISIBLE = 3;

interface ToastItem {
  readonly message: ToastMessage;
  timerId: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

const ICONS: Record<ToastSeverity, string> = {
  success: 'pi-check-circle',
  error: 'pi-times-circle',
  warning: 'pi-exclamation-triangle',
  info: 'pi-info-circle',
};

@Component({
  selector: 'app-vl-toast-container',
  templateUrl: './vl-toast-container.component.html',
  styleUrl: './vl-toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlToastContainerComponent implements OnInit, OnDestroy {
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();

  private readonly _items = signal<ToastItem[]>([]);
  readonly items = this._items.asReadonly();

  ngOnInit(): void {
    this.toastService.messages$.pipe(takeUntil(this.destroy$)).subscribe((message) => this.add(message));
  }

  ngOnDestroy(): void {
    this._items().forEach((item) => this.clearTimer(item));
    this.destroy$.next();
    this.destroy$.complete();
  }

  icon(severity: ToastSeverity): string {
    return ICONS[severity];
  }

  role(severity: ToastSeverity): 'status' | 'alert' {
    return severity === 'error' ? 'alert' : 'status';
  }

  dismiss(id: number): void {
    const item = this._items().find((current) => current.message.id === id);
    if (item) {
      this.clearTimer(item);
    }
    this._items.update((items) => items.filter((current) => current.message.id !== id));
  }

  pause(id: number): void {
    const item = this._items().find((current) => current.message.id === id);
    if (!item || item.timerId === null) {
      return;
    }
    clearTimeout(item.timerId);
    item.timerId = null;
    item.remaining = Math.max(0, item.remaining - (Date.now() - item.startedAt));
  }

  resume(id: number): void {
    const item = this._items().find((current) => current.message.id === id);
    if (!item || item.timerId !== null) {
      return;
    }
    this.schedule(item);
  }

  private add(message: ToastMessage): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const item: ToastItem = { message, timerId: null, remaining: message.life, startedAt: 0 };
    this._items.update((items) => {
      const next = [...items, item];
      while (next.length > MAX_VISIBLE) {
        const dropped = next.shift();
        if (dropped) {
          this.clearTimer(dropped);
        }
      }
      return next;
    });
    this.schedule(item);
  }

  private schedule(item: ToastItem): void {
    item.startedAt = Date.now();
    item.timerId = setTimeout(() => this.dismiss(item.message.id), item.remaining);
  }

  private clearTimer(item: ToastItem): void {
    if (item.timerId !== null) {
      clearTimeout(item.timerId);
      item.timerId = null;
    }
  }
}
