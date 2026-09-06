import { CategoryTranslationInput, CategoryTranslationOutput } from './translation';

export interface CategoryUpsertRequest {
  parentId: number | null;
  slug?: string;
  translations: CategoryTranslationInput[];
  imageUrl?: string | null;
  bannerUrl?: string | null;
  displayOrder?: number;
  active?: boolean;
}

export interface CategoryAdminResponse {
  id: number;
  slug: string;
  parentId: number | null;
  translations: CategoryTranslationOutput[];
  imageUrl: string | null;
  bannerUrl: string | null;
  displayOrder: number;
  active: boolean;
  productCount: number | null;
  children: CategoryAdminResponse[];
}
