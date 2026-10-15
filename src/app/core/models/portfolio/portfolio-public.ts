/**
 * Public portfolio (GET /portfolio, GET /portfolio/{slug}). Null fields are stripped API-wide,
 * so every optional field arrives as an absent key.
 */
export interface PortfolioSummary {
  id: number;
  slug: string;
  title: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  /** ISO date (YYYY-MM-DD). */
  completedAt?: string | null;
}

export interface PortfolioDetailImage {
  url: string;
  alt?: string | null;
  main: boolean;
  displayOrder: number;
}

export interface PortfolioDetail {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  completedAt?: string | null;
  images?: PortfolioDetailImage[] | null;
}
