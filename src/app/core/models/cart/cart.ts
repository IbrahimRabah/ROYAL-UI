import { Money } from '../common/money';
import { CartWarning } from '../../enums/cart-warning';

export interface CartWarningEntry {
  code: CartWarning;
  itemId: number;
  sku: string;
  detail: string;
}

export interface CartItemResponse {
  itemId: number;
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantSummary: string;
  sku: string;
  imageUrl: string;
  unitPrice: Money;
  priceAtAdd: Money;
  priceChanged: boolean;
  quantity: number;
  qtyAvailable: number;
  inStock: boolean;
  lineTotal: Money;
  /** The regular price per piece when a discount lowers it. */
  listPrice?: Money | null;
  /** Whole-number percentage off the regular price. */
  salePercent?: number | null;
}

export interface CartResponse {
  cartId: number;
  items: CartItemResponse[];
  itemCount: number;
  totalQuantity: number;
  subtotal: Money;
  discountTotal: Money;
  estimatedTotal: Money;
  taxIncluded: Money;
  couponCode: string | null;
  warnings: CartWarningEntry[];
  checkoutReady: boolean;
}
