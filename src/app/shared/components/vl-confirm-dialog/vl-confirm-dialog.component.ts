import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { ConfirmDialogRequest, ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-vl-confirm-dialog',
  templateUrl: './vl-confirm-dialog.component.html',
  styleUrl: './vl-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlConfirmDialogComponent implements OnInit, OnDestroy {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();
  private lastFocused: HTMLElement | null = null;

  @ViewChild('confirmBtn') private readonly confirmBtnRef?: ElementRef<HTMLButtonElement>;

  private readonly _request = signal<ConfirmDialogRequest | null>(null);
  readonly request = this._request.asReadonly();

  ngOnInit(): void {
    this.confirmDialogService.requests$.pipe(takeUntil(this.destroy$)).subscribe((request) => {
      this._request.set(request);
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.lastFocused = document.activeElement as HTMLElement | null;
      setTimeout(() => this.confirmBtnRef?.nativeElement.focus());
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  confirm(): void {
    this.answer(true);
  }

  cancel(): void {
    this.answer(false);
  }

  private answer(confirmed: boolean): void {
    const request = this._request();
    if (!request) {
      return;
    }
    this.confirmDialogService.resolve(request.id, confirmed);
    this._request.set(null);
    if (isPlatformBrowser(this.platformId)) {
      this.lastFocused?.focus();
    }
  }
}
