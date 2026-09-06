import { Language } from '../../../enums/language';

export interface TranslationInput {
  locale: Language;
  name: string;
  shortDescription: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface NameTranslationInput {
  locale: Language;
  name: string;
}

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

export interface TranslationOutput {
  locale: Language;
  name: string;
  shortDescription?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}
