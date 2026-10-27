import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CartStoreService } from '../../../core/state/cart-store.service';
import { MiniCartStateService } from '../../../core/state/mini-cart-state.service';

/** Pages where the full cart UI is already the page itself; the icon just navigates there. */
const CART_PAGES = ['/cart', '/checkout'];

@Component({
  selector: 'app-cart-icon',
  templateUrl: './cart-icon.component.html',
  styleUrl: './cart-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartIconComponent {
  private readonly cartStore = inject(CartStoreService);
  private readonly miniCart = inject(MiniCartStateService);
  private readonly router = inject(Router);

  readonly itemCount = this.cartStore.itemCount;

  /**
   * The anchor keeps a real href so middle/ctrl/cmd-click and no-JS still reach /cart. A plain left click is
   * handled here (not by routerLink, which would navigate regardless): it opens the panel, except on the cart
   * and checkout pages, where it just goes to the full cart.
   */
  onClick(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const path = this.router.url.split('?')[0];
    if (CART_PAGES.some((page) => path === page || path.startsWith(page + '/'))) {
      void this.router.navigateByUrl('/cart');
      return;
    }
    this.miniCart.openFromHeader();
  }
}
