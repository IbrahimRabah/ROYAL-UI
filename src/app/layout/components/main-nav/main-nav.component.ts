import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { CategoryNode, PortfolioCategory } from '../../../core/models';

const HOVER_CLOSE_DELAY_MS = 150;
/** The panels fade in via a visibility transition; focus has to wait until they are actually visible. */
const FOCUS_AFTER_OPEN_MS = 60;

/** How many top categories sit directly in the bar; the rest go under "More". */
const MAX_VISIBLE_CATEGORIES = 4;


/**
 * Desktop top-level navigation: Home | Products ▾ | Architectural Work ▾.
 *
 * Closing pattern (the known "outside click is reopened by its own trigger" bug): the TRIGGERS LIVE INSIDE
 * THIS COMPONENT, which owns the open state — same approach as the header search panel. The only document
 * click handler asks "was the click inside this host?", and both triggers and both panels are inside it, so
 * a trigger click is never "outside" and can never close-then-reopen. No stopPropagation anywhere.
 *
 * Both panels are hand-built; the products mega-menu is anchored to the (positioned) site header, the
 * architectural menu to its own trigger wrapper.
 */
@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainNavComponent implements OnDestroy {
  @Input() categories: CategoryNode[] = [];
  /** Public portfolio categories. Empty = the menu collapses to a single plain link. */
  @Input() workCategories: PortfolioCategory[] = [];

  get visibleCategories(): CategoryNode[] {
    return this.categories.slice(0, MAX_VISIBLE_CATEGORIES);
  }

  get overflowCategories(): CategoryNode[] {
    return this.categories.slice(MAX_VISIBLE_CATEGORIES);
  }

  catId(category: CategoryNode): string {
    return `cat-${category.id}`;
  }

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly navSub: Subscription;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Opened by hover only (not pinned by a click). */
  private hoverOpened = false;

  /** At most one menu is open at a time. */
  readonly openMenu = signal<string | null>(null);

  constructor() {
    this.navSub = inject(Router).events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.closeAll());
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.navSub.unsubscribe();
  }

  isOpen(id: string): boolean {
    return this.openMenu() === id;
  }

  hoverOpen(id: string): void {
    this.clearTimer();
    if (this.openMenu() !== id) {
      this.hoverOpened = true;
      this.openMenu.set(id);
    }
  }

  hoverClose(id: string): void {
    if (!this.hoverOpened || this.openMenu() !== id) return;
    this.clearTimer();
    this.closeTimer = setTimeout(() => this.closeAll(), HOVER_CLOSE_DELAY_MS);
  }

  toggle(id: string): void {
    this.clearTimer();
    if (this.isOpen(id) && this.hoverOpened) {
      // A click on a hover-opened panel pins it open instead of closing it.
      this.hoverOpened = false;
      return;
    }
    this.hoverOpened = false;
    this.openMenu.set(this.isOpen(id) ? null : id);
  }

  /** ArrowDown on a trigger opens its menu and moves into it, so the menu is fully usable without a mouse. */
  openWithKeyboard(event: Event, id: string): void {
    event.preventDefault();
    this.clearTimer();
    this.hoverOpened = false;
    this.openMenu.set(id);
    setTimeout(() => {
      this.elementRef.nativeElement.querySelector<HTMLElement>(`#main-nav-${id} a`)?.focus();
    }, FOCUS_AFTER_OPEN_MS);
  }

  closeAll(): void {
    this.clearTimer();
    this.hoverOpened = false;
    this.openMenu.set(null);
  }

  /** Tabbing out of the nav closes whatever is open, so no menu stays open once focus has left it. */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.openMenu() && next && !this.elementRef.nativeElement.contains(next)) {
      this.closeAll();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    const open = this.openMenu();
    if (!open) return;
    this.closeAll();
    this.elementRef.nativeElement.querySelector<HTMLElement>(`[data-menu="${open}"]`)?.focus();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.openMenu()) {
      this.closeAll();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.openMenu() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeAll();
    }
  }

  private clearTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
