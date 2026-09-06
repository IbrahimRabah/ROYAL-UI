import { AttributeDataType } from '../../../enums/attribute-data-type';
import { NameTranslationInput } from './translation';
export interface AttributeValueAdminResponse {
  id: number;
  code: string;
  hexColor: string | null;
  displayOrder: number;
  nameAr: string;
  nameEn: string;
}

export interface AttributeAdminResponse {
  id: number;
  code: string;
  dataType: AttributeDataType;
  variantDefining: boolean;
  filterable: boolean;
  displayOrder: number;
  nameAr: string;
  nameEn: string;
  values: AttributeValueAdminResponse[];
}

export interface AttributeValueUpsertItem {
  id: number | null;
  code: string;
  hexColor?: string | null;
  displayOrder?: number;
  translations: NameTranslationInput[];
}

export interface AttributeUpsertRequest {
  code: string;
  dataType?: AttributeDataType;
  variantDefining?: boolean;
  filterable?: boolean;
  displayOrder?: number;
  translations: NameTranslationInput[];
  values?: AttributeValueUpsertItem[];
}
