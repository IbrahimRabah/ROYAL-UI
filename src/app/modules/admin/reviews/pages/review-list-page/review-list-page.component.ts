import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminReview, ReviewBulkAction, ReviewCounts, ReviewStatus } from '../../../../../core/models';
import { AdminReviewApiService } from '../../../../../core/services/api/admin-review-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const PAGE_SIZE = 20;

/**
 * Where staff decide which reviews the public sees. Opens on PENDING. A review appears on the product page
 * only while it is APPROVED; rejecting an approved review (shown as «Hide») takes it down again.
 */
@Component({
  selector: 'app-review-list-page',
  templateUrl: './review-list-page.component.html',
  styleUrl: './review-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListPageComponent {
  private readonly api = inject(AdminReviewApiService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  readonly tabs: Tab[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];
  readonly starOptions = [5, 4, 3, 2, 1];

  readonly tab = signal<Tab>('PENDING');
  readonly rating = signal<number | null>(null);
  readonly query = signal('');
  readonly page = signal(0);

  readonly rows = signal<AdminReview[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly counts = signal<ReviewCounts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly busy = signal(false);

  readonly selected = signal<ReadonlySet<number>>(new Set<number>());
  /** The review whose reject note is being typed. */
  readonly rejecting = signal<number | null>(null);
  readonly rejectNote = signal('');

  readonly allSelected = computed(() => this.rows().length > 0 && this.rows().every((r) => this.selected().has(r.id)));
  readonly selectedCount = computed(() => this.selected().size);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
      this.query.set(value);
      this.page.set(0);
      this.load();
    });
    this.load();
  }

  countFor(tab: Tab): number {
    const c = this.counts();
    return tab === 'PENDING' ? c.pending : tab === 'APPROVED' ? c.approved : tab === 'REJECTED' ? c.rejected : c.total;
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.page.set(0);
    this.selected.set(new Set<number>());
    this.rejecting.set(null);
    this.load();
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  onRating(value: string): void {
    this.rating.set(value ? Number(value) : null);
    this.page.set(0);
    this.load();
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const status: ReviewStatus | null = this.tab() === 'ALL' ? null : (this.tab() as ReviewStatus);
    this.api.list({ status, rating: this.rating(), q: this.query().trim() || null }, this.page(), PAGE_SIZE).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
    this.api.counts().subscribe({ next: (c) => this.counts.set(c), error: () => {} });
  }

  // ----------------------------------------------------------------- selection

  isSelected(r: AdminReview): boolean {
    return this.selected().has(r.id);
  }

  toggle(r: AdminReview): void {
    const next = new Set(this.selected());
    if (!next.delete(r.id)) {
      next.add(r.id);
    }
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set<number>() : new Set(this.rows().map((r) => r.id)));
  }

  // ----------------------------------------------------------------- decisions

  approve(r: AdminReview): void {
    this.run(this.api.approve(r.id), 'reviews.admin.toast.approved');
  }

  startReject(r: AdminReview): void {
    this.rejecting.set(r.id);
    this.rejectNote.set('');
  }

  cancelReject(): void {
    this.rejecting.set(null);
  }

  confirmReject(r: AdminReview): void {
    const note = this.rejectNote().trim() || null;
    this.rejecting.set(null);
    this.run(this.api.reject(r.id, note), r.status === 'APPROVED' ? 'reviews.admin.toast.hidden' : 'reviews.admin.toast.rejected');
  }

  remove(r: AdminReview): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('reviews.admin.deleteConfirm.title'),
        message: this.translate.instant('reviews.admin.deleteConfirm.message'),
        confirmLabel: this.translate.instant('reviews.admin.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.delete(r.id), 'reviews.admin.toast.deleted');
        }
      });
  }

  bulk(action: ReviewBulkAction): void {
    const ids = Array.from(this.selected());
    if (ids.length === 0 || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.api.bulk(action, ids).subscribe({
      next: (answer) => {
        this.busy.set(false);
        if (answer.succeeded.length > 0) {
          this.toast.success(this.translate.instant(
            action === 'APPROVE' ? 'reviews.admin.toast.bulkApproved' : 'reviews.admin.toast.bulkRejected',
            { count: answer.succeeded.length }));
        }
        if (answer.skipped.length > 0) {
          this.toast.warning(this.translate.instant('reviews.admin.toast.bulkSkipped', { count: answer.skipped.length }));
        }
        this.selected.set(new Set<number>());
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  private run(call: { subscribe: (observer: { next: () => void; error: () => void }) => unknown }, toastKey: string): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.translate.instant(toastKey));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  statusTone(status: ReviewStatus): string {
    return status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'stop' : 'warn';
  }
}
