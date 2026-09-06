import { Money } from '../../common/money';
import { ProductStatus } from '../../../enums/product-status';

export interface VariantAdminResponse {
  id: number;
  productId: number;
  sku: string;
  summary: string;
  barcode: string | null;
  price: Money;
  compareAtPrice: Money | null;
  costPrice: Money | null;
  taxRate: number;
  weightGrams: number | null;
  status: ProductStatus;
  attributeValueIds: number[];
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  minStockLevel: number;
  lowStock: boolean;
}

export interface VariantPreviewSelection {
  attributeId: number;
  valueIds: number[];
}

export interface VariantPreviewRequest {
  selections: VariantPreviewSelection[];
}

export interface VariantCombinationPreview {
  suggestedSku: string;
  summary: string;
  attributeValueIds: number[];
  valueNames: string[];
  alreadyExists: boolean;
}

export interface VariantPreviewResponse {
  totalCombinations: number;
  existingCount: number;
  combinations: VariantCombinationPreview[];
  warnings: string[];
}

export interface VariantUpsertItem {
  id: number | null;
  sku: string;
  barcode?: string | null;
  price: Money;
  compareAtPrice?: Money | null;
  costPrice?: Money | null;
  taxRate?: number;
  weightGrams?: number | null;
  attributeValueIds: number[];
  initialStock?: number;
  minStockLevel?: number;
}

export interface VariantBulkUpsertRequest {
  variants: VariantUpsertItem[];
}
