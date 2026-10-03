import { Language } from '../enums/language';

export const LANGUAGE_STORAGE_KEY = 'royal_lang';

export function parseStoredLanguage(value: string | null): Language | null {
  return value === Language.AR || value === Language.EN ? (value as Language) : null;
}

/**
 * Used as TranslateModule.forRoot's defaultLanguage so it matches whatever
 * LanguageStoreService will call translate.use() with on startup — if the two
 * disagreed, ngx-translate would fetch and race two different languages'
 * JSON, letting the loser's stale fallback text flash in the UI.
 */
export function getInitialLanguage(): Language {
  if (typeof localStorage === 'undefined') {
    return Language.AR;
  }
  return parseStoredLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)) ?? Language.AR;
}
