import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { migrateLegacyLocaleCookie } from "@/lib/supabase/proxy";
import { LOCALE_COOKIE, LEGACY_LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * 2026-09-04 — the `oryn_locale` → `proxola_locale` rename (Lane 4, 2026-09-03) shipped
 * without a migration, contradicting an earlier explicit "report the cost, don't change it
 * without one" instruction. This pins the migration built to close that gap: any request
 * still carrying the old cookie gets the new one written, silently, on the same request,
 * and a request already carrying the new cookie is never overwritten by a stale old one.
 */

function requestWithCookies(cookies: Record<string, string>): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest("http://localhost/", { headers });
}

describe("migrateLegacyLocaleCookie", () => {
  test("legacy cookie only -- migrates the value onto the request and returns it", () => {
    const request = requestWithCookies({ [LEGACY_LOCALE_COOKIE]: "tr" });

    const result = migrateLegacyLocaleCookie(request);

    expect(result).toBe("tr");
    expect(request.cookies.get(LOCALE_COOKIE)?.value).toBe("tr");
  });

  test("new cookie already present -- no migration, legacy value is ignored", () => {
    const request = requestWithCookies({ [LOCALE_COOKIE]: "en", [LEGACY_LOCALE_COOKIE]: "tr" });

    const result = migrateLegacyLocaleCookie(request);

    expect(result).toBeNull();
    expect(request.cookies.get(LOCALE_COOKIE)?.value).toBe("en");
  });

  test("neither cookie present -- no migration", () => {
    const request = requestWithCookies({});

    const result = migrateLegacyLocaleCookie(request);

    expect(result).toBeNull();
    expect(request.cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });

  test("new cookie present, no legacy cookie -- no-op, not just no-overwrite", () => {
    const request = requestWithCookies({ [LOCALE_COOKIE]: "tr" });

    const result = migrateLegacyLocaleCookie(request);

    expect(result).toBeNull();
    expect(request.cookies.get(LOCALE_COOKIE)?.value).toBe("tr");
  });
});
