import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/**
 * Locks page scrolling while an overlay is open and puts the page back exactly where it was.
 *
 * Only overflow is changed (no position:fixed trick), so the browser keeps the scroll offset itself;
 * the saved offset is re-applied on unlock as a safety net. The scrollbar's width is added back as
 * padding so the page does not shift sideways when the scrollbar disappears. Browser-only.
 */
@Injectable({
  providedIn: 'root',
})
export class ScrollLockService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private locks = 0;
  private savedX = 0;
  private savedY = 0;
  private previous: { htmlOverflow: string; bodyOverflow: string; bodyPaddingInlineEnd: string } | null = null;

  lock(): void {
    if (!this.isBrowser) return;
    this.locks += 1;
    if (this.locks > 1) return;

    const win = this.document.defaultView;
    const html = this.document.documentElement;
    const body = this.document.body;
    if (!win) return;

    this.savedX = win.scrollX;
    this.savedY = win.scrollY;
    this.previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingInlineEnd: body.style.paddingInlineEnd,
    };

    const scrollbar = win.innerWidth - html.clientWidth;
    if (scrollbar > 0) {
      const current = parseFloat(win.getComputedStyle(body).paddingInlineEnd) || 0;
      body.style.paddingInlineEnd = `${current + scrollbar}px`;
    }
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }

  unlock(): void {
    if (!this.isBrowser || this.locks === 0) return;
    this.locks -= 1;
    if (this.locks > 0) return;

    const win = this.document.defaultView;
    const html = this.document.documentElement;
    const body = this.document.body;
    if (!this.previous || !win) return;

    html.style.overflow = this.previous.htmlOverflow;
    body.style.overflow = this.previous.bodyOverflow;
    body.style.paddingInlineEnd = this.previous.bodyPaddingInlineEnd;
    this.previous = null;

    // Same position as before. Instant, so a global smooth-scroll rule cannot animate a jump.
    if (win.scrollX !== this.savedX || win.scrollY !== this.savedY) {
      win.scrollTo({ left: this.savedX, top: this.savedY, behavior: 'instant' as ScrollBehavior });
    }
  }
}
