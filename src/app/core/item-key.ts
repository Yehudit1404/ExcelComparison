/** The column that rows are matched on. */
export const ITEM_COLUMN = 'מספר פריט';

/**
 * Turns an item number into the form used for matching:
 * - all whitespace is removed,
 * - letter case is ignored ("ab123" = "AB123"),
 * - zeros before the letters are dropped ("0AB123" = "AB123").
 *
 * Zeros after the letters are part of the number, so "AB012" != "AB12".
 */
export function normalizeItemKey(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/^0+(?=\D)/, '');
}

/** Collapses repeated whitespace in a header so " מספר  פריט " still matches. */
export function cleanHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
