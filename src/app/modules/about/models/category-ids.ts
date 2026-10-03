import { CategoryNode } from '../../../core/models';

export interface CategoryIds {
  bedrooms: number | null;
  dining: number | null;
  tables: number | null;
}

export function findCategoryIds(categories: CategoryNode[]): CategoryIds {
  const bySlug = new Map(categories.map((category) => [category.slug, category.id]));
  return {
    bedrooms: bySlug.get('bedrooms') ?? null,
    dining: bySlug.get('dining') ?? null,
    tables: bySlug.get('tables') ?? null,
  };
}
