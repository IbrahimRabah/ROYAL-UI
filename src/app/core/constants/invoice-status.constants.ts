import { InvoiceStatus } from '../enums/invoice-status';
import { StatusTone } from './order-status.constants';

export const INVOICE_STATUS_LABELS_AR: Record<InvoiceStatus, string> = {
  [InvoiceStatus.ISSUED]: 'صادرة',
  [InvoiceStatus.CANCELLED]: 'ملغاة',
};

export const INVOICE_STATUS_LABELS_EN: Record<InvoiceStatus, string> = {
  [InvoiceStatus.ISSUED]: 'Issued',
  [InvoiceStatus.CANCELLED]: 'Cancelled',
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  [InvoiceStatus.ISSUED]: 'ok',
  [InvoiceStatus.CANCELLED]: 'stop',
};
