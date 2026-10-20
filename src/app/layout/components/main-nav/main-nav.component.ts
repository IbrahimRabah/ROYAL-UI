import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { CategoryNode } from '../../../core/models';

const HOVER_CLOSE_DELAY_MS = 150;

/**
 * Fixed top-level items (Home, Shop, Portfolio, About, Contact) — the catalogue lives inside the
 * Shop mega-menu, so the bar never grows with the number of categories. The panel is hand-built
 * and anchored to the (positioned) site header, not to this nav.
 */
@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainNavComponent implements OnDestroy {
  @Input() categories: CategoryNode[] = [];

  @ViewChild('shopBtn') private readonly shopBtn?: ElementRef<HTMLButtonElement>;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly navSub: Subscription;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Opened by hover only (not pinned by a click). */
  private hoverOpened = false;

  readonly open = signal(false);

  constructor() {
    this.navSub = inject(Router).events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.closeAll());
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.navSub.unsubscribe();
  }

  hoverOpen(): void {
    this.clearTimer();
    if (!this.open()) {
      this.hoverOpened = true;
      this.open.set(true);
    }
  }

  hoverClose(): void {
    if (!this.hoverOpened) return;
    this.clearTimer();
    this.closeTimer = setTimeout(() => this.closeAll(), HOVER_CLOSE_DELAY_MS);
  }

  toggle(): void {
    this.clearTimer();
    if (this.open() && this.hoverOpened) {
      // A click on a hover-opened panel pins it open instead of closing it.
      this.hoverOpened = false;
      return;
    }
    this.hoverOpened = false;
    this.open.set(!this.open());
  }

  closeAll(): void {
    this.clearTimer();
    this.hoverOpened = false;
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.closeAll();
      this.shopBtn?.nativeElement.focus();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.open()) {
      this.closeAll();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
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
