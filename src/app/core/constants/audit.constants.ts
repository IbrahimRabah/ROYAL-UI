// Not in the API contract — GET /admin/audit's `action`/`entityType` are plain strings
// with no enum. The contract's prose says the log covers exactly four event categories
// (price changes, stock movements, receipts, payments); these are this app's best-guess
// concrete values for those categories, used ONLY to populate the two select filters (an
// arbitrary typed value has caused 500s on this endpoint before, so free text is never an
// option here). Confirm the real values against the backend and adjust this list — it is
// not asserted as ground truth.
export const AUDIT_ACTIONS = ['PRICE_CHANGED', 'STOCK_ADJUSTED', 'STOCK_RECEIVED', 'PAYMENT_RECORDED'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS_AR: Record<AuditAction, string> = {
  PRICE_CHANGED: 'تغيير سعر',
  STOCK_ADJUSTED: 'تعديل مخزون',
  STOCK_RECEIVED: 'استلام مخزون',
  PAYMENT_RECORDED: 'تسجيل دفعة',
};

export const AUDIT_ACTION_LABELS_EN: Record<AuditAction, string> = {
  PRICE_CHANGED: 'Price changed',
  STOCK_ADJUSTED: 'Stock adjusted',
  STOCK_RECEIVED: 'Stock received',
  PAYMENT_RECORDED: 'Payment recorded',
};

export const AUDIT_ACTION_TONE: Record<AuditAction, string> = {
  PRICE_CHANGED: '#2563EB',
  STOCK_ADJUSTED: '#9a6a2e',
  STOCK_RECEIVED: '#3f6b4a',
  PAYMENT_RECORDED: '#7C3AED',
};

// Same caveat as AUDIT_ACTIONS — inferred from which screens perform the four logged
// action categories, not from the contract.
export const AUDIT_ENTITY_TYPES = ['VARIANT', 'REMITTANCE'] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ENTITY_TYPE_LABELS_AR: Record<AuditEntityType, string> = {
  VARIANT: 'متغير منتج',
  REMITTANCE: 'توريد',
};

export const AUDIT_ENTITY_TYPE_LABELS_EN: Record<AuditEntityType, string> = {
  VARIANT: 'Product variant',
  REMITTANCE: 'Remittance',
};
