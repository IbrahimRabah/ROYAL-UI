import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CategoryNode, PortfolioCategory } from '../../../core/models';
import { APP_CONFIG } from '../../../core/constants/app-config';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { CatalogApiService } from '../../../core/services/api/catalog-api.service';
import { PortfolioApiService } from '../../../core/services/api/portfolio-api.service';
import { LanguageStoreService } from '../../../core/state/language-store.service';

/** The header never hides this close to the top of the page. */
const HIDE_AFTER_PX = 240;
/** Ignore scroll jitter smaller than this (trackpads, iOS bounce). */
const SCROLL_DELTA_PX = 6;

@Component({
  selector: 'app-site-header',
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHeaderComponent implements AfterViewInit, OnDestroy {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly analytics = inject(AnalyticsService);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('siteHeader') private headerRef?: ElementRef<HTMLElement>;

  readonly contact = APP_CONFIG.contact;

  onCallClick(): void {
    this.analytics.track('call_click', { source: 'header' });
  }

  readonly categories = signal<CategoryNode[]>([]);
  /** Architectural Work menu entries; empty (also on failure) collapses the menu to one plain link. */
  readonly workCategories = signal<PortfolioCategory[]>([]);
  readonly mobileNavOpen = signal(false);

  private lastY = 0;
  private frame = 0;
  private readonly onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updateOnScroll();
    });
  };

  constructor() {
    effect(() => {
      this.languageStore.lang();
      this.catalogApi.getCategoryTree().subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => {},
      });
      // Category names follow Accept-Language, so this reloads with the language like the tree above.
      this.portfolioApi.categories().subscribe({
        next: (list) => this.workCategories.set(list),
        error: () => this.workCategories.set([]),
      });
    }, { allowSignalWrites: true });
  }

  /**
   * Scroll behaviour, all outside Angular and written straight to the DOM (no change detection per frame):
   * a shadow once the page has moved, a gold line along the bottom edge that grows with reading progress,
   * and the header sliding away while scrolling down, back as soon as the visitor scrolls up.
   */
  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.lastY = window.scrollY;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    });
    this.updateOnScroll();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.frame);
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  onMobileNavVisibleChange(visible: boolean): void {
    this.mobileNavOpen.set(visible);
  }

  private updateOnScroll(): void {
    const header = this.headerRef?.nativeElement;
    if (!header) return;

    const y = Math.max(0, window.scrollY);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.style.setProperty('--scroll-progress', String(max > 0 ? Math.min(1, y / max) : 0));
    header.classList.toggle('site-header--scrolled', y > 4);

    const delta = y - this.lastY;
    if (Math.abs(delta) < SCROLL_DELTA_PX) return;
    this.lastY = y;

    // Keep it in place while the visitor is using it (search field focused, a menu open under the pointer).
    // (A focused link does not count: it keeps focus after a click and would pin the header forever.)
    const active = document.activeElement;
    const typing = !!active && header.contains(active) && active.matches('input, textarea, select');
    const inUse = typing || header.matches(':hover') || this.mobileNavOpen();
    const hide = delta > 0 && y > HIDE_AFTER_PX && !inUse;
    header.classList.toggle('site-header--hidden', hide);
  }
}
