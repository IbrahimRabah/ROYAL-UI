import { isPlatformBrowser } from '@angular/common';
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

import { MyReview } from '../../../../core/models';
import { ReviewApiService } from '../../../../core/services/api/review-api.service';

const COMMENT_MAX = 2000;

/**
 * Write a review, or edit one's own. Stars are a radio group (arrow keys and Tab work, screen readers
 * announce «3 of 5»). Saving never publishes anything: the review waits for staff, and the dialog says so.
 */
@Component({
  selector: 'app-review-dialog',
  templateUrl: './review-dialog.component.html',
  styleUrl: './review-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDialogComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly api = inject(ReviewApiService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() open = false;
  @Input({ required: true }) productId!: number;
  @Input({ required: true }) productName!: string;
  /** Set when editing; absent when writing a new review. */
  @Input() existing: MyReview | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<MyReview>();

  @ViewChild('panel') private readonly panelRef?: ElementRef<HTMLElement>;

  readonly rating = signal(0);
  readonly hover = signal(0);
  readonly comment = signal('');
  readonly saving = signal(false);
  readonly maxLength = COMMENT_MAX;
  readonly values = [1, 2, 3, 4, 5];

  private lastFocused: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  get canSubmit(): boolean {
    return this.rating() >= 1 && !this.saving();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.rating.set(this.existing?.rating ?? 0);
      this.comment.set(this.existing?.comment ?? '');
      this.hover.set(0);
      if (isPlatformBrowser(this.platformId)) {
        this.lastFocused = document.activeElement as HTMLElement | null;
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.panelRef?.nativeElement.focus());
      }
    } else if (isPlatformBrowser(this.platformId)) {
      this.release();
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
    this.release();
    const node = this.elementRef.nativeElement;
    node.parentNode?.removeChild(node);
  }

  setComment(value: string): void {
    this.comment.set(value.slice(0, COMMENT_MAX));
  }

  /** Arrow keys move the rating like a native radio group. */
  onStarKey(event: Event, value: number): void {
    const key = (event as KeyboardEvent).key;
    const step = key === 'ArrowRight' || key === 'ArrowUp' ? 1 : key === 'ArrowLeft' || key === 'ArrowDown' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    this.rating.set(Math.min(5, Math.max(1, value + step)));
    queueMicrotask(() => this.panelRef?.nativeElement.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  }

  cancel(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }
    this.saving.set(true);
    const body = { rating: this.rating(), comment: this.comment().trim() || null };
    const request = this.existing
      ? this.api.update(this.existing.id, body)
      : this.api.create(this.productId, body);
    request.subscribe({
      next: (review) => {
        this.saving.set(false);
        this.saved.emit(review);
      },
      // The global error toast already explains it; the dialog stays open so the text is not lost.
      error: () => this.saving.set(false),
    });
  }

  private release(): void {
    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
    this.lastFocused?.focus();
    this.lastFocused = null;
  }
}
