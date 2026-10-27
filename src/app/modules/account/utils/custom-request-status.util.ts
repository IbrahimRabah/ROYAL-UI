import { Language } from '../../../core/enums/language';
import { CustomRequestStatus } from '../../../core/models';
import { formatOrderDate } from './format-order-date.util';
import { PillTone } from './order-status-pill.util';

const TONES: Record<CustomRequestStatus, PillTone> = {
  NEW: 'info',
  CONTACTED: 'info',
  QUOTED: 'warn',
  ACCEPTED: 'ok',
  REJECTED: 'stop',
  CONVERTED: 'ok',
  COMPLETED: 'ok',
};

export function customRequestPillTone(status: CustomRequestStatus): PillTone {
  return TONES[status] ?? 'info';
}

/** Full precision (up to 2 decimals): the customer is shown the exact amount they are committing to. */
const AMOUNT_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatQuoteAmount(value: number | string): string {
  return AMOUNT_FORMATTER.format(typeof value === 'number' ? value : parseFloat(value));
}

/**
 * submittedAt arrives with 7 fractional digits and quotedAt with 3. Browsers only guarantee 3, so
 * trim any fraction to milliseconds before parsing; never show "Invalid Date".
 */
export function formatApiDate(iso: string | null | undefined, lang: Language): string {
  if (!iso) return '';
  const normalized = iso.replace(/(\.\d{3})\d+/, '$1');
  return Number.isNaN(new Date(normalized).getTime()) ? '' : formatOrderDate(normalized, lang);
}
