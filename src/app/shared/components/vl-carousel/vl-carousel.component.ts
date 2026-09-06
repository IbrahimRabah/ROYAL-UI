import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { LanguageStoreService } from '../../../core/state/language-store.service';
@Component({
  selector: 'app-vl-carousel',
  templateUrl: './vl-carousel.component.html',
  styleUrl: './vl-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlCarouselComponent<T> implements AfterViewInit, OnDestroy {
  @Input({ required: true }) items: T[] = [];
  @Input() ariaLabel = '';

  @ContentChild(TemplateRef) itemTemplate!: TemplateRef<{ $implicit: T; index: number }>;
  @ViewChild('viewport') private readonly viewportRef!: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly cdr = inject(ChangeDetectorRef);

  private resizeObserver?: ResizeObserver;
  private prefersReducedMotion = false;

  atStart = true;
  atEnd = false;
  activePage = 0;
  pageCount = 1;

  get pagesArray(): number[] {
    return Array.from({ length: this.pageCount });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.measure();

    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.viewportRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onScroll(): void {
    this.measure();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.scrollByPage(this.languageStore.isRtl() ? -1 : 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.scrollByPage(this.languageStore.isRtl() ? 1 : -1);
    }
  }

  scrollByPage(direction: 1 | -1): void {
    if (!this.isBrowser) return;
    const viewport = this.viewportRef.nativeElement;
    const sign = this.languageStore.isRtl() ? -1 : 1;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const min = sign > 0 ? 0 : -maxScroll;
    const max = sign > 0 ? maxScroll : 0;
    const target = Math.min(max, Math.max(min, viewport.scrollLeft + sign * direction * viewport.clientWidth));
    this.animateScrollTo(target);
  }

  scrollToPage(page: number): void {
    if (!this.isBrowser) return;
    const viewport = this.viewportRef.nativeElement;
    const sign = this.languageStore.isRtl() ? -1 : 1;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const raw = sign * page * viewport.clientWidth;
    const target = sign > 0 ? Math.min(raw, maxScroll) : Math.max(raw, -maxScroll);
    this.animateScrollTo(target);
  }
  private animateScrollTo(target: number): void {
    const viewport = this.viewportRef.nativeElement;
    viewport.scrollTo({ left: target, behavior: this.prefersReducedMotion ? 'auto' : 'smooth' });
  }

  private measure(): void {
    const viewport = this.viewportRef.nativeElement;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const scrolled = Math.abs(viewport.scrollLeft);

    this.atStart = scrolled < 1;
    this.atEnd = maxScroll < 1 || Math.abs(scrolled - maxScroll) < 1;
    this.pageCount = viewport.clientWidth > 0 ? Math.max(1, Math.ceil(viewport.scrollWidth / viewport.clientWidth)) : 1;
    this.activePage = viewport.clientWidth > 0
      ? Math.min(this.pageCount - 1, Math.round(scrolled / viewport.clientWidth))
      : 0;

    this.cdr.markForCheck();
  }
}
