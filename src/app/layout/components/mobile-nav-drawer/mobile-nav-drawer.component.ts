import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { CategoryNode, PortfolioCategory } from '../../../core/models';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SectionId = 'products' | 'work';

/**
 * Hand-rolled rather than PrimeNG's p-drawer: p-drawer's content renders blank and Angular
 * throws an Ivy view-tree assertion the first time it opens in this app's SSR+hydration
 * setup — a known, still-open upstream bug (primefaces/primeng#16358, #16800), not
 * something fixable from consumer code. Verified in the browser both before and after
 * trying ngSkipHydration / appendTo="body"; neither resolved it.
 *
 * Structure: search, Home, two accordion sections (Products, Architectural Work), About, Contact.
 * Two levels at most: a section, then its links. Closing: the backdrop covers the whole viewport
 * including the header's hamburger, so the trigger cannot be clicked while the panel is open and a
 * click can never close-then-reopen it (same approach as the mini cart; no document click handler).
 */
@Component({
  selector: 'app-mobile-nav-drawer',
  templateUrl: './mobile-nav-drawer.component.html',
  styleUrl: './mobile-nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavDrawerComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly scrollLock = inject(ScrollLockService);

  @Input() categories: CategoryNode[] = [];
  @Input() workCategories: PortfolioCategory[] = [];
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  @ViewChild('panel') private readonly panelRef?: ElementRef<HTMLElement>;
  @ViewChild('closeBtn') private readonly closeBtn?: ElementRef<HTMLButtonElement>;

  readonly openSection = signal<SectionId | null>(null);

  private locked = false;
  private lastFocused: HTMLElement | null = null;
  private readonly navSub: Subscription = this.router.events
    .pipe(filter((event) => event instanceof NavigationStart))
    .subscribe(() => {
      if (this.visible) this.close();
    });

  ngOnChanges(changes: SimpleChanges): void {
    if (!('visible' in changes) || !isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.visible) {
      this.lastFocused = this.document.activeElement as HTMLElement | null;
      if (!this.locked) {
        this.scrollLock.lock();
        this.locked = true;
      }
      queueMicrotask(() => this.closeBtn?.nativeElement.focus());
    } else {
      this.openSection.set(null);
      if (this.locked) {
        this.scrollLock.unlock();
        this.locked = false;
      }
      this.lastFocused?.focus();
      this.lastFocused = null;
    }
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
    if (isPlatformBrowser(this.platformId) && this.locked) {
      this.scrollLock.unlock();
      this.locked = false;
    }
  }

  isSectionOpen(id: SectionId): boolean {
    return this.openSection() === id;
  }

  toggleSection(id: SectionId): void {
    this.openSection.set(this.isSectionOpen(id) ? null : id);
  }

  search(event: Event, query: string): void {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    this.close();
    void this.router.navigate(['/products'], { queryParams: { q } });
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  /** Escape and the Tab trap live on the document: focus can sit on <body> after a collapsed row loses it. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.visible) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = this.panelRef?.nativeElement;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.closest('[inert]'),
    );
    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    const inside = !!active && panel.contains(active);
    if (event.shiftKey) {
      if (!inside || active === first || active === panel) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
