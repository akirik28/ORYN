import { formatDistanceToNow, type Locale as DateFnsLocale } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from "./config";

/**
 * date-fns locale objects, keyed by Oryn locale code.
 *
 * Imported statically rather than lazily. date-fns ships one module per locale and these
 * two are a few kilobytes; a dynamic import would make every relative timestamp an async
 * boundary, which is a poor trade for a string that renders inline in a Server Component.
 */
const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  en: enUS,
  tr,
};

export function dateFnsLocale(locale: Locale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale] ?? DATE_FNS_LOCALES[DEFAULT_LOCALE];
}

/**
 * "3 days ago" / "3 gün önce" — a relative timestamp that stands on its own.
 *
 * Isomorphic on purpose: it takes the locale as an argument instead of reaching for
 * `next/headers`, so Server Components can pass the value from `resolveLocale()` and
 * Client Components can pass the one from `useLocale()`, without two near-identical
 * helpers that could drift.
 *
 * `addSuffix` is baked in rather than exposed. Every existing call site in the app passes
 * it, and it is what makes the output a complete phrase in both languages — the suffix is
 * a preposition in English ("ago") and a postposition in Turkish ("önce"), so the position
 * is date-fns' business, not the caller's.
 *
 * **Use this only where the output is a phrase by itself.** Interpolating it into a
 * sentence whose other half is a hardcoded English string ("Checked {…}") produces
 * "Checked 3 gün önce" for a Turkish student, which reads worse than leaving the whole
 * thing in English. Translate the surrounding copy in the same change, or leave the call
 * site alone until you do.
 */
export function formatRelativeTime(date: Date | string | number, locale: Locale): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateFnsLocale(locale) });
}

/**
 * "12 January 2027" / "12 Ocak 2027" — a full calendar date that stands on its own, for the
 * (rarer) case where the actual date matters more than how long ago/until it is. This was
 * missing until app/(app)/universities/[id]/page.tsx needed one and reached for a hardcoded
 * `.toLocaleDateString("en-US", ...)` literal instead — a gap in this file, not a page being
 * careless with locale. `Intl.DateTimeFormat` orders day/month/year correctly per locale on
 * its own (English "January 12", Turkish "12 Ocak"), so callers pass options, not word order.
 */
export function formatAbsoluteDate(date: Date | string | number, locale: Locale, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? INTL_LOCALES[DEFAULT_LOCALE], options).format(new Date(date));
}
