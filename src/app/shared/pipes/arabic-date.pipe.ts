import { Pipe, PipeTransform, inject } from '@angular/core';

import { Language } from '../../core/enums/language';
import { LanguageStoreService } from '../../core/state/language-store.service';

// Formats an ISO date/datetime string using the current UI language's month/weekday
// names, but always with Latin digits (-u-nu-latn) — dates must stay LTR-readable inside
// Arabic layouts per the admin RTL rules, only the words around the numbers localize.
@Pipe({
  name: 'arabicDate',
  pure: false,
})
export class ArabicDatePipe implements PipeTransform {
  private readonly languageStore = inject(LanguageStoreService);

  transform(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '—';
    }
    const locale = this.languageStore.lang() === Language.AR ? 'ar-EG-u-nu-latn' : 'en-GB';
    const format = options ?? { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(locale, format).format(date);
  }
}
