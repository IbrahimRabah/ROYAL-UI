/**
 * The checks the product import runs on a row, repeated in the browser so the row editor can turn a field
 * red or green while the person types. The server runs the same checks again when the row is saved, and
 * it is the one that decides; this only has to agree with it often enough to be useful. What the browser
 * cannot know (a slug another product already uses, the SKU's state in the catalogue) comes from the
 * server's findings and the SKU check.
 *
 * Keep it in step with `ImportRowProcessor` on the backend.
 */

export type ImportIssueSeverity = 'ERROR' | 'WARNING';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  /** Same codes as the server's findings, so the same translated texts apply. */
  code: string;
}

export interface ImportValidationContext {
  /** The shop's product category names; empty until loaded, in which case the category is not checked. */
  categoryNames: readonly string[];
  /** The kind of each specification field key (spec_width_cm …), from the row's specifications. */
  specKinds: Readonly<Record<string, 'TEXT' | 'NUMBER' | 'BOOLEAN'>>;
  /** Every value of the row as typed, for the rules between two fields. */
  values: Readonly<Record<string, string>>;
}

const SKU = /^[A-Z0-9][A-Z0-9._-]{0,59}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_LENGTH: Readonly<Record<string, number>> = {
  name_ar: 255,
  name_en: 255,
  short_ar: 500,
  meta_title_ar: 255,
  meta_title_en: 255,
  meta_desc_ar: 500,
  meta_desc_en: 500,
  slug: 180,
  desc_ar: 20000,
  desc_en: 20000,
};

const MAX_SPEC_TEXT = 500;
const YES = ['نعم', 'yes', 'true', '1', 'y'];
const NO = ['لا', 'no', 'false', '0', 'n'];

const error = (code: string): ImportIssue => ({ severity: 'ERROR', code });
const warning = (code: string): ImportIssue => ({ severity: 'WARNING', code });

/** The first problem with one value, or null when it is fine. */
export function validateImportField(key: string, raw: string, ctx: ImportValidationContext): ImportIssue | null {
  const value = (raw ?? '').trim();

  if (key.startsWith('spec_')) {
    return validateSpec(key, value, ctx);
  }

  switch (key) {
    case 'sku':
      if (!value) return error('REQUIRED');
      return SKU.test(value.toUpperCase()) ? null : error('INVALID_SKU');

    case 'category':
      if (!value) return error('REQUIRED');
      if (ctx.categoryNames.length === 0) return null;
      return ctx.categoryNames.some((n) => categoryKey(n) === categoryKey(value)) ? null : error('UNKNOWN_CATEGORY');

    case 'name_ar':
      if (!value) return error('REQUIRED');
      return tooLong(key, value);

    case 'name_en': {
      const otherEnglish = ['desc_en', 'meta_title_en', 'meta_desc_en'].some((k) => (ctx.values[k] ?? '').trim());
      if (!value && otherEnglish) return error('ENGLISH_NAME_REQUIRED');
      return tooLong(key, value);
    }

    case 'price': {
      if (!value) return error('REQUIRED');
      const n = parseNumber(value);
      if (n.problem) return error(n.problem);
      return n.value === 0 ? error('PRICE_ZERO') : null;
    }

    case 'compare_at': {
      if (!value) return null;
      const n = parseNumber(value);
      if (n.problem) return error(n.problem);
      const price = parseNumber((ctx.values['price'] ?? '').trim());
      return !price.problem && price.value !== null && n.value !== null && n.value < price.value
        ? error('COMPARE_AT_BELOW_PRICE')
        : null;
    }

    case 'stock': {
      if (!value) return null;
      const n = parseNumber(value);
      if (n.problem) return error(n.problem);
      return Number.isInteger(n.value) ? null : error('NOT_WHOLE');
    }

    case 'slug':
      if (!value) return null;
      if (!SLUG.test(value)) return error('INVALID_SLUG');
      return tooLong(key, value);

    default:
      return tooLong(key, value);
  }
}

/**
 * A specification problem is only a warning on the server: the cell is skipped and the product still goes
 * through, so it is only amber here.
 */
function validateSpec(key: string, value: string, ctx: ImportValidationContext): ImportIssue | null {
  if (!value) return null;
  const kind = ctx.specKinds[key] ?? 'TEXT';

  if (kind === 'NUMBER') {
    const n = parseNumber(value);
    if (n.problem) return warning(n.problem);
    if (key === 'spec_comfort_level' && n.value !== null && (n.value < 1 || n.value > 10)) return warning('OUT_OF_RANGE');
    return null;
  }
  if (kind === 'BOOLEAN') {
    const v = value.toLowerCase();
    return YES.includes(v) || NO.includes(v) ? null : warning('INVALID_VALUE');
  }
  return value.length > MAX_SPEC_TEXT ? warning('TOO_LONG') : null;
}

function tooLong(key: string, value: string): ImportIssue | null {
  const max = MAX_LENGTH[key];
  return max !== undefined && value.length > max ? error('TOO_LONG') : null;
}

interface ParsedNumber {
  value: number | null;
  problem: string | null;
}

/** A non-negative number; Arabic digits and thousands separators are accepted, like the server does. */
function parseNumber(text: string): ParsedNumber {
  if (!text) return { value: null, problem: null };
  const s = arabicDigitsToLatin(text).replace(/[,٬\s]/g, '').replace(/٫/g, '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return { value: null, problem: 'INVALID_NUMBER' };
  const n = Number(s);
  if (n < 0) return { value: null, problem: 'NEGATIVE' };
  const decimals = s.includes('.') ? s.split('.')[1].replace(/0+$/, '').length : 0;
  if (decimals > 4) return { value: null, problem: 'TOO_MANY_DECIMALS' };
  return { value: n, problem: null };
}

function arabicDigitsToLatin(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * A category name with Arabic spelling variants folded and the article «ال» dropped from every word, so the
 * sheet's «كراسي بار» finds the shop's «كراسي البار». Same folding as the server's `categoryKey`.
 */
export function categoryKey(name: string): string {
  const folded = arabicDigitsToLatin(name)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-يa-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return folded
    .split(' ')
    .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ');
}
