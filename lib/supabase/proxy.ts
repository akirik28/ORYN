import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

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
 * Optimistic session refresh + route gate, run from proxy.ts (Next.js 16 renamed
 * "middleware" to "proxy" — same mechanism). This only reads the cookie-based session;
 * it is not the source of truth for authorization. Every Server Component / Server
 * Action / Route Handler must independently call verifySession() from lib/security/dal.ts
 * before touching user data. See node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!env.supabase.url || !env.supabase.publishableKey) {
    // Supabase not configured yet — let requests through unauthenticated rather than
    // hard-failing the whole app. Protected pages will show a setup notice.
    return supabaseResponse;
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
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
