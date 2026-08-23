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

/**
 * Money whose currency may genuinely not be known — the unit is required, and `null` means
 * "not recorded" rather than "assume dollars".
 *
 * `formatCurrency`'s defaulted `currency = "USD"` is safe only where a currency is actually on
 * file. `opportunities.cost` is a bare numeric with no companion currency column, and live rows
 * hold GBP, EUR, CHF and TRY amounts in it, so that default silently prints a British
 * programme's 365 as "$365" and a Turkish one's 60,000 as "$60,000" — wrong by orders of
 * magnitude, on the surface a student reads before deciding.
 *
 * A bare number is the honest failure mode. "60,000" sends the student to the official page;
 * "$60,000" tells them something false with confidence. Callers that DO have a currency (the
 * university tables carry `cost_currency`/`tuition_currency`) should pass it and get a symbol.
 */
export function formatMoney(value: number, currency: string | null, options?: Intl.NumberFormatOptions): string {
  if (!currency) return formatNumber(value, { maximumFractionDigits: 0, ...options });
  return formatCurrency(value, currency, options);
}
