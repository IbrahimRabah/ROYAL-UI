import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { EligibleReview, MyReview } from '../../../../core/models';
import { ReviewApiService } from '../../../../core/services/api/review-api.service';
import { ToastService } from '../../../../core/services/toast.service';

const PAGE_SIZE = 10;

/** What the dialog is open for: a product to review, or one of my reviews to edit. */
interface DialogTarget {
  productId: number;
  productName: string;
  existing: MyReview | null;
}

/**
 * «My reviews»: the products I received and can still review, and the reviews I wrote with their state.
 * A review is PENDING until staff approve it, and editing one puts it back to PENDING.
 */
@Component({
  selector: 'app-reviews-page',
  templateUrl: './reviews-page.component.html',
  styleUrl: './reviews-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsPageComponent {
  private readonly api = inject(ReviewApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly eligible = signal<EligibleReview[]>([]);
  readonly reviews = signal<MyReview[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly hasMore = signal(false);
  readonly target = signal<DialogTarget | null>(null);
  private nextPage = 0;

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.nextPage = 0;
    this.api.eligible().subscribe({
      next: (list) => this.eligible.set(list),
      error: () => this.failed.set(true),
    });
    this.api.mine(0, PAGE_SIZE).subscribe({
      next: (page) => {
        this.reviews.set(page.content);
        this.hasMore.set(!page.last);
        this.nextPage = 1;
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    this.api.mine(this.nextPage, PAGE_SIZE).subscribe({
      next: (page) => {
        this.reviews.update((list) => [...list, ...page.content]);
        this.hasMore.set(!page.last);
        this.nextPage += 1;
      },
      error: () => {},
    });
  }

  write(item: EligibleReview): void {
    this.target.set({ productId: item.productId, productName: item.name, existing: null });
  }

  edit(review: MyReview): void {
    this.target.set({ productId: review.productId, productName: review.productName, existing: review });
  }

  closeDialog(): void {
    this.target.set(null);
  }

  onSaved(review: MyReview): void {
    const wasEdit = this.target()?.existing != null;
    this.target.set(null);
    this.toast.success(this.translate.instant(wasEdit ? 'reviews.toast.edited' : 'reviews.toast.sent'));
    this.reload();
    void review;
  }

  statusTone(status: MyReview['status']): string {
    return status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'stop' : 'warn';
  }
}
