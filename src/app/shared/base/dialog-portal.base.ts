import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, PLATFORM_ID, Renderer2, ViewChild, inject, signal } from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared mechanics for the admin's modal dialogs — portalled to <body> (escapes ancestor
 * stacking contexts that would otherwise trap the panel's z-index below the sticky
 * topbar/sidebar, same fix as AddressFormDialogComponent), a manual focus trap, body
 * scroll lock, and the scrolled-header/footer hairline state. Subclasses call onOpen()/
 * onClose() from their own ngOnChanges when their specific trigger @Input changes, since
 * what counts as "open" differs per dialog (a boolean flag vs. a nullable id).
 */
@Directive()
export abstract class DialogPortalBase implements AfterViewInit, OnDestroy {
  protected readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly renderer = inject(Renderer2);
  protected readonly platformId = inject(PLATFORM_ID);

  @ViewChild('panel') protected readonly panelRef?: ElementRef<HTMLElement>;

  readonly scrolled = signal(false);

  private lastFocused: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.appendChild(document.body, this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.unlockBodyScroll();
    const node = this.elementRef.nativeElement;
    if (node.parentNode) {
      this.renderer.removeChild(node.parentNode, node);
    }
  }

  onBodyScroll(event: Event): void {
    this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
  }

  onTab(domEvent: Event): void {
    const event = domEvent as KeyboardEvent;
    const panelEl = this.panelRef?.nativeElement;
    if (!panelEl) {
      return;
    }
    const focusable = Array.from(panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panelEl.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onOpen(): void {
    this.scrolled.set(false);
    if (isPlatformBrowser(this.platformId)) {
      this.lastFocused = document.activeElement as HTMLElement | null;
      this.lockBodyScroll();
      setTimeout(() => this.panelRef?.nativeElement.focus());
    }
  }

  protected onClose(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.unlockBodyScroll();
      this.lastFocused?.focus();
      this.lastFocused = null;
    }
  }

  private lockBodyScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }
    document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }
}
