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

/** GET /portfolio/categories — a plain array (not paged) of active PORTFOLIO categories. */
export interface PortfolioCategory {
  id: number;
  slug: string;
  /** One string, already in the language of the request (Accept-Language). */
  name: string;
  displayOrder: number;
  /** Absent (not null) when the category has no image. */
  imageUrl?: string;
}
