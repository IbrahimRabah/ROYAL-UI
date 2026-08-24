import { RemittanceStatus } from '../enums/remittance-status';
import { StatusTone } from './order-status.constants';

export const REMITTANCE_STATUS_LABELS_AR: Record<RemittanceStatus, string> = {
  [RemittanceStatus.SETTLED]: 'مسواة',
  [RemittanceStatus.SHORT]: 'عجز',
  [RemittanceStatus.CANCELLED]: 'ملغاة',
};

export const REMITTANCE_STATUS_LABELS_EN: Record<RemittanceStatus, string> = {
  [RemittanceStatus.SETTLED]: 'Settled',
  [RemittanceStatus.SHORT]: 'Short',
  [RemittanceStatus.CANCELLED]: 'Cancelled',
};

export const REMITTANCE_STATUS_TONE: Record<RemittanceStatus, StatusTone> = {
  [RemittanceStatus.SETTLED]: 'ok',
  [RemittanceStatus.SHORT]: 'warn',
  [RemittanceStatus.CANCELLED]: 'stop',
};
