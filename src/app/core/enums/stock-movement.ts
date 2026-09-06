export enum StockMovement {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DAMAGE_WRITEOFF = 'DAMAGE_WRITEOFF',
  PURCHASE_RECEIVED = 'PURCHASE_RECEIVED',
  SALE = 'SALE',
  RETURN_SELLABLE = 'RETURN_SELLABLE',
  RETURN_DAMAGED = 'RETURN_DAMAGED',
  CANCELLATION_RESTOCK = 'CANCELLATION_RESTOCK',
}

export const MANUAL_MOVEMENT_TYPES: readonly StockMovement[] = [
  StockMovement.MANUAL_ADJUSTMENT,
  StockMovement.DAMAGE_WRITEOFF,
  StockMovement.PURCHASE_RECEIVED,
];

export function movementTypeLabelKey(type: StockMovement): string {
  return `admin.inventory.movementType.${type}`;
}
