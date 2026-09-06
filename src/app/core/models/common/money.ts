export type Money = string | number;

export const money = (value: Money | null | undefined): number =>
  value == null ? 0 : typeof value === 'number' ? value : parseFloat(value);

export const formatMoney = (
  value: Money | null | undefined,
  locale = 'ar-EG',
  currency = 'EGP',
): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(money(value));
