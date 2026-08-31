/**
 * The languages Oryn ships, and the small amount of metadata every layer needs to agree on.
 *
 * Deliberately importable from both server and client — the switcher is a Client Component
 * and needs `LOCALE_LABELS`, while `request.ts` and the server action need the same list to
 * validate against. Nothing here touches `next/headers` or the database for that reason.
 *
 * Locale codes are the short subtags ("en", "tr") because that is what
 * `profiles.preferred_language` has stored since migration 0002 (`text not null default
 * 'en'`). Region-qualified tags for `Intl`/`date-fns` are derived below rather than stored,
 * so the database column keeps exactly the shape it already had.
 */

export const LOCALES = ["en", "tr"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * English stays the default: it is the column default in the schema, and it is what every
 * un-translated string in the product is already written in. A student who never touches
 * the switcher must see the product exactly as it was before this feature existed.
 */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Cookie carrying the *request-time* locale. This is the fast path — reading it costs
 * nothing, where reading `profiles.preferred_language` costs a query on every render.
 * `lib/i18n/locale.ts` documents how the two stay reconciled.
 *
 * Not prefixed `__Host-`/`__Secure-`: this has to be readable over plain http on
 * localhost, and it carries a UI preference, not an authentication or authorization
 * decision. Nothing security-relevant is gated on it.
 */
export const LOCALE_COOKIE = "oryn_locale";

/** One year. A language choice is not a session-scoped decision. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Endonyms — each language named in itself, never translated. A student looking for
 * Turkish scans for "Türkçe", not for whatever the current UI language calls Turkish.
 * This is the standard convention for language pickers and the reason this map is not
 * part of the message catalogs.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};

/**
 * BCP-47 tags for `Intl` and `date-fns`. Kept separate from the stored code because
 * "tr" alone is a valid `Intl` locale but leaves region-dependent formatting to ICU's
 * own default resolution; naming the region makes number/date output deterministic
 * across environments, which is the whole point of `lib/i18n/format.ts`.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  tr: "tr-TR",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Narrows any stored/user-supplied string to a supported locale, falling back rather than
 * throwing. `profiles.preferred_language` is unconstrained `text` — no check constraint,
 * no enum — so a row can legitimately hold a value this build does not ship a catalog for
 * (an older locale, a hand-edited row, a future language rolled back). Rendering English
 * is the correct response to that; a 500 is not.
 */
export function toLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
