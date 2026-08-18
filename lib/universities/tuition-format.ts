/**
 * Pure tuition-display formatting, extracted from the detail page so it's unit-testable —
 * this exact logic caused two real, live bugs before being pulled out (a hardcoded "£" that
 * mislabeled Canada's CAD figures, and a "From " prefix that leaked from an international
 * range onto a domestic exact figure whenever both were shown together). See callers for
 * context.
 */

/** `university_profile_metrics.unit` for a tuition figure is a currency/basis string like
 * "GBP/year" or "CAD/credit" — this table has no dedicated currency column, so the unit string
 * is what a reader has to parse. A prior version of this page hardcoded "£", which silently
 * mislabeled Canada's CAD figures as GBP the moment non-UK data existed — caught live 2026-08-18
 * viewing University of Alberta's page. Extend this map as new countries' currencies get
 * acquired; an unrecognized prefix falls back to the raw currency code plus a space rather than
 * guessing a symbol. */
const CURRENCY_SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "AU$" };

export function currencyPrefix(unit: string): string {
  const code = unit.split("/")[0];
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/** `0` is real, verified data for Germany's public universities outside Baden-Württemberg (no
 * tuition charged by law — see acquire-university-statistics-de.ts), not a missing value; shown
 * as "Free" rather than "€0/yr" since that's what a reader actually wants to know. */
export function formatTuition(amount: number, unit: string): string {
  return amount === 0 ? "Free" : `${currencyPrefix(unit)}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr`;
}

/** Three tuition shapes this product actually has, each needing different honesty framing:
 * "range" (UK/Canada/Australia/Netherlands course-fee bands) genuinely varies by programme;
 * "upper_bound" (Italy's ISEE-based public-university ceiling — see
 * acquire-university-statistics-it.ts) is a real number, but most students pay less, sometimes
 * €0, based on family income, not course choice — a materially different caveat, so it gets its
 * own copy rather than reusing "varies by course," which would be a different, wrong claim.
 * Anything else ("exact") is a single real figure with nothing to caveat.
 *
 * IMPORTANT: call this separately for the international figure and the domestic figure — each
 * has its own `precision_state` and they can differ (e.g. a UK university's international fee
 * is often a course-varying range while its domestic fee is one flat national number). Reusing
 * one call's result for both figures was a real bug, caught live 2026-08-18 re-verifying
 * Edinburgh right after adding Italy's "upper_bound" case: it silently relabelled Edinburgh's
 * flat "£9,790/yr" domestic rate as "From £9,790/yr" because international happened to be a
 * range that pass. */
export function tuitionQualifier(precisionState: string): { valuePrefix: string; note: string } {
  if (precisionState === "range") return { valuePrefix: "From ", note: "Varies by course. " };
  if (precisionState === "upper_bound") return { valuePrefix: "Up to ", note: "Income-based (ISEE) — most students pay less. " };
  return { valuePrefix: "", note: "" };
}
