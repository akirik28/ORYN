import { DEFAULT_LOCALE, INTL_LOCALES } from "./config";

/**
 * Number/currency formatting with an explicit, deterministic locale — never a bare
 * `.toLocaleString()`. Without an explicit locale, `Intl`/`.toLocaleString()` resolves
 * against whatever ICU locale the *runtime* defaults to; called from a Server Component
 * that's the Node process's own locale, not the visiting student's, so the same number
 * could format differently across environments.
 *
 * **Numbers are not locale-switched yet, deliberately.** The UI language now moves with
 * the student (lib/i18n/locale.ts), but these formatters stay pinned to the English
 * number system. Turkish groups digits the other way round — 12000 is "12.000" in tr-TR
 * against "12,000" in en-US — so flipping this constant silently rewrites every
 * university statistic, cost and token count in the product. That is a deliberate,
 * separately-reviewed change against pages whose surrounding copy is still English, not a
 * side effect of adding a language switcher. When it happens, thread the active locale
 * through `INTL_LOCALES[locale]` and update __tests__/i18n/format.test.ts with it.
 *
 * Named for what it is, rather than `DEFAULT_LOCALE`: that name now belongs to the app's
 * language code ("en") in lib/i18n/config.ts, and two constants in one directory holding
 * "en" and "en-US" under a single name is a trap for whoever localizes numbers next.
 */
export const NUMBER_FORMAT_LOCALE = INTL_LOCALES[DEFAULT_LOCALE];

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(NUMBER_FORMAT_LOCALE, options).format(value);
}

/**
 * A token count as a student actually reads it — "142K", not "142,384". This isn't a
 * legibility shortcut, it's the more honest number: a monthly allowance derived from a
 * cost reference (lib/ai/monthly-quota.ts) was never precise to the exact token, so a full
 * comma-grouped figure asserts a precision that was never real. `Intl`'s own compact
 * notation already does the right thing below 1,000 — exact digits, no "K" — so a real
 * small remainder (a student down to their last few hundred tokens) never rounds down to
 * "0K" and reads as already exhausted when it isn't; this exists so every call site gets
 * that for free instead of hand-rolling a threshold.
 */
export function formatTokenCount(value: number): string {
  return formatNumber(value, { notation: "compact", compactDisplay: "short" });
}

export function formatCurrency(value: number, currency = "USD", options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(NUMBER_FORMAT_LOCALE, { style: "currency", currency, maximumFractionDigits: 0, ...options }).format(value);
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

/**
 * A short, fixed elapsed-time string for a known duration between two timestamps — e.g. a
 * background job's run time. Deliberately not `date-fns`'s `formatDistanceStrict`
 * ("5 minutes"): an ops-facing number reads faster as "5m 12s" than as prose, matching the
 * product's own "short, clear copy" rule for everything else (spec Phase 56).
 *
 * Not locale-aware, unlike this file's other formatters — "5m 12s" isn't natural-language
 * prose, it's closer to a stopwatch reading, so there's nothing here for a locale to
 * change. Revisit if this ever needs to read as a sentence rather than a label.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
