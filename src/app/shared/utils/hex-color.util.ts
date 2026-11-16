const BARE_HEX = /^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Colours come from admin-entered data, and a hex typed without its leading `#` ("B8863F") is not a valid
 * CSS colour, so the swatch silently renders transparent. Add the `#` when the value is a bare hex string;
 * anything else (an already-prefixed hex, a named colour, `rgb()`) is passed through untouched.
 */
export function normalizeHexColor(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return BARE_HEX.test(trimmed) ? `#${trimmed}` : trimmed;
}
