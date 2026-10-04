import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { Subject, concatMap, debounceTime, from, toArray } from 'rxjs';

import { PortfolioImage } from '../../../../../core/models';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { AdminPortfolioApiService } from '../../../../../core/services/api/admin-portfolio-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { errorMessageFor, parseApiError } from '../../portfolio-error.util';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 20;

interface ImageDraft {
  altTextAr: string;
  altTextEn: string;
  displayOrder: string;
}

@Component({
  selector: 'app-portfolio-images-panel',
  templateUrl: './portfolio-images-panel.component.html',
  styleUrl: './portfolio-images-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioImagesPanelComponent implements OnChanges {
  private readonly api = inject(AdminPortfolioApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly languageStore = inject(LanguageStoreService);

  /** null on a new, unsaved item — both image endpoints need an id. */
  @Input() itemId: number | null = null;
  /** An archived item takes no image changes until it is restored (409 PORTFOLIO_ITEM_ARCHIVED). */
  @Input() archived = false;

  readonly images = signal<PortfolioImage[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly drafts = signal<Record<number, ImageDraft>>({});
  readonly busyImageId = signal<number | null>(null);

  private readonly pendingOrder = new Map<number, number>();
  private readonly reorderTrigger$ = new Subject<void>();

  constructor() {
    this.reorderTrigger$.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(() => this.flushReorder());
  }

  get disabled(): boolean {
    return this.itemId === null || this.archived;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('itemId' in changes) {
      this.images.set([]);
      this.drafts.set({});
      if (this.itemId !== null) this.fetch();
    }
  }

  retry(): void {
    this.fetch();
  }

  // ---------------------------------------------------------------- upload

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (!this.disabled && event.dataTransfer?.files?.length) this.handleFiles(event.dataTransfer.files);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFiles(input.files);
    input.value = '';
  }

  private handleFiles(fileList: FileList): void {
    const valid: File[] = [];
    let slotsLeft = MAX_IMAGES - this.images().length;

    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.toast.error(this.translate.instant('admin.portfolio.images.errors.unsupportedType', { name: file.name }));
      } else if (file.size > MAX_SIZE_BYTES) {
        this.toast.error(this.translate.instant('admin.portfolio.images.errors.tooLarge', { name: file.name }));
      } else if (slotsLeft <= 0) {
        this.toast.error(this.translate.instant('admin.portfolio.images.errors.limitReached', { name: file.name }));
      } else {
        valid.push(file);
        slotsLeft--;
      }
    }
    if (valid.length) this.upload(valid);
  }

  /** Sequential, so "the first upload becomes main" is deterministic. */
  private upload(files: File[]): void {
    const id = this.itemId;
    if (id === null || this.uploading()) return;
    this.uploading.set(true);
    from(files)
      .pipe(
        concatMap((file) => this.api.uploadImage(id, file)),
        toArray(),
      )
      .subscribe({
        next: (uploaded) => {
          this.uploading.set(false);
          this.toast.success(this.translate.instant('toast.portfolio.imagesUploaded', { count: uploaded.length }));
          this.fetch();
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.failed(err);
          this.fetch();
        },
      });
  }

  // ---------------------------------------------------------------- per image

  draftOf(image: PortfolioImage): ImageDraft {
    return (
      this.drafts()[image.id] ?? {
        altTextAr: image.altTextAr ?? '',
        altTextEn: image.altTextEn ?? '',
        displayOrder: String(image.displayOrder),
      }
    );
  }

  onDraft(image: PortfolioImage, field: keyof ImageDraft, value: string): void {
    this.drafts.update((d) => ({ ...d, [image.id]: { ...this.draftOf(image), [field]: value } }));
  }

  isDirty(image: PortfolioImage): boolean {
    const draft = this.drafts()[image.id];
    if (!draft) return false;
    const order = Number(draft.displayOrder);
    return (
      draft.altTextAr !== (image.altTextAr ?? '') ||
      draft.altTextEn !== (image.altTextEn ?? '') ||
      (draft.displayOrder.trim() !== '' && Number.isInteger(order) && order >= 0 && order !== image.displayOrder)
    );
  }

  saveImage(image: PortfolioImage): void {
    const id = this.itemId;
    const draft = this.drafts()[image.id];
    if (id === null || !draft || this.busyImageId() !== null) return;
    const order = Number(draft.displayOrder);
    this.busyImageId.set(image.id);
    this.api
      .updateImage(id, image.id, {
        altTextAr: draft.altTextAr || null,
        altTextEn: draft.altTextEn || null,
        displayOrder: Number.isInteger(order) && order >= 0 ? order : image.displayOrder,
      })
      .subscribe({
        next: (updated) => {
          this.busyImageId.set(null);
          this.drafts.update((d) => {
            const { [image.id]: _removed, ...rest } = d;
            return rest;
          });
          this.images.update((list) => this.sorted(list.map((i) => (i.id === updated.id ? updated : i))));
          this.toast.success(this.translate.instant('toast.portfolio.imageSaved'));
        },
        error: (err: unknown) => {
          this.busyImageId.set(null);
          this.failed(err);
        },
      });
  }

  setMain(image: PortfolioImage): void {
    const id = this.itemId;
    if (id === null || image.main || this.busyImageId() !== null) return;
    this.busyImageId.set(image.id);
    this.api.updateImage(id, image.id, { main: true }).subscribe({
      next: () => {
        this.busyImageId.set(null);
        this.toast.success(this.translate.instant('toast.portfolio.imageMainSet'));
        this.fetch();
      },
      error: (err: unknown) => {
        this.busyImageId.set(null);
        this.failed(err);
      },
    });
  }

  deleteImage(image: PortfolioImage): void {
    const id = this.itemId;
    if (id === null) return;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.portfolio.images.deleteConfirm.title'),
        message: this.translate.instant('admin.portfolio.images.deleteConfirm.message'),
        confirmLabel: this.translate.instant('admin.portfolio.images.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.deleteImage(id, image.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('toast.portfolio.imageDeleted'));
            this.fetch();
          },
          error: (err: unknown) => this.failed(err),
        });
      });
  }

  // ---------------------------------------------------------------- reorder (debounced)

  onReorderDrop(event: CdkDragDrop<PortfolioImage[]>): void {
    if (this.disabled || event.previousIndex === event.currentIndex) return;
    const next = [...this.images()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    const reindexed = next.map((image, index) => ({ ...image, displayOrder: index }));
    next.forEach((image, index) => {
      if (image.displayOrder !== index) this.pendingOrder.set(image.id, index);
    });
    this.images.set(reindexed);
    this.reorderTrigger$.next();
  }

  private flushReorder(): void {
    const id = this.itemId;
    const entries = Array.from(this.pendingOrder.entries());
    this.pendingOrder.clear();
    if (id === null || !entries.length) return;
    from(entries)
      .pipe(
        concatMap(([imageId, displayOrder]) => this.api.updateImage(id, imageId, { displayOrder })),
        toArray(),
      )
      .subscribe({
        error: (err: unknown) => {
          this.toast.error(this.translate.instant('admin.portfolio.images.reorderError'));
          this.failed(err, false);
          this.fetch();
        },
      });
  }

  // ---------------------------------------------------------------- plumbing

  private sorted(list: PortfolioImage[]): PortfolioImage[] {
    return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private failed(err: unknown, toastIt = true): void {
    const parsed = parseApiError(err);
    if (!toastIt) return;
    const message =
      parsed.code === ErrorCode.VALIDATION_FAILED && parsed.fieldErrors.length
        ? parsed.fieldErrors[0].message
        : errorMessageFor(parsed, this.languageStore.lang());
    this.toast.error(message);
  }

  private fetch(): void {
    const id = this.itemId;
    if (id === null) return;
    this.loading.set(true);
    this.error.set(false);
    this.api.listImages(id).subscribe({
      next: (images) => {
        this.images.set(this.sorted(images));
        this.drafts.set({});
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
