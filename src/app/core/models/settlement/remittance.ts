import { Money } from '../common/money';
import { RemittanceStatus } from '../../enums/remittance-status';

export interface OutstandingRemittanceOrder {
  orderId: number;
  orderNumber: string;
  customerName: string;
  governorate: string;
  amount: Money;
  deliveredAt: string;
  daysWaiting: number;
}

export interface OutstandingRemittanceResponse {
  orderCount: number;
  totalAmount: Money;
  orders: OutstandingRemittanceOrder[];
}

export interface CreateRemittanceRequest {
  courierName: string;
  courierReference?: string;
  settlementDate: string;
  orderIds: number[];
  receivedAmount: Money;
  note?: string;
}

export interface RemittanceOrderLine {
  orderId: number;
  orderNumber: string;
  amount: Money;
}

export interface RemittanceResponse {
  id: number;
  reference: string;
  courierName: string;
  courierReference: string | null;
  settlementDate: string;
  status: RemittanceStatus;
  expectedAmount: Money;
  receivedAmount: Money;
  difference: Money;
  orderCount: number;
  note: string | null;
  orders: RemittanceOrderLine[];
  createdAt: string;
}
