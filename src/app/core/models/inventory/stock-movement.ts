import { StockMovement } from '../../enums/stock-movement';

// GET /admin/inventory/movements — append-only ledger entry.
export interface StockMovementResponse {
  id: number;
  variantId: number;
  sku: string;
  movementType: StockMovement;
  quantityDelta: number;
  qtyAfter: number;
  // Not formally enumerated in the contract — known values so far: "ADJUSTMENT"
  // (manual receive/adjust) and "VARIANT_CREATE" (opening stock on variant creation).
  // Others (e.g. "ORDER") are implied by referenceId existing but not yet confirmed.
  // Treat any value the API sends as valid — map known ones to a translated label,
  // unknown ones render as-is (see movements-log-page's referenceTypeLabelKey()).
  referenceType: string;
  referenceId: number | null;
  // Confirmed nullable — free text typed by the operator (receive/adjust dialogs) or
  // system-generated context; null when nothing was typed and nothing needed inferring
  // (e.g. a plain receive with no note). Never invent display text for a null reason at
  // the point this value is captured — that's movements-log-page's job at render time,
  // deriving a label from referenceType instead.
  reason: string | null;
  // Inferred nullable — order-flow-driven movements (SALE, RETURN_*) have no human actor.
  actorId: number | null;
  // Captured at write time (a stored copy, not a join) — a renamed account doesn't
  // rewrite history. Null alongside a null actorId for system-generated movements.
  actorName: string | null;
  createdAt: string;
}
