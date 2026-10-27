export type Money = string | number;

export const money = (value: Money | null | undefined): number =>
  value == null ? 0 : typeof value === 'number' ? value : parseFloat(value);

/** True when the value is a non-zero amount; used to hide zero tax lines. */
export const hasAmount = (value: Money | null | undefined): boolean => {
  const n = money(value);
  return Number.isFinite(n) && n !== 0;
};

export const formatMoney = (
  value: Money | null | undefined,
  locale = 'ar-EG',
  currency = 'EGP',
): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(money(value));
