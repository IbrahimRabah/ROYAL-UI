import { AfterViewInit, Directive, ElementRef, Inject, OnDestroy, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
})
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.renderer.addClass(this.el.nativeElement, 'scroll-reveal');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      this.renderer.addClass(this.el.nativeElement, 'scroll-reveal--visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.renderer.addClass(this.el.nativeElement, 'scroll-reveal--visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
