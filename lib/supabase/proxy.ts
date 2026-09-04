import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, LEGACY_LOCALE_COOKIE } from "@/lib/i18n/config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/universities",
  "/opportunities",
  "/plan",
  "/applications",
  "/advisor",
  "/documents",
  "/settings",
  "/onboarding",
  "/admin",
];

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Migrates the pre-rename locale cookie forward, silently, on whichever request first
 * carries it (2026-09-04 — the rename that introduced LOCALE_COOKIE landed without this,
 * contradicting an earlier, explicit "report the cost, don't change it without a migration"
 * instruction; see lib/i18n/config.ts's LEGACY_LOCALE_COOKIE comment). Lives here, not in
 * lib/i18n/locale.ts's resolveLocale(), because a Server Component can read a cookie but
 * cannot write one — proxy.ts is the one place in this request's lifecycle that can do both
 * before anything downstream renders. Mutates `request.cookies` so this exact request's
 * render sees the migrated value immediately (resolveLocale needs no change at all: it
 * already just reads LOCALE_COOKIE off `cookies()`), and returns the value to persist onto
 * whichever response the caller ends up returning, so every exit path — the two redirects
 * below and the normal pass-through — carries the Set-Cookie, not just the common case.
 */
export function migrateLegacyLocaleCookie(request: NextRequest): string | null {
  if (request.cookies.get(LOCALE_COOKIE)) return null;
  const legacy = request.cookies.get(LEGACY_LOCALE_COOKIE)?.value;
  if (!legacy) return null;
  request.cookies.set(LOCALE_COOKIE, legacy);
  return legacy;
}

/**
 * Optimistic session refresh + route gate, run from proxy.ts (Next.js 16 renamed
 * "middleware" to "proxy" — same mechanism). This only reads the cookie-based session;
 * it is not the source of truth for authorization. Every Server Component / Server
 * Action / Route Handler must independently call verifySession() from lib/security/dal.ts
 * before touching user data. See node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export async function updateSession(request: NextRequest) {
  const migratedLocale = migrateLegacyLocaleCookie(request);
  const withMigratedLocale = (response: NextResponse) => {
    if (migratedLocale) response.cookies.set(LOCALE_COOKIE, migratedLocale, LOCALE_COOKIE_OPTIONS);
    return response;
  };

  let supabaseResponse = NextResponse.next({ request });

  if (!env.supabase.url || !env.supabase.publishableKey) {
    // Supabase not configured yet — let requests through unauthenticated rather than
    // hard-failing the whole app. Protected pages will show a setup notice.
    return withMigratedLocale(supabaseResponse);
  }

  const supabase = createServerClient(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => path.startsWith(route));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return withMigratedLocale(NextResponse.redirect(redirectUrl));
  }

  if (isAuthRoute && user) {
    return withMigratedLocale(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return withMigratedLocale(supabaseResponse);
}
