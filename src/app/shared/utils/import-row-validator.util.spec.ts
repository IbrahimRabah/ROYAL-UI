import { ImportValidationContext, categoryKey, validateImportField } from './import-row-validator.util';

describe('validateImportField', () => {
  const ctx = (values: Record<string, string> = {}): ImportValidationContext => ({
    categoryNames: ['كراسي البار', 'كراسي'],
    specKinds: { spec_width_cm: 'NUMBER', spec_swivel: 'BOOLEAN', spec_material: 'TEXT', spec_comfort_level: 'NUMBER' },
    values,
  });
  const code = (key: string, value: string, values: Record<string, string> = {}) =>
    validateImportField(key, value, ctx(values))?.code ?? null;

  it('requires a SKU of letters, digits, dot, underscore and hyphen, in any case', () => {
    expect(code('sku', '')).toBe('REQUIRED');
    expect(code('sku', 'ch 135')).toBe('INVALID_SKU');
    expect(code('sku', 'ch135')).toBeNull();
    expect(code('sku', 'CH-135_A.1')).toBeNull();
  });

  it('matches the category the way the server does: the article "ال" and spelling variants are ignored', () => {
    expect(code('category', '')).toBe('REQUIRED');
    expect(code('category', 'كراسي بار')).toBeNull();
    expect(code('category', 'كراسي البار')).toBeNull();
    expect(code('category', 'سرير')).toBe('UNKNOWN_CATEGORY');
    expect(categoryKey('كراسي البار')).toBe(categoryKey('كراسي بار'));
  });

  it('does not judge the category before the shop categories are loaded', () => {
    expect(validateImportField('category', 'أي شيء', { ...ctx(), categoryNames: [] })).toBeNull();
  });

  it('checks the price: required, a number, above zero, at most 4 decimals', () => {
    expect(code('price', '')).toBe('REQUIRED');
    expect(code('price', 'abc')).toBe('INVALID_NUMBER');
    expect(code('price', '-5')).toBe('NEGATIVE');
    expect(code('price', '0')).toBe('PRICE_ZERO');
    expect(code('price', '1.23456')).toBe('TOO_MANY_DECIMALS');
    expect(code('price', '2650')).toBeNull();
    expect(code('price', '٣٬٧٠٠')).toBeNull();
    expect(code('price', '2,650.50')).toBeNull();
  });

  it('keeps the price before discount at or above the price', () => {
    expect(code('compare_at', '', { price: '100' })).toBeNull();
    expect(code('compare_at', '50', { price: '100' })).toBe('COMPARE_AT_BELOW_PRICE');
    expect(code('compare_at', '100', { price: '100' })).toBeNull();
    expect(code('compare_at', '150', { price: '' })).toBeNull();
  });

  it('wants a whole number of stock', () => {
    expect(code('stock', '')).toBeNull();
    expect(code('stock', '7')).toBeNull();
    expect(code('stock', '7.5')).toBe('NOT_WHOLE');
  });

  it('wants a lowercase hyphenated slug', () => {
    expect(code('slug', '')).toBeNull();
    expect(code('slug', 'Bad Slug')).toBe('INVALID_SLUG');
    expect(code('slug', 'bar-stool-ch135')).toBeNull();
  });

  it('requires an English name once another English field is filled', () => {
    expect(code('name_en', '', { desc_en: 'Text' })).toBe('ENGLISH_NAME_REQUIRED');
    expect(code('name_en', '', {})).toBeNull();
    expect(code('name_en', 'Stool', { desc_en: 'Text' })).toBeNull();
  });

  it('limits text lengths', () => {
    expect(code('name_ar', '')).toBe('REQUIRED');
    expect(code('name_ar', 'x'.repeat(256))).toBe('TOO_LONG');
    expect(code('meta_desc_ar', 'x'.repeat(501))).toBe('TOO_LONG');
    expect(code('meta_desc_ar', 'x'.repeat(500))).toBeNull();
  });

  it('turns a bad specification into a warning, never an error: the server skips that cell', () => {
    expect(validateImportField('spec_width_cm', 'Number', ctx())).toEqual({ severity: 'WARNING', code: 'INVALID_NUMBER' });
    expect(validateImportField('spec_swivel', '10', ctx())).toEqual({ severity: 'WARNING', code: 'INVALID_VALUE' });
    expect(validateImportField('spec_comfort_level', '11', ctx())).toEqual({ severity: 'WARNING', code: 'OUT_OF_RANGE' });
    expect(validateImportField('spec_width_cm', '', ctx())).toBeNull();
    expect(validateImportField('spec_swivel', 'نعم', ctx())).toBeNull();
    expect(validateImportField('spec_width_cm', '50', ctx())).toBeNull();
  });
});
