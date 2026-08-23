import { CategoryAdminResponse } from '../../core/models';
import { Language } from '../../core/enums/language';

// Flattens GET /admin/categories' recursive tree into a single list a p-select can render,
// carrying `depth` so the template can indent children under their parent.
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

// Current-language translation, falling back to the other locale, then the slug — never
// blank, even for a category whose translations[] is missing one locale entirely.
export function categoryDisplayName(node: CategoryAdminResponse, lang: Language): string {
  const primary = node.translations.find((t) => t.locale === lang)?.name;
  const fallback = node.translations.find((t) => t.locale !== lang)?.name;
  return primary || fallback || node.slug;
}
