import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';

import { ProductReviews, PublicReview } from '../../../../core/models';
import { ReviewApiService } from '../../../../core/services/api/review-api.service';

const PAGE_SIZE = 6;

/**
 * The approved reviews of one product: the average, how many gave each star count, and the reviews
 * themselves, newest first, six at a time. Pending and rejected reviews never reach this component: the
 * server only returns approved ones.
 */
@Component({
  selector: 'app-product-reviews',
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReviewsComponent implements OnChanges {
  private readonly api = inject(ReviewApiService);

  @Input({ required: true }) slug!: string;

  readonly summary = signal<ProductReviews | null>(null);
  readonly reviews = signal<PublicReview[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly failed = signal(false);
  private nextPage = 0;

  readonly stars = [5, 4, 3, 2, 1];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slug']) {
      this.nextPage = 0;
      this.reviews.set([]);
      this.summary.set(null);
      this.loading.set(true);
      this.failed.set(false);
      this.load(false);
    }
  }

  get hasMore(): boolean {
    const s = this.summary();
    return !!s && !s.reviews.last;
  }

  loadMore(): void {
    if (!this.loadingMore() && this.hasMore) {
      this.load(true);
    }
  }

  /** The share of reviews that gave this many stars, for the bar. */
  percent(star: number): number {
    const s = this.summary();
    if (!s || s.count === 0) {
      return 0;
    }
    return Math.round(((s.breakdown[String(star)] ?? 0) / s.count) * 100);
  }

  private load(more: boolean): void {
    if (more) {
      this.loadingMore.set(true);
    }
    this.api.forProduct(this.slug, this.nextPage, PAGE_SIZE).subscribe({
      next: (response) => {
        this.summary.set(response);
        this.reviews.update((list) => [...list, ...response.reviews.content]);
        this.nextPage = response.reviews.page + 1;
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        // Reviews are a bonus on the page: a failure hides them rather than shouting.
        this.failed.set(true);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }
}
