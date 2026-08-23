import { CategoryTranslationInput, CategoryTranslationOutput } from './translation';

// POST /admin/categories, PUT /admin/categories/{id} — parentId and bannerUrl are
// explicitly null in the contract example.
export interface CategoryUpsertRequest {
  parentId: number | null;
  slug?: string;
  translations: CategoryTranslationInput[];
  imageUrl?: string | null;
  bannerUrl?: string | null;
  displayOrder?: number;
  active?: boolean;
}

// GET/POST/PUT /admin/categories — the real admin DTO, distinct from the storefront's
// CategoryNode (GET /categories/tree): a single already-translated `name` there vs full
// per-locale translations[] here, needed for bilingual side-by-side editing. Do not reuse
// between the two (same rule as ProductAdminResponse vs the storefront product shapes).
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
