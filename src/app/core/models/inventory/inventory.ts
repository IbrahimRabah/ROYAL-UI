import { StockMovement } from '../../enums/stock-movement';

// GET /admin/inventory/{variantId}, and the response shape returned by receive/adjust too.
export interface StockPositionResponse {
  variantId: number;
  sku: string;
  productName: string;
  variantSummary: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  minStockLevel: number;
  lowStock: boolean;
  outOfStock: boolean;
  updatedAt: string;
}

// GET /admin/inventory — full paginated list; same item shape as GET
// /admin/inventory/low-stock (StockPositionResponse), just wrapped in PageResponse.
export type InventoryAdminResponse = StockPositionResponse;

export interface InventoryListParams {
  q?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  categoryId?: number;
  sort?: 'available_asc' | 'available_desc';
  page?: number;
  size?: number;
}

// GET /admin/inventory/movements
export interface InventoryMovementsParams {
  variantId?: number;
  movementType?: StockMovement;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

// POST /admin/inventory/{variantId}/receive
export interface ReceiveStockRequest {
  quantity: number;
  reference?: string;
  note?: string;
}

// POST /admin/inventory/{variantId}/adjust — movementType must be one of
// MANUAL_MOVEMENT_TYPES (core/enums/stock-movement.ts), enforced by the caller.
export interface AdjustStockRequest {
  quantityDelta: number;
  reason: string;
  movementType?: StockMovement;
}
