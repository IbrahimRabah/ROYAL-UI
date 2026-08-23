import { Money } from '../../common/money';
import { ProductStatus } from '../../../enums/product-status';
import { TranslationInput, TranslationOutput } from './translation';

// GET/POST/PUT /admin/products, and the single-product GET.
export interface ProductAdminResponse {
  id: number;
  slug: string;
  status: ProductStatus;
  // Inferred nullable — a DRAFT product created from only one locale's translation could
  // be missing the other; not shown null in the one example (which has both set).
  nameAr: string | null;
  nameEn: string | null;
  // Source of truth for editing (the Details tab form) — one entry per locale the product
  // has a translation for. nameAr/nameEn above stay for the list table, but are otherwise
  // redundant with translations[].find(t => t.locale === ...).name.
  translations: TranslationOutput[];
  categoryId: number;
  categoryName: string;
  // Inferred nullable — brandId is optional on create (BRAND_NOT_FOUND only fires "if given").
  brandId: number | null;
  brandName: string | null;
  featured: boolean;
  newArrival: boolean;
  variantCount: number;
  imageCount: number;
  // Inferred nullable — a fresh DRAFT has variantCount: 0, so there is no price range yet.
  minPrice: Money | null;
  maxPrice: Money | null;
  availableQty: number;
  // Inferred nullable — a never-published DRAFT has no publish date, by analogy with
  // archivedAt which is explicitly null in the example.
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // e.g. "No variants — this product cannot be published or bought", "No images".
  warnings: string[];
  // Added alongside translations[] — same full-replace-via-PUT shape as the request
  // (ProductSpecificationInput). Per the API's global convention, attributeValueId /
  // valueText are OMITTED entirely when null, never sent as an explicit null — treat a
  // missing key as null/empty when reading, same as every other nullable field.
  specifications: ProductSpecificationInput[];
}

export interface ProductSpecificationInput {
  attributeId: number;
  // Explicit null in the contract example — either attributeValueId (LIST attribute) or
  // valueText (free text) is supplied, not both.
  attributeValueId: number | null;
  valueText: string | null;
}

// POST /admin/products (create, minus slug requirement) and PUT /admin/products/{id} (update).
export interface ProductUpsertRequest {
  categoryId: number;
  brandId?: number | null;
  // Explicit null in the contract example — server derives it from the translations when omitted.
  slug?: string | null;
  translations: TranslationInput[];
  featured?: boolean;
  newArrival?: boolean;
  specifications?: ProductSpecificationInput[];
}
