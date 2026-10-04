import { Money } from '../common/money';
import { FulfillmentType } from '../../enums/fulfillment-type';
import { ShippingSizeClass } from '../../enums/shipping-size-class';
import { SortOption } from '../../enums/sort-option';
import { AttributeGroupResponse } from './attribute';
import { BrandResponse } from './brand';
import { CategoryBreadcrumbItem } from './category';
import { ImageResponse } from './image';
import { VariantResponse } from './variant';
export interface ProductSummaryResponse {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  brandName: string;
  categorySlug: string;
  imageUrl: string;
  imageAlt: string;
  minPrice: Money;
  maxPrice: Money;
  compareAtPrice: Money;
  discountPercent: number;
  inStock: boolean;
  availableQty: number;
  featured: boolean;
  newArrival: boolean;
  fulfillmentType: FulfillmentType;
  shippingSizeClass: ShippingSizeClass | null;
  requiresAssembly: boolean;
  assemblyFee: Money | null;
}

export interface ProductDetailResponse {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  brand: BrandResponse;
  categoryPath: CategoryBreadcrumbItem[];
  priceRange: { min: Money; max: Money };
  variantOptions: AttributeGroupResponse[];
  variants: VariantResponse[];
  specifications: ProductSpecification[];
  images: ImageResponse[];
  inStock: boolean;
  featured: boolean;
  newArrival: boolean;
  fulfillmentType: FulfillmentType;
  shippingSizeClass: ShippingSizeClass | null;
  requiresAssembly: boolean;
  assemblyFee: Money | null;
  seo: ProductSeo;
}

export interface ProductSpecification {
  code: string;
  name: string;
  value: string;
}

export interface ProductSeo {
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
}

export interface ProductFilter {
  q?: string;
  categoryId?: number;
  brandIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  attributeValueIds?: number[];
  inStockOnly?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  sort?: SortOption;
  page?: number;
  size?: number;
}
