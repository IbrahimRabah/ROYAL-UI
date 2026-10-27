import { Money } from '../common/money';

/** GET /search/suggestions — absent (not null) fields are simply missing keys. */
export interface SuggestionProduct {
  name: string;
  slug: string;
  imageUrl?: string;
  /** Lowest active variant price; absent when nothing is on sale. */
  price?: Money;
}

export interface SuggestionCategory {
  /** The same id the storefront category tree uses. */
  id: number;
  name: string;
  slug: string;
}

export interface SearchSuggestionsResponse {
  products: SuggestionProduct[];
  categories: SuggestionCategory[];
}
