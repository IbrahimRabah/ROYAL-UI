import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, computed, effect, signal, untracked } from '@angular/core';

import { ImageResponse } from '../../../../core/models';

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
