import { Money } from '../../common/money';
import { ProductStatus } from '../../../enums/product-status';
import { FulfillmentType } from '../../../enums/fulfillment-type';
import { ShippingSizeClass } from '../../../enums/shipping-size-class';
import { TranslationInput, TranslationOutput } from './translation';

export interface ProductAdminResponse {
  id: number;
  slug: string;
  status: ProductStatus;
  nameAr: string | null;
  nameEn: string | null;
  translations: TranslationOutput[];
  categoryId: number;
  categoryName: string;
  brandId: number | null;
  brandName: string | null;
  featured: boolean;
  newArrival: boolean;
  fulfillmentType: FulfillmentType;
  shippingSizeClass: ShippingSizeClass | null;
  requiresAssembly: boolean;
  assemblyFee: Money | null;
  variantCount: number;
  imageCount: number;
  minPrice: Money | null;
  maxPrice: Money | null;
  availableQty: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
  specifications: ProductSpecificationInput[];
}

export interface ProductSpecificationInput {
  attributeId: number;
  attributeValueId: number | null;
  valueText: string | null;
}

export interface ProductUpsertRequest {
  categoryId: number;
  brandId?: number | null;
  slug?: string | null;
  translations: TranslationInput[];
  featured?: boolean;
  newArrival?: boolean;
  fulfillmentType: FulfillmentType;
  /** Omitted when empty — PUT keeps any field it isn't sent. */
  shippingSizeClass?: ShippingSizeClass;
  requiresAssembly: boolean;
  /** Turning assembly off needs requiresAssembly:false AND assemblyFee:0 — a field can't be nulled. */
  assemblyFee: number;
  specifications?: ProductSpecificationInput[];
}
