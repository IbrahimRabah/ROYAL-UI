import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { CartWarningEntry } from '../../../../core/models';
import { CartApiService } from '../../../../core/services/api/cart-api.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CartStoreService } from '../../../../core/state/cart-store.service';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPageComponent {
  private readonly cartApi = inject(CartApiService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly cartStore = inject(CartStoreService);

  readonly loading = signal(true);
  readonly clearing = signal(false);
  readonly pendingItemIds = signal<ReadonlySet<number>>(new Set());
  readonly skeletonRows = [0, 1, 2];

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }

    this.cartApi.getCart().subscribe({
      next: (cart) => {
        this.cartStore.set(cart);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  warningsForItem(itemId: number): CartWarningEntry[] {
    return (this.cartStore.cart()?.warnings ?? []).filter((warning) => warning.itemId === itemId);
  }

  isPending(itemId: number): boolean {
    return this.pendingItemIds().has(itemId);
  }

  onQuantityChange(itemId: number, quantity: number): void {
    this.setPending(itemId, true);
    this.cartApi.updateItem(itemId, { quantity }).subscribe({
      next: (cart) => {
        this.cartStore.set(cart);
        this.setPending(itemId, false);
      },
      error: (err: unknown) => {
        this.setPending(itemId, false);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.cartApi.getCart().subscribe((cart) => this.cartStore.set(cart));
        }
      },
    });
  }

  onRemoveItem(itemId: number): void {
    this.setPending(itemId, true);
    this.cartApi.removeItem(itemId).subscribe({
      next: (cart) => {
        this.cartStore.set(cart);
        this.setPending(itemId, false);
        this.toast.success(this.translate.instant('toast.cart.itemRemoved'));
      },
      error: () => this.setPending(itemId, false),
    });
  }

  onClearCart(): void {
    this.confirmDialogService
      .confirm({
        title: this.translate.instant('cart.confirmClearTitle'),
        message: this.translate.instant('cart.confirmClearMessage'),
        confirmLabel: this.translate.instant('cart.clearCart'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.clearing.set(true);
        this.cartApi.clear().subscribe({
          next: (cart) => {
            this.cartStore.set(cart);
            this.clearing.set(false);
            this.toast.success(this.translate.instant('toast.cart.cleared'));
          },
          error: () => this.clearing.set(false),
        });
      });
  }

  goToCheckout(): void {
    if (!this.cartStore.checkoutReady()) {
      return;
    }
    this.router.navigate(['/checkout']);
  }

  private setPending(itemId: number, pending: boolean): void {
    this.pendingItemIds.update((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }
}
