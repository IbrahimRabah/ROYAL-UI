import { Money } from '../common/money';
import { ImageResponse } from './image';

export interface VariantResponse {
  id: number;
  sku: string;
  summary: string;
  price: Money;
  compareAtPrice: Money;
  discountPercent: number;
  attributeValueIds: number[];
  availableQty: number;
  inStock: boolean;
  images: ImageResponse[];
}

export interface VariantAvailabilityResponse {
  variantId: number;
  sku: string;
  price: Money;
  availableQty: number;
  inStock: boolean;
  sellable: boolean;
}
