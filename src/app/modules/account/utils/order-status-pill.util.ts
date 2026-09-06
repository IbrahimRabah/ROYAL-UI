import { FulfillmentStatus } from '../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../core/enums/payment-status';

export type PillTone = 'warn' | 'info' | 'ok' | 'stop';
const FULFILLMENT_TONES: Record<FulfillmentStatus, PillTone> = {
  [FulfillmentStatus.PENDING]: 'warn',
  [FulfillmentStatus.CONFIRMED]: 'warn',
  [FulfillmentStatus.PROCESSING]: 'info',
  [FulfillmentStatus.SHIPPED]: 'info',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'info',
  [FulfillmentStatus.DELIVERED]: 'ok',
  [FulfillmentStatus.DELIVERY_FAILED]: 'stop',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'stop',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'stop',
  [FulfillmentStatus.CANCELLED]: 'stop',
  [FulfillmentStatus.RETURNED]: 'stop',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'stop',
};

const PAYMENT_TONES: Record<PaymentStatus, PillTone> = {
  [PaymentStatus.PENDING]: 'warn',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'warn',
  [PaymentStatus.AUTHORIZED]: 'info',
  [PaymentStatus.REFUNDED]: 'info',
  [PaymentStatus.PAID]: 'ok',
  [PaymentStatus.FAILED]: 'stop',
  [PaymentStatus.EXPIRED]: 'stop',
};

export function fulfillmentPillTone(status: FulfillmentStatus): PillTone {
  return FULFILLMENT_TONES[status];
}

export function paymentPillTone(status: PaymentStatus): PillTone {
  return PAYMENT_TONES[status];
}
