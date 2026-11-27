import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { UiStoreService } from '../../../core/state/ui-store.service';

/** Ring circumference for r = 22 (2 * PI * 22). */
const RING = 138.23;
/** Shown once the visitor is this far down the page. */
const SHOW_AFTER_PX = 600;

/**
 * Floating "back to top" button, opposite the WhatsApp button. Its gold ring draws itself as the page is
 * scrolled, so it doubles as a reading-progress indicator. Scroll work runs outside Angular and writes straight
 * to the SVG; change detection only runs when the button appears or disappears.
 */
@Component({
  selector: 'app-back-to-top',
  templateUrl: './back-to-top.component.html',
  styleUrl: './back-to-top.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToTopComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly ui = inject(UiStoreService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('ring') private ring?: ElementRef<SVGCircleElement>;

  readonly ringLength = RING;
  readonly visible = signal(false);
  readonly raised = this.ui.stickyBarVisible;
  readonly raisedMobile = this.ui.mobileBarVisible;

  private frame = 0;
  private readonly onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
    this.update();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    cancelAnimationFrame(this.frame);
  }

  scrollToTop(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  private update(): void {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, y / max) : 0;
    this.ring?.nativeElement.style.setProperty('stroke-dashoffset', String(RING * (1 - progress)));

    const show = y > SHOW_AFTER_PX;
    if (show !== this.visible()) {
      this.zone.run(() => this.visible.set(show));
    }
  }
}
