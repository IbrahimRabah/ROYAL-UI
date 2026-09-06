import { FulfillmentStatus } from '../../enums/fulfillment-status';
import { PaymentStatus } from '../../enums/payment-status';

export interface OrderExportFilter {
  dateFrom?: string;
  dateTo?: string;
  fulfillmentStatus?: FulfillmentStatus;
  paymentStatus?: PaymentStatus;
  governorateId?: number;
  excludeCancelled?: boolean;
}
