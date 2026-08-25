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

// Scroll-snap carousel: 1 track, N slides sized by breakpoint (see .scss), buttons and
// dots drive it via scrollLeft rather than PrimeNG's p-carousel (SSR hydration issues
// there, see p-drawer precedent — memory/primeng_drawer_ssr_bug.md).
//
// scrollByPage()/scrollToPage() always take a *logical* step (-1 = back toward the first
// item, +1 = forward toward the last) — never a physical left/right. RTL is handled by
// flipping the sign once here, so callers (buttons, keyboard) never need to know direction.
// Button *position* mirrors for free from normal flex layout inheriting the ambient
// `dir`; only the chevron glyph needs the explicit flip, done globally in
// styles/_rtl.scss (a component-scoped `[dir='rtl'] ...` rule can't match — Angular's
// emulated encapsulation scopes the ancestor selector too, and <html> is never inside
// this component's own rendered content).
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

  // Native smooth scroll, not a manual rAF loop — the viewport has scroll-snap-type:
  // mandatory, and driving scrollLeft frame-by-frame ourselves fights the browser's own
  // snap correction (both writing to scrollLeft at once), which is what made the
  // buttons feel janky. Letting the browser own the whole scroll keeps it smooth and
  // lands exactly on the snap point.
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
