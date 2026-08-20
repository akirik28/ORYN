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

/** Accepts the raw `YYYY-MM-DD` strings the DB stores for opportunity/program dates —
 * parsed as UTC-midnight (`T00:00:00Z`) rather than through the bare `Date` constructor,
 * which interprets a plain date-only string as UTC but a full ISO string as local time;
 * mixing the two silently shifts the displayed day near a timezone boundary. A string that
 * already carries a `T` (a full timestamp — dev fixtures build these via `.toISOString()`;
 * no production column does) is never re-suffixed, since appending `T00:00:00Z` to a string
 * that already ends in one produces an unparseable `Date` (`NaN`) rather than an error — an
 * earlier draft of `formatDuration` below did exactly that before switching to this shared
 * parse, caught by its own fixture data (which uses `.toISOString()`) before it was ever
 * committed. */
export function parseDbDate(date: string | Date): Date {
  return typeof date === "string" && !date.includes("T") ? new Date(`${date}T00:00:00Z`) : new Date(date);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC", ...options }).format(parseDbDate(date));
}

/** "Jun 15 – Aug 7, 2026" when both ends are known and fall in the same year; "Dec 18, 2026
 * – Jan 29, 2027" when they don't (both ends carry a year rather than only the second);
 * "February 14, 2024 – Present" when `ongoing` (profile/CV/portfolio activities — an
 * opportunity's own start/end dates never have this concept, only student-entered ones do);
 * whichever single end is known when only one is; `null` when nothing is known — the caller
 * omits the whole section rather than rendering a fabricated "Duration: TBD". */
export function formatDuration(startDate: string | null, endDate: string | null, ongoing = false): string | null {
  if (ongoing) return startDate ? `${formatDate(startDate)} – Present` : null;
  if (startDate && endDate) {
    const sameYear = parseDbDate(startDate).getUTCFullYear() === parseDbDate(endDate).getUTCFullYear();
    // The end date always carries its own year (formatDate's default); the start date's
    // year is suppressed only when it matches, so a same-year range prints the year once
    // and a cross-year one prints it on both ends — never appended a second time after
    // already being in `endLabel`. `year: undefined` (not simply omitted) is what
    // suppresses formatDate's own year:"numeric" default per Intl's options-merge rules.
    const startLabel = formatDate(startDate, { year: sameYear ? undefined : "numeric", month: "short", day: "numeric" });
    const endLabel = formatDate(endDate, { month: "short", day: "numeric" });
    return `${startLabel} – ${endLabel}`;
  }
  if (startDate) return `Starts ${formatDate(startDate)}`;
  if (endDate) return `Ends ${formatDate(endDate)}`;
  return null;
}
