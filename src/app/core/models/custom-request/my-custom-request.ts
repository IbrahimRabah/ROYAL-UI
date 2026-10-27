import { Money } from '../common/money';
import { CustomRequestStatus, CustomRequestType } from './custom-request';

/** The customer's own view (/me/custom-requests). Empty fields are ABSENT, not null. */
export interface MyCustomRequestProduct {
  slug: string;
  name: string;
}

export interface MyCustomRequestSummary {
  requestNumber: string;
  type: CustomRequestType;
  status: CustomRequestStatus;
  submittedAt: string;
  product?: MyCustomRequestProduct;
  quotedAmount?: Money;
  quotedAt?: string;
  /** Decided by the server — never derive these from status. */
  canAccept: boolean;
  canReject: boolean;
}

export interface MyCustomRequestDetail extends MyCustomRequestSummary {
  /** The customer's own description. */
  description?: string;
  quantity?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
}

export interface MyCustomRequestSummaryCount {
  awaitingResponse: number;
}

/** The exact amount the customer was shown; the server answers 409 QUOTE_CHANGED if it moved. */
export interface AcceptQuoteRequest {
  quotedAmount: Money;
}
