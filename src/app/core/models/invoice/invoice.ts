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
  /** Relative path to the authenticated PDF endpoint; absent (not null) when no PDF is stored. */
  pdfUrl?: string;
  issuedAt: string;
  cancelReason: string | null;
  /** Number of the cancelled invoice this one replaces; absent when it replaces nothing. */
  replacesInvoiceNumber?: string;
}

export interface CancelInvoiceRequest {
  reason: string;
}

export interface UninvoicedReport {
  count: number;
  orderIds: number[];
}
