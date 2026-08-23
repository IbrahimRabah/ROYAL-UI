import { BrandAdminResponse } from '../../core/models';
import { Language } from '../../core/enums/language';

export interface FlatBrandOption {
  id: number;
  name: string;
}

// Current-language name, falling back to the other locale, then the slug.
export function brandDisplayName(brand: BrandAdminResponse, lang: Language): string {
  const primary = lang === Language.AR ? brand.nameAr : brand.nameEn;
  const fallback = lang === Language.AR ? brand.nameEn : brand.nameAr;
  return primary || fallback || brand.slug;
}
