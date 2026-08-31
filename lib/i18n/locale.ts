import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { integrationStatus } from "@/lib/env";
import { getCurrentProfile } from "@/lib/security/dal";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, toLocale, type Locale } from "./config";

/**
 * Resolves the locale for the current request.
 *
 * Order is cookie → `profiles.preferred_language` → default, and the order is the whole
 * design:
 *
 * 1. **Cookie.** Set by the language switcher. Costs nothing to read, is available before
 *    any session lookup, and works for signed-out visitors (the marketing page, the login
 *    screen) who have no profile row to consult at all.
 *
 * 2. **Profile column.** The durable record, and the reason this function does a database
 *    read at all: a cookie is per-browser, so without this step a student who switched to
 *    Turkish on their laptop would get English again on their phone. This is also the step
 *    that finally makes `preferred_language` a column something *reads* — it has been
 *    written-to-never-read since migration 0002.
 *
 * 3. **Default.** English, matching the column default.
 *
 * Two cost guards, because this runs on every request that renders a translated tree:
 *
 * - The profile read is skipped entirely unless a Supabase auth cookie is actually
 *   present. `getCurrentProfile()` → `verifySession()` → `supabase.auth.getUser()` is a
 *   network round-trip to the auth server; paying that on the public landing page for
 *   visitors who by definition have no profile would be a straight regression.
 * - `getCurrentProfile` is already `cache()`d in the DAL and `resolveLocale` is `cache()`d
 *   here, so on authenticated pages — where `(app)/layout.tsx` calls `requireProfile()`
 *   anyway — this resolves from the same deduplicated read rather than issuing a second one.
 *
 * Failure is never fatal: an unreachable database yields English, not a 500. AGENTS.md
 * rule 8 — external failure must not crash the app.
 */
export const resolveLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();

  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  if (!integrationStatus.supabase) return DEFAULT_LOCALE;
  if (!hasSessionCookie(store.getAll())) return DEFAULT_LOCALE;

  try {
    const profile = await getCurrentProfile();
    return toLocale(profile?.preferred_language);
  } catch {
    return DEFAULT_LOCALE;
  }
});

/**
 * "Is there plausibly a signed-in user?" — deliberately a cheap string test, not an auth
 * check. `@supabase/ssr` writes its session as `sb-<project-ref>-auth-token`, chunked
 * across `…auth-token.0`/`.1` cookies when it exceeds the 4KB cookie limit, so the
 * substring match covers both shapes.
 *
 * A false positive costs one profile read that returns null and falls through to the
 * default; it can never grant access to anything, because the authoritative check is
 * `verifySession()` inside `getCurrentProfile()` itself. Nothing here is an authorization
 * decision.
 */
function hasSessionCookie(all: { name: string }[]): boolean {
  return all.some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}
