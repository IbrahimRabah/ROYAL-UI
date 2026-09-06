import { FulfillmentStatus } from '../../enums/fulfillment-status';

export interface CancelOrderRequest {
  reason?: string;
}

export interface UpdateFulfillmentRequest {
  status: FulfillmentStatus;
  note?: string;
}
