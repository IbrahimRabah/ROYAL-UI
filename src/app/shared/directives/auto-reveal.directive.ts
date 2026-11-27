import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

/** What gets revealed automatically inside the host. Anything can opt in with data-reveal="up|fade|zoom|start|end". */
const TARGETS = 'section, app-vl-product-card, [data-reveal], .draw-line, .vl-ornament';
/** Never touched: dialogs and overlays, and anything a template explicitly opts out with data-no-reveal. */
const EXCLUDED = '[data-no-reveal], [role="dialog"], dialog, .p-dialog, .scroll-reveal, .reveal';
const VARIANTS = new Set(['up', 'fade', 'zoom', 'start', 'end']);
/** Elements already on screen this soon after a navigation are shown as they are (the page fade covers them). */
const SETTLE_MS = 700;
const STAGGER_MS = 80;
const MAX_STAGGER = 6;
/** Longest transition in _motion.scss plus margin; the classes are removed after this. */
const CLEANUP_MS = 1300;

/**
 * Scroll-reveal for a whole region of the page, without touching each template: sections, product cards and
 * headings with a drawn rule fade/rise in as they enter the viewport, staggered when several arrive together.
 *
 * - SSR and hydration: does nothing on the server, and never hides something the visitor can already see when
 *   the page settles, so there is no flash of content disappearing.
 * - Content that arrives later (products from the API, infinite scroll, a filter change) is picked up by a
 *   MutationObserver and animated in.
 * - Classes are removed once the animation is over, so no transform stays on the element.
 * - prefers-reduced-motion: off entirely.
 */
@Directive({
  selector: '[appAutoReveal]',
})
export class AutoRevealDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private io?: IntersectionObserver;
  private mo?: MutationObserver;
  private navSub?: Subscription;
  private readonly seen = new WeakSet<Element>();
  private settleUntil = 0;
  private scanQueued = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window) ||
      !('MutationObserver' in window)
    ) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.settleUntil = performance.now() + SETTLE_MS;

      this.io = new IntersectionObserver((entries) => this.onIntersect(entries), {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0,
      });

      this.mo = new MutationObserver(() => this.queueScan());
      this.mo.observe(this.host, { childList: true, subtree: true });

      this.navSub = this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => {
          this.settleUntil = performance.now() + SETTLE_MS;
          this.queueScan();
        });

      this.scan();
    });
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.mo?.disconnect();
    this.navSub?.unsubscribe();
    this.timers.forEach((t) => clearTimeout(t));
  }

  private queueScan(): void {
    if (this.scanQueued) return;
    this.scanQueued = true;
    requestAnimationFrame(() => {
      this.scanQueued = false;
      this.scan();
    });
  }

  private scan(): void {
    if (!this.io) return;
    const now = performance.now();
    const viewportH = window.innerHeight;

    this.host.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
      if (this.seen.has(el)) return;
      this.seen.add(el);

      if (el.closest(EXCLUDED)) return;

      const isLine = el.classList.contains('draw-line') || el.classList.contains('vl-ornament');
      // Cards and explicit data-reveal items stagger on their own, even inside a section that is revealing.
      const isItem = el.tagName === 'APP-VL-PRODUCT-CARD' || el.hasAttribute('data-reveal');

      // A section inside a section that is still waiting to appear rides along with its parent.
      if (!isLine && !isItem && el.parentElement?.closest('.vl-reveal:not(.vl-reveal--line)')) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // not rendered (display: none, closed tab...)

      const onScreen = rect.top < viewportH && rect.bottom > 0;
      // A line on screen draws itself with its own CSS keyframe as soon as it is created; only lines further
      // down are held back until they scroll in. Content already in view after a navigation stays put.
      if (onScreen && (isLine || now < this.settleUntil)) return;

      const variant = isLine ? 'line' : this.variantOf(el);
      el.classList.add('vl-reveal', `vl-reveal--${variant}`);
      this.io!.observe(el);
    });
  }

  private variantOf(el: HTMLElement): string {
    const wanted = el.getAttribute('data-reveal');
    return wanted && VARIANTS.has(wanted) ? wanted : 'up';
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    const entering = entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target as HTMLElement)
      // Reading order: top to bottom, then along the line in the page's direction.
      .sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const rowDiff = ra.top - rb.top;
        if (Math.abs(rowDiff) > 8) return rowDiff;
        return document.dir === 'rtl' ? rb.left - ra.left : ra.left - rb.left;
      });

    entering.forEach((el, i) => {
      this.io?.unobserve(el);
      const delay = Math.min(i, MAX_STAGGER) * STAGGER_MS;
      if (delay) el.style.setProperty('--vl-reveal-delay', `${delay}ms`);

      // Next frame, so the hidden state is painted before we flip to visible (otherwise no transition).
      requestAnimationFrame(() => {
        el.classList.add('vl-reveal--in');
        const timer = setTimeout(() => {
          this.timers.delete(timer);
          el.classList.remove('vl-reveal', 'vl-reveal--in', `vl-reveal--${this.variantClass(el)}`);
          el.style.removeProperty('--vl-reveal-delay');
        }, CLEANUP_MS + delay);
        this.timers.add(timer);
      });
    });
  }

  private variantClass(el: HTMLElement): string {
    for (const c of Array.from(el.classList)) {
      if (c.startsWith('vl-reveal--') && c !== 'vl-reveal--in') return c.slice('vl-reveal--'.length);
    }
    return 'up';
  }
}
