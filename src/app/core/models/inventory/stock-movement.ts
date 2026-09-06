import { StockMovement } from '../../enums/stock-movement';

export interface StockMovementResponse {
  id: number;
  variantId: number;
  sku: string;
  movementType: StockMovement;
  quantityDelta: number;
  qtyAfter: number;
  referenceType: string;
  referenceId: number | null;
  reason: string | null;
  actorId: number | null;
  actorName: string | null;
  createdAt: string;
}
