import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { Language } from '../enums/language';
import ar from '../../../assets/i18n/ar.json';
import en from '../../../assets/i18n/en.json';

const STATIC_TRANSLATIONS: Record<Language, TranslationObject> = {
  [Language.AR]: ar,
  [Language.EN]: en,
};

/**
 * Reads the translations straight out of the compiled bundle, on the server AND in the browser.
 *
 * The browser used to download ./assets/i18n/<lang>.json. That file is served with a one-year cache lifetime (every
 * static file is, see server.ts), so a returning visitor kept the OLD file after a release: every string added since
 * then showed as its raw key ("topBar.call", "products.filters.sortAndFilter"). The server render never had the
 * problem, which is why the page looked right until the browser took over. The JSON is already part of the bundle
 * (the server loader imports it), and the bundle's file name changes with every build, so reading it from there keeps
 * the texts and the code from the same release together, with no extra request.
 *
 * On the server there is also no page origin for a relative URL to resolve against, and `ng build` has no live server.
 */
class StaticTranslateLoader extends TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(STATIC_TRANSLATIONS[lang as Language] ?? STATIC_TRANSLATIONS[Language.AR]);
  }
}

// The parameters are kept so the module's `deps: [HttpClient, PLATFORM_ID]` stays valid; neither is needed any more.
export function translateLoaderFactory(_http?: unknown, _platformId?: object): TranslateLoader {
  return new StaticTranslateLoader();
}
