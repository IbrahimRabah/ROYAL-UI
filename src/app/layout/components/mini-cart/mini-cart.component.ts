import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, finalize } from 'rxjs';

import { CartItemResponse } from '../../../core/models';
import { CartActionsService } from '../../../core/services/cart-actions.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';
import { CartStoreService } from '../../../core/state/cart-store.service';
import { MiniCartStateService } from '../../../core/state/mini-cart-state.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The slide-in cart panel, hand-built (p-drawer is broken under this project's SSR hydration).
 *
 *  - The panel only exists in the DOM while open (*ngIf), so server render and hydration see nothing
 *    to mismatch; everything that touches document/window is guarded for the browser.
 *  - There is NO document click handler. The only "outside click" is the backdrop element, and it covers
 *    the header trigger while open, so a click can never close the panel and reopen it in the same gesture.
 *  - Keyboard: Escape and the Tab trap are handled at document level on purpose — focus can fall to <body>
 *    when the focused row is removed, and both must keep working then.
 */
@Component({
  selector: 'app-mini-cart',
  templateUrl: './mini-cart.component.html',
  styleUrl: './mini-cart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniCartComponent implements OnDestroy {
  private readonly state = inject(MiniCartStateService);
  private readonly cartStore = inject(CartStoreService);
  private readonly actions = inject(CartActionsService);
  private readonly scrollLock = inject(ScrollLockService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('panel') private readonly panelRef?: ElementRef<HTMLElement>;

  readonly open = this.state.open;
  readonly cart = this.cartStore.cart;
  readonly checkoutReady = this.cartStore.checkoutReady;

  readonly loading = signal(false);
  readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  readonly items = computed<CartItemResponse[]>(() => this.cart()?.items ?? []);
  /** The line that was just added, shown as the thing that was added rather than one more row. */
  readonly addedItem = computed<CartItemResponse | null>(() => {
    const variantId = this.state.justAddedVariantId();
    return variantId == null ? null : (this.items().find((item) => item.variantId === variantId) ?? null);
  });
  readonly otherItems = computed<CartItemResponse[]>(() => {
    const added = this.addedItem();
    return added ? this.items().filter((item) => item.itemId !== added.itemId) : this.items();
  });
  readonly needsAttention = computed(() => this.cartStore.blockingWarnings().length > 0);

  private locked = false;
  private lastFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const isOpen = this.state.open();
      untracked(() => (isOpen ? this.handleOpened() : this.handleClosed()));
    }, { allowSignalWrites: true });

    // Any navigation (a link inside the panel, browser back) closes it.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.close());
  }

  ngOnDestroy(): void {
    if (this.locked) {
      this.scrollLock.unlock();
      this.locked = false;
    }
  }

  close(): void {
    this.state.close();
  }

  isPending(itemId: number): boolean {
    return this.pendingIds().has(itemId);
  }

  maxQuantity(item: CartItemResponse): number {
    return Math.max(0, Math.min(item.qtyAvailable, 99));
  }

  changeQuantity(item: CartItemResponse, delta: number): void {
    const next = Math.min(Math.max(item.quantity + delta, 1), this.maxQuantity(item));
    if (next === item.quantity || this.isPending(item.itemId)) return;
    this.setPending(item.itemId, true);
    this.actions
      .updateQuantity(item.itemId, next)
      .pipe(finalize(() => this.setPending(item.itemId, false)))
      .subscribe({ error: () => {} });
  }

  remove(item: CartItemResponse): void {
    if (this.isPending(item.itemId)) return;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('cart.confirmRemoveTitle'),
        message: this.translate.instant('cart.confirmRemoveMessage', { name: item.name }),
        confirmLabel: this.translate.instant('cart.removeItem'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.setPending(item.itemId, true);
        this.actions
          .remove(item.itemId)
          .pipe(finalize(() => this.setPending(item.itemId, false)))
          .subscribe({
            next: () => this.keepFocusInside(),
            error: () => {},
          });
      });
  }

  goToCheckout(): void {
    if (!this.checkoutReady()) return;
    this.close();
    void this.router.navigateByUrl('/checkout');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  trackByItem = (_: number, item: CartItemResponse): number => item.itemId;

  // ---- open / close mechanics ---------------------------------------------------------------

  private handleOpened(): void {
    if (!this.isBrowser || this.locked) return;
    this.lastFocused = this.document.activeElement as HTMLElement | null;
    this.scrollLock.lock();
    this.locked = true;

    // After an add the store already holds the fresh cart; from the header, reload it.
    if (this.state.justAddedVariantId() == null) {
      this.loading.set(true);
      this.actions
        .refresh()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({ error: () => {} });
    }
    setTimeout(() => this.panelRef?.nativeElement.focus());
  }

  private handleClosed(): void {
    if (!this.isBrowser || !this.locked) return;
    this.scrollLock.unlock();
    this.locked = false;

    // Back to where the customer was. If that element is gone (e.g. the sticky bar hid), use the cart icon.
    const target =
      this.lastFocused && this.lastFocused.isConnected
        ? this.lastFocused
        : this.document.querySelector<HTMLElement>('.cart-icon');
    this.lastFocused = null;
    target?.focus();
  }

  private trapTab(event: KeyboardEvent): void {
    const panel = this.panelRef?.nativeElement;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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

  /** Removing a row destroys the button that had focus; pull focus back into the panel. */
  private keepFocusInside(): void {
    setTimeout(() => {
      const panel = this.panelRef?.nativeElement;
      if (panel && !panel.contains(this.document.activeElement)) {
        panel.focus();
      }
    });
  }

  private setPending(itemId: number, pending: boolean): void {
    this.pendingIds.update((current) => {
      const next = new Set(current);
      if (pending) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }
}
