export enum StockMovement {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DAMAGE_WRITEOFF = 'DAMAGE_WRITEOFF',
  PURCHASE_RECEIVED = 'PURCHASE_RECEIVED',
  SALE = 'SALE',
  RETURN_SELLABLE = 'RETURN_SELLABLE',
  RETURN_DAMAGED = 'RETURN_DAMAGED',
  CANCELLATION_RESTOCK = 'CANCELLATION_RESTOCK',
}

// The only values accepted as `movementType` on POST /admin/inventory/{variantId}/adjust.
// The rest are written exclusively by the order/returns flow — passing them is rejected
// with 400 MOVEMENT_TYPE_NOT_MANUAL.
export const MANUAL_MOVEMENT_TYPES: readonly StockMovement[] = [
  StockMovement.MANUAL_ADJUSTMENT,
  StockMovement.DAMAGE_WRITEOFF,
  StockMovement.PURCHASE_RECEIVED,
];

// Single source of truth for translating a StockMovement everywhere it's shown (movements
// log table, adjust dialog's type select, the log's type filter) — derived from the enum
// value rather than a hardcoded per-member map, so a movement type added later on the
// backend renders its (missing) key instead of failing to compile or silently rendering
// nothing here.
export function movementTypeLabelKey(type: StockMovement): string {
  return `admin.inventory.movementType.${type}`;
}
