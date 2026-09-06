import { Language } from '../../../core/enums/language';

const LOCALES: Record<Language, string> = {
  [Language.AR]: 'ar-EG-u-nu-latn',
  [Language.EN]: 'en-US',
};

export function formatOrderDate(iso: string, lang: Language, withTime = false): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(LOCALES[lang], options).format(date);
}
