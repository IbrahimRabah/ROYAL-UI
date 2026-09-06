import { Money } from '../common/money';
import { FulfillmentStatus } from '../../enums/fulfillment-status';
import { PaymentStatus } from '../../enums/payment-status';
import { PaymentMethod } from '../../enums/payment-method';

export interface OrderItemResponse {
  id: number;
  variantId: number;
  productId: number;
  productSlug: string;
  name: string;
  sku: string;
  variantSummary: string;
  imageUrl: string;
  unitPrice: Money;
  quantity: number;
  lineDiscount: Money;
  allocatedCartDiscount: Money;
  lineTotal: Money;
  taxAmount: Money;
  quantityReturned: number;
  returnableQuantity: number;
}

export interface OrderTimelineEntry {
  kind: string;
  from: string | null;
  to: string;
  note: string | null;
  at: string;
}

export interface OrderAddressSnapshot {
  governorateName: string;
  cityName: string;
  area: string | null;
  streetAddress: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  formatted: string;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotal: Money;
  discountTotal: Money;
  shippingCost: Money;
  codFee: Money;
  grandTotal: Money;
  taxTotal: Money;
  netTotal: Money;
  contactName: string;
  contactPhone: string;
  contactAltPhone: string | null;
  contactEmail: string | null;
  shippingAddress: OrderAddressSnapshot;
  shippingZoneName: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  customerNote: string | null;
  items: OrderItemResponse[];
  totalQuantity: number;
  timeline: OrderTimelineEntry[];
  cancellable: boolean;
  placedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  invoiceNumber: string | null;
}

export interface OrderSummaryResponse {
  id: number;
  orderNumber: string;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  grandTotal: Money;
  itemCount: number;
  totalQuantity: number;
  contactName: string;
  contactPhone: string;
  governorateName: string;
  thumbnailUrl: string | null;
  placedAt: string;
}
