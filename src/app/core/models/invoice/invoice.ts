import { Money } from '../common/money';
import { InvoiceStatus } from '../../enums/invoice-status';

export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  orderId: number;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  grandTotal: Money;
  taxTotal: Money;
  netTotal: Money;
  currency: string;
  pdfUrl: string;
  issuedAt: string;
  cancelReason: string | null;
}

export interface CancelInvoiceRequest {
  reason: string;
}

export interface UninvoicedReport {
  count: number;
  orderIds: number[];
}
