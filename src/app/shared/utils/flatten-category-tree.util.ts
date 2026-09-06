import { CategoryAdminResponse } from '../../core/models';
import { Language } from '../../core/enums/language';

export interface FlatCategoryOption {
  id: number;
  name: string;
  depth: number;
}

export function flattenCategoryTree(nodes: CategoryAdminResponse[], lang: Language, depth = 0): FlatCategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: categoryDisplayName(node, lang), depth },
    ...flattenCategoryTree(node.children, lang, depth + 1),
  ]);
}

export function categoryDisplayName(node: CategoryAdminResponse, lang: Language): string {
  const primary = node.translations.find((t) => t.locale === lang)?.name;
  const fallback = node.translations.find((t) => t.locale !== lang)?.name;
  return primary || fallback || node.slug;
}
