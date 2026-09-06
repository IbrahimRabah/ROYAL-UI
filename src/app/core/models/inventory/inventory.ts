import { StockMovement } from '../../enums/stock-movement';

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

export interface InventoryMovementsParams {
  variantId?: number;
  movementType?: StockMovement;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface ReceiveStockRequest {
  quantity: number;
  reference?: string;
  note?: string;
}

export interface AdjustStockRequest {
  quantityDelta: number;
  reason: string;
  movementType?: StockMovement;
}
