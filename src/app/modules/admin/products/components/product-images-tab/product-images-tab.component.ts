import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, forkJoin } from 'rxjs';

import { AdminImageResponse, ImageUpdateRequest, VariantAdminResponse } from '../../../../../core/models';
import { AdminProductApiService } from '../../../../../core/services/api/admin-product-api.service';
import { AdminVariantApiService } from '../../../../../core/services/api/admin-variant-api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ImageEditSave } from '../image-edit-dialog/image-edit-dialog.component';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 20;

@Component({
  selector: 'app-product-images-tab',
  templateUrl: './product-images-tab.component.html',
  styleUrl: './product-images-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductImagesTabComponent implements OnInit {
  private readonly productApi = inject(AdminProductApiService);
  private readonly variantApi = inject(AdminVariantApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input({ required: true }) productId!: number;
  @Output() readonly imagesChanged = new EventEmitter<void>();

  readonly images = signal<AdminImageResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly variants = signal<VariantAdminResponse[]>([]);

  readonly dragOver = signal(false);
  readonly uploading = signal(false);

  readonly editingImage = signal<AdminImageResponse | null>(null);
  readonly savingEdit = signal(false);

  private readonly pendingOrder = new Map<number, number>();
  private readonly reorderTrigger$ = new Subject<void>();

  constructor() {
    this.reorderTrigger$.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(() => this.flushReorder());
  }

  ngOnInit(): void {
    this.fetchImages();
    this.variantApi.listByProduct(this.productId).subscribe({ next: (v) => this.variants.set(v), error: () => {} });
  }

  retry(): void {
    this.fetchImages();
  }

  localizedVariantLabel(variant: VariantAdminResponse): string {
    return `${variant.summary} — ${variant.sku}`;
  }


  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
    }
    input.value = '';
  }

  private handleFiles(fileList: FileList): void {
    const files = Array.from(fileList);
    const valid: File[] = [];
    let slotsLeft = MAX_IMAGES - this.images().length;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.toast.error(this.translate.instant('admin.products.form.images.errors.unsupportedType', { name: file.name }));
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        this.toast.error(this.translate.instant('admin.products.form.images.errors.tooLarge', { name: file.name }));
        continue;
      }
      if (slotsLeft <= 0) {
        this.toast.error(this.translate.instant('admin.products.form.images.errors.limitReached', { name: file.name }));
        continue;
      }
      valid.push(file);
      slotsLeft--;
    }

    if (valid.length) {
      this.uploadFiles(valid);
    }
  }

  private uploadFiles(files: File[]): void {
    this.uploading.set(true);
    forkJoin(files.map((f) => this.productApi.uploadImage(this.productId, f))).subscribe({
      next: (uploaded) => {
        this.uploading.set(false);
        this.toast.success(this.translate.instant('toast.products.imagesUploaded', { count: uploaded.length }));
        this.fetchImages();
        this.imagesChanged.emit();
      },
      error: () => {
        this.uploading.set(false);
        this.fetchImages();
      },
    });
  }

  setMain(image: AdminImageResponse): void {
    if (image.main) {
      return;
    }
    this.productApi.updateImage(this.productId, image.id, { main: true }).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('toast.products.imageMainSet'));
        this.fetchImages();
      },
      error: () => {},
    });
  }

  deleteImage(image: AdminImageResponse): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.form.images.deleteConfirm.title'),
        message: this.translate.instant('admin.products.form.images.deleteConfirm.message'),
        confirmLabel: this.translate.instant('admin.products.form.images.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.productApi.deleteImage(this.productId, image.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('toast.products.imageDeleted'));
            this.fetchImages();
            this.imagesChanged.emit();
          },
          error: () => {},
        });
      });
  }

  startEdit(image: AdminImageResponse): void {
    this.editingImage.set(image);
  }

  closeEditDialog(): void {
    this.editingImage.set(null);
  }

  saveEditDialog(payload: ImageEditSave): void {
    const image = this.editingImage();
    if (!image || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    const body: ImageUpdateRequest = {
      altTextAr: payload.altTextAr,
      altTextEn: payload.altTextEn,
      variantId: payload.variantId,
    };
    if (payload.setMain && !image.main) {
      body.main = true;
    }
    this.productApi.updateImage(this.productId, image.id, body).subscribe({
      next: (updated) => {
        this.savingEdit.set(false);
        this.editingImage.set(null);
        this.images.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
        this.toast.success(this.translate.instant('toast.products.imageSaved'));
      },
      error: () => this.savingEdit.set(false),
    });
  }


  onReorderDrop(event: CdkDragDrop<AdminImageResponse[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const next = [...this.images()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.images.set(next);
    next.forEach((image, index) => {
      if (image.displayOrder !== index) {
        this.pendingOrder.set(image.id, index);
      }
    });
    this.reorderTrigger$.next();
  }

  private flushReorder(): void {
    const entries = Array.from(this.pendingOrder.entries());
    this.pendingOrder.clear();
    if (!entries.length) {
      return;
    }
    forkJoin(entries.map(([id, displayOrder]) => this.productApi.updateImage(this.productId, id, { displayOrder }))).subscribe({
      error: () => {
        this.toast.error(this.translate.instant('admin.products.form.images.reorderError'));
        this.fetchImages();
      },
    });
  }

  private fetchImages(): void {
    this.loading.set(true);
    this.error.set(false);
    this.productApi.listImages(this.productId).subscribe({
      next: (images) => {
        this.images.set(images);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
