/**
 * Number/currency formatting with an explicit, deterministic locale — never a bare
 * `.toLocaleString()`. Without an explicit locale, `Intl`/`.toLocaleString()` resolves
 * against whatever ICU locale the *runtime* defaults to; called from a Server Component
 * that's the Node process's own locale, not the visiting student's, so the same number
 * could format differently across environments (or once this product is ever actually
 * localized, wouldn't move with the student's chosen language at all). One constant here
 * is what a future locale switch changes — not call sites scattered across the app.
 */
export const DEFAULT_LOCALE = "en-US";

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

export function formatCurrency(value: number, currency = "USD", options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency, maximumFractionDigits: 0, ...options }).format(value);
}
