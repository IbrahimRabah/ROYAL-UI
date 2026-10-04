export interface PortfolioImage {
  id: number;
  key: string;
  url: string;
  altTextAr?: string | null;
  altTextEn?: string | null;
  main: boolean;
  displayOrder: number;
}

export interface PortfolioAdminResponse {
  id: number;
  slug: string;
  titleAr: string;
  titleEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  /** ISO date (YYYY-MM-DD). */
  completedAt?: string | null;
  displayOrder: number;
  published: boolean;
  archivedAt?: string | null;
  images: PortfolioImage[];
  createdAt: string;
  updatedAt: string;
}

export type PortfolioState = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const portfolioState = (item: Pick<PortfolioAdminResponse, 'published' | 'archivedAt'>): PortfolioState =>
  item.archivedAt ? 'ARCHIVED' : item.published ? 'PUBLISHED' : 'DRAFT';

/**
 * PUT is a full replace: titleEn, both descriptions, categoryId and completedAt are cleared when
 * omitted, so every one of them is always sent (null when empty). slug/displayOrder are kept when
 * omitted, but are sent too.
 */
export interface PortfolioUpsertRequest {
  slug: string | null;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  categoryId: number | null;
  completedAt: string | null;
  displayOrder: number;
}

export interface PortfolioImageUpdateRequest {
  altTextAr?: string | null;
  altTextEn?: string | null;
  main?: boolean;
  displayOrder?: number;
}
