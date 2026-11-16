import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';

import { ImageResponse } from '../../../../core/models';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';

@Component({
  selector: 'app-product-gallery',
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductGalleryComponent implements OnDestroy {
  private readonly imagesSignal = signal<ImageResponse[]>([]);
  private readonly preferredImageIdSignal = signal<number | null>(null);
  private readonly activeIndex = signal(0);
  private readonly imageOpacitySignal = signal(1);
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private hasImages = false;
  private readonly scrollLock = inject(ScrollLockService);

  @ViewChild('lightbox') private lightboxRef?: ElementRef<HTMLDialogElement>;

  readonly lightboxOpen = signal(false);
  readonly zoomed = signal(false);

  @Input({ required: true }) productName!: string;

  @Input({ required: true })
  set images(value: ImageResponse[]) {
    this.imagesSignal.set(value);
  }
  get images(): ImageResponse[] {
    return this.imagesSignal();
  }

  @Input()
  set activeImageId(value: number | null) {
    this.preferredImageIdSignal.set(value ?? null);
  }

  @Output() readonly displayedImageIdChange = new EventEmitter<number | null>();

  readonly index = this.activeIndex.asReadonly();
  readonly imageOpacity = this.imageOpacitySignal.asReadonly();
  readonly activeImage = computed(() => this.imagesSignal()[this.activeIndex()] ?? null);

  constructor() {
    effect(() => {
      const images = this.imagesSignal();
      const preferredId = this.preferredImageIdSignal();
      const foundIndex = preferredId != null ? images.findIndex((image) => image.id === preferredId) : -1;
      const targetIndex = foundIndex >= 0 ? foundIndex : 0;

      if (!this.hasImages) {
        this.hasImages = images.length > 0;
        this.activeIndex.set(targetIndex);
        return;
      }
      this.goToIndex(targetIndex);
    }, { allowSignalWrites: true });

    effect(() => {
      this.displayedImageIdChange.emit(this.activeImage()?.id ?? null);
    });
  }

  ngOnDestroy(): void {
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    // Leaving the page with the lightbox open removes the <dialog> without a `close` event: release the lock here.
    if (this.lightboxOpen()) this.scrollLock.unlock();
  }

  openLightbox(): void {
    const dialog = this.lightboxRef?.nativeElement;
    if (!dialog || dialog.open || typeof dialog.showModal !== 'function') return;
    this.zoomed.set(false);
    this.lightboxOpen.set(true);
    dialog.showModal();
    this.scrollLock.lock();
  }

  closeLightbox(): void {
    this.lightboxRef?.nativeElement.close();
  }

  /** Fires for Escape, the close button and `close()` alike. */
  onLightboxClosed(): void {
    if (!this.lightboxOpen()) return;
    this.lightboxOpen.set(false);
    this.zoomed.set(false);
    this.scrollLock.unlock();
  }

  /** A click on the dark backdrop (the dialog or its empty stage, not the image or a button) dismisses it. */
  onDialogClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target === this.lightboxRef?.nativeElement || target?.classList.contains('product-gallery__lightbox-stage')) {
      this.closeLightbox();
    }
  }

  toggleZoom(): void {
    this.zoomed.update((value) => !value);
  }

  select(i: number): void {
    this.goToIndex(i);
  }

  previous(): void {
    this.step(-1);
  }

  next(): void {
    this.step(1);
  }

  private step(direction: number): void {
    const count = this.imagesSignal().length;
    if (!count) return;
    this.goToIndex((this.activeIndex() + direction + count) % count);
  }

  private goToIndex(index: number): void {
    if (index === untracked(this.activeIndex)) return;

    this.activeIndex.set(index);
    this.imageOpacitySignal.set(0);
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => this.imageOpacitySignal.set(1), 20);
  }
}
