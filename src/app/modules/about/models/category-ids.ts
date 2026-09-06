import { CategoryNode } from '../../../core/models';

export interface CategoryIds {
  watches: number | null;
  wallets: number | null;
  perfumes: number | null;
}

export function findCategoryIds(categories: CategoryNode[]): CategoryIds {
  const bySlug = new Map(categories.map((category) => [category.slug, category.id]));
  return {
    watches: bySlug.get('watches') ?? null,
    wallets: bySlug.get('wallets') ?? null,
    perfumes: bySlug.get('perfumes') ?? null,
  };
}
