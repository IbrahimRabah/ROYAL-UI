import { Language } from '../../../enums/language';

// Shared by product and category admin upsert requests — description/metaTitle/
// metaDescription are confirmed nullable (explicit null in the POST /admin/products
// translations example). shortDescription is not shown null in that example but is
// presented as freeform optional text alongside them — inferred nullable.
export interface TranslationInput {
  locale: Language;
  name: string;
  shortDescription: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

// Lighter shape used by attribute/attribute-value translations — just locale + name.
export interface NameTranslationInput {
  locale: Language;
  name: string;
}

// Category translations — NOT the same as TranslationInput/Output above. Confirmed by the
// backend: shortDescription doesn't exist on the category entity at all. The shared
// TranslationInput still carries it for products, but sending it here would be silently
// dropped server-side — so this is its own narrower type rather than reusing that one.
export interface CategoryTranslationInput {
  locale: Language;
  name: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface CategoryTranslationOutput {
  locale: Language;
  name: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// GET/PUT /admin/products/{id} response translations[] — same six fields as
// TranslationInput above, sent back unchanged on save. The API omits null fields entirely
// (a global convention, not specific to this endpoint) rather than sending explicit
// nulls, so shortDescription/description/metaTitle/metaDescription are optional keys here
// — a missing key means "no value", not an error. Populate the form with '' for any of
// these that are absent.
export interface TranslationOutput {
  locale: Language;
  name: string;
  shortDescription?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}
