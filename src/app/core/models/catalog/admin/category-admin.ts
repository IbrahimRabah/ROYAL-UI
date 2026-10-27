import { CategoryTranslationInput, CategoryTranslationOutput } from './translation';

export type CategoryImageType = 'CARD' | 'BANNER';

/** PRODUCT = shop category, PORTFOLIO = portfolio category. Never mixed in one tree. */
export type CategoryScope = 'PRODUCT' | 'PORTFOLIO';

export interface CategoryUpsertRequest {
  parentId: number | null;
  slug?: string;
  translations: CategoryTranslationInput[];
  displayOrder?: number;
  active?: boolean;
  /** Create: default PRODUCT; ignored under a parent (inherits). Update: OMIT = no change (the one non-full-replace field). */
  scope?: CategoryScope;
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
  scope: CategoryScope;
  children: CategoryAdminResponse[];
}
