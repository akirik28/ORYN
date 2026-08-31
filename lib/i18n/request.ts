import { getRequestConfig } from "next-intl/server";
import { isLocale, type Locale } from "./config";
import { resolveLocale } from "./locale";

/**
 * Catalog loaders, keyed explicitly rather than built from a template literal
 * (`import(\`../../messages/${locale}.json\`)`). An explicit record keeps the bundler's
 * dependency graph exact — it emits precisely these two chunks instead of a context module
 * that sweeps in every file under `messages/` — and it makes an unsupported locale a
 * compile error here rather than a module-not-found at request time. Same shape as the
 * `dictionaries` pattern in
 * node_modules/next/dist/docs/01-app/02-guides/internationalization.md.
 */
const CATALOGS: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../messages/en.json"),
  tr: () => import("../../messages/tr.json"),
};

/**
 * Per-request i18n configuration, wired in via `createNextIntlPlugin` in next.config.ts.
 *
 * There is no `[locale]` URL segment in this app and `requestLocale` is therefore never
 * consulted. That is a deliberate choice, not an omission: locale-prefixed routing would
 * mean moving every route under `app/[locale]/`, which changes every internal href,
 * redirect, `PROTECTED_PREFIXES` entry in lib/supabase/proxy.ts and existing bookmark. The
 * locale here is a property of the *student*, already modelled as
 * `profiles.preferred_language`, so it is resolved from the account and a cookie instead —
 * see lib/i18n/locale.ts. Sharing a link still lands the recipient in their own language,
 * which for an auth-gated product is the correct behaviour anyway.
 *
 * `timeZone` is intentionally left unset. next-intl only applies it to its own
 * `format.dateTime` helpers, and this app formats dates with date-fns (see
 * lib/i18n/date.ts). Wire it to `profiles.timezone` at the same time as the first
 * next-intl date formatter, not before — setting it now would cost a profile read on
 * every request to configure something nothing reads.
 */
export default getRequestConfig(async ({ locale: requested }) => {
  // Set when a caller passes an explicit locale, e.g. `getTranslations({locale: "tr"})`.
  // Honouring it is what makes server-side rendering of a specific language possible
  // (previewing a catalog, or a future email/PDF rendered in the student's language).
  const locale = isLocale(requested) ? requested : await resolveLocale();

  return {
    locale,
    messages: (await CATALOGS[locale]()).default,
  };
});
