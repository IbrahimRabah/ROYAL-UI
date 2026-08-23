import { Money } from '../../common/money';
import { ProductStatus } from '../../../enums/product-status';

// GET /admin/products/{productId}/variants — list item.
// `status` reuses ProductStatus: the contract only ever shows "ACTIVE" here, and
// "sellable = variant is ACTIVE, not archived" implies ARCHIVED is the only other value
// — no separate variant-status enum was defined in the foundation batch, and DRAFT is
// meaningless for a variant, so ProductStatus is the closest fit without inventing a new enum.
export interface VariantAdminResponse {
  id: number;
  productId: number;
  sku: string;
  // e.g. "ذهبي / 42 مم" — human-readable attribute-value combination, localized.
  summary: string;
  // Inferred nullable — barcode is never described as required.
  barcode: string | null;
  price: Money;
  // Inferred nullable — not required on create.
  compareAtPrice: Money | null;
  costPrice: Money | null;
  // A rate/multiplier (0.14 = 14%), not a currency amount — intentionally not Money.
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

// POST /admin/products/{productId}/variants/preview
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
  // e.g. "Capped at 200 combinations — narrow your selection".
  warnings: string[];
}

// One entry of POST /admin/products/{productId}/variants — id: null creates, id set updates.
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
