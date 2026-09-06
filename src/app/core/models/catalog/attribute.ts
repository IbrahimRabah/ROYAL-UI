import { BrandResponse } from './brand';
export interface AttributeValueResponse {
  id: number;
  code: string;
  name: string;
  hexColor: string | null;
  productCount: number | null;
}

export interface AttributeGroupResponse {
  attributeId: number;
  code: string;
  name: string;
  values: AttributeValueResponse[];
}

export interface FilterFacetsResponse {
  brands: BrandResponse[];
  attributes: AttributeGroupResponse[];
  minPrice: number | null;
  maxPrice: number | null;
}
