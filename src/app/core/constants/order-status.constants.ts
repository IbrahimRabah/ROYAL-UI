import { FulfillmentStatus } from '../enums/fulfillment-status';
import { PaymentStatus } from '../enums/payment-status';

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  [FulfillmentStatus.PENDING]: [FulfillmentStatus.CONFIRMED, FulfillmentStatus.CANCELLED],
  [FulfillmentStatus.CONFIRMED]: [FulfillmentStatus.PROCESSING, FulfillmentStatus.CANCELLED],
  [FulfillmentStatus.PROCESSING]: [FulfillmentStatus.SHIPPED, FulfillmentStatus.CANCELLED],
  [FulfillmentStatus.SHIPPED]: [
    FulfillmentStatus.OUT_FOR_DELIVERY,
    FulfillmentStatus.DELIVERY_FAILED,
    FulfillmentStatus.RETURNED_TO_SELLER,
  ],
  [FulfillmentStatus.OUT_FOR_DELIVERY]: [
    FulfillmentStatus.DELIVERED,
    FulfillmentStatus.DELIVERY_FAILED,
    FulfillmentStatus.REFUSED_ON_DELIVERY,
  ],
  [FulfillmentStatus.DELIVERY_FAILED]: [
    FulfillmentStatus.OUT_FOR_DELIVERY,
    FulfillmentStatus.REFUSED_ON_DELIVERY,
    FulfillmentStatus.RETURNED_TO_SELLER,
  ],
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: [FulfillmentStatus.RETURNED_TO_SELLER],
  [FulfillmentStatus.DELIVERED]: [FulfillmentStatus.RETURNED, FulfillmentStatus.PARTIALLY_RETURNED],
  [FulfillmentStatus.PARTIALLY_RETURNED]: [FulfillmentStatus.RETURNED],
  [FulfillmentStatus.CANCELLED]: [],
  [FulfillmentStatus.RETURNED]: [],
  [FulfillmentStatus.RETURNED_TO_SELLER]: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.AUTHORIZED, PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.EXPIRED],
  [PaymentStatus.AUTHORIZED]: [PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.EXPIRED],
  [PaymentStatus.PAID]: [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
  [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
  [PaymentStatus.EXPIRED]: [PaymentStatus.PENDING],
  [PaymentStatus.REFUNDED]: [],
};

export const NOTE_REQUIRED_STATUSES: readonly FulfillmentStatus[] = [
  FulfillmentStatus.DELIVERY_FAILED,
  FulfillmentStatus.REFUSED_ON_DELIVERY,
  FulfillmentStatus.RETURNED_TO_SELLER,
  FulfillmentStatus.CANCELLED,
];

export const FULFILLMENT_STATUS_LABELS_AR: Record<FulfillmentStatus, string> = {
  [FulfillmentStatus.PENDING]: 'بانتظار التأكيد',
  [FulfillmentStatus.CONFIRMED]: 'مؤكد',
  [FulfillmentStatus.PROCESSING]: 'جاري التجهيز',
  [FulfillmentStatus.SHIPPED]: 'تم الشحن',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'خارج للتوصيل',
  [FulfillmentStatus.DELIVERED]: 'تم التوصيل',
  [FulfillmentStatus.DELIVERY_FAILED]: 'فشل التوصيل',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'تم الرفض عند الاستلام',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'تمت الإعادة للبائع',
  [FulfillmentStatus.CANCELLED]: 'ملغي',
  [FulfillmentStatus.RETURNED]: 'مرتجع',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'مرتجع جزئياً',
};

export const FULFILLMENT_STATUS_LABELS_EN: Record<FulfillmentStatus, string> = {
  [FulfillmentStatus.PENDING]: 'Pending confirmation',
  [FulfillmentStatus.CONFIRMED]: 'Confirmed',
  [FulfillmentStatus.PROCESSING]: 'Processing',
  [FulfillmentStatus.SHIPPED]: 'Shipped',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
  [FulfillmentStatus.DELIVERED]: 'Delivered',
  [FulfillmentStatus.DELIVERY_FAILED]: 'Delivery failed',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'Refused on delivery',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'Returned to seller',
  [FulfillmentStatus.CANCELLED]: 'Cancelled',
  [FulfillmentStatus.RETURNED]: 'Returned',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'Partially returned',
};

export const PAYMENT_STATUS_LABELS_AR: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'معلّق',
  [PaymentStatus.AUTHORIZED]: 'معتمد',
  [PaymentStatus.PAID]: 'مدفوع',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'مسترد جزئياً',
  [PaymentStatus.REFUNDED]: 'مسترد',
  [PaymentStatus.FAILED]: 'فشل',
  [PaymentStatus.EXPIRED]: 'منتهي الصلاحية',
};

export const PAYMENT_STATUS_LABELS_EN: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.AUTHORIZED]: 'Authorized',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'Partially refunded',
  [PaymentStatus.REFUNDED]: 'Refunded',
  [PaymentStatus.FAILED]: 'Failed',
  [PaymentStatus.EXPIRED]: 'Expired',
};


export type StatusTone = 'warn' | 'info' | 'violet' | 'blue' | 'ok' | 'stop' | 'muted';

export const FULFILLMENT_STATUS_TONE: Record<FulfillmentStatus, StatusTone> = {
  [FulfillmentStatus.PENDING]: 'warn',
  [FulfillmentStatus.CONFIRMED]: 'info',
  [FulfillmentStatus.PROCESSING]: 'violet',
  [FulfillmentStatus.SHIPPED]: 'blue',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'blue',
  [FulfillmentStatus.DELIVERED]: 'ok',
  [FulfillmentStatus.DELIVERY_FAILED]: 'stop',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'stop',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'stop',
  [FulfillmentStatus.CANCELLED]: 'stop',
  [FulfillmentStatus.RETURNED]: 'stop',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'stop',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  [PaymentStatus.PENDING]: 'warn',
  [PaymentStatus.AUTHORIZED]: 'info',
  [PaymentStatus.PAID]: 'ok',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'warn',
  [PaymentStatus.REFUNDED]: 'info',
  [PaymentStatus.FAILED]: 'stop',
  [PaymentStatus.EXPIRED]: 'stop',
};

export const CONSEQUENCE_STATUSES: readonly FulfillmentStatus[] = [
  FulfillmentStatus.SHIPPED,
  FulfillmentStatus.DELIVERED,
];
