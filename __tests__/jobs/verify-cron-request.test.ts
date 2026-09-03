import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * lib/jobs/verify-cron-request.ts had ZERO test coverage before this — the gate for all
 * four scheduled `/api/jobs/*` routes (discover-opportunities, discover-requirements,
 * sync-university-data, deadline-reminders; see lib/jobs/schedule.ts's own JOB_DEFINITIONS,
 * which is the authoritative "these four are actually cron-scheduled" list — the other four
 * job routes are explicitly, individually documented as founder-deferred deployment
 * decisions, not an oversight).
 *
 * CEO's ask, 2026-09-02: does the cron auth path actually work, and which failure modes are
 * silent? Verified against Vercel's own documented contract (mcp search_vercel_documentation,
 * topic "Cron Jobs authentication headers CRON_SECRET") before writing anything here —
 * Vercel's own recommended Route Handler snippet is functionally identical to this file:
 * `if (!cronSecret || authHeader !== \`Bearer ${cronSecret}\`) return 401`. This suite pins
 * that PROXOLA's actual implementation matches that contract, not just that it "looks right."
 *
 * `env.cron.secret` is read once at module scope (`lib/env.ts`'s `export const env = {...}`),
 * so testing both "secret set" and "secret unset" needs `vi.stubEnv` + `vi.resetModules()` +
 * a fresh dynamic import per case — the same module-scope-env-read gotcha
 * lib/ai/limits/budget.ts's own tests already had to work around tonight, not a new pattern.
 *
 * Uses the real `NextRequest` (constructible directly from `next/server` in this Node test
 * environment) rather than a hand-rolled fake `{ headers: { get: ... } }` object, so header
 * lookup goes through the actual `Headers` implementation Vercel's real request would use —
 * including its case-insensitive `.get()`, which is a real, spec-guaranteed property of the
 * Fetch API `Headers` class this test also gets to pin for free.
 */

function requestWithAuthHeader(headerValue: string | undefined): NextRequest {
  const headers = new Headers();
  if (headerValue !== undefined) headers.set("authorization", headerValue);
  return new NextRequest("http://localhost/api/jobs/deadline-reminders", { headers });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("verifyCronRequest — matches Vercel's own documented cron-auth contract", () => {
  test("accepts a request whose Authorization header is exactly 'Bearer <CRON_SECRET>' — the real shape Vercel sends", async () => {
    vi.stubEnv("CRON_SECRET", "a-real-secret-value");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader("Bearer a-real-secret-value"))).toBe(true);
  });

  test("rejects when CRON_SECRET is unset — fails closed, matching Vercel's own '!cronSecret || ...' check", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    // Even a header that would otherwise look plausible must not pass when there is no
    // secret to compare against — an unset secret must never mean "open to the world."
    expect(verifyCronRequest(requestWithAuthHeader("Bearer anything"))).toBe(false);
  });

  test("rejects a mismatched secret", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader("Bearer the-wrong-secret"))).toBe(false);
  });

  test("rejects when the Authorization header is absent entirely", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader(undefined))).toBe(false);
  });

  test("rejects a header missing the 'Bearer ' scheme prefix", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader("the-real-secret"))).toBe(false);
  });

  test("rejects a header with the right secret but the wrong case on the scheme — exact string comparison, not case-folded", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader("bearer the-real-secret"))).toBe(false);
  });

  test("a header with extra trailing whitespace still matches — the Headers class strips HTTP whitespace from values before this file ever sees them", async () => {
    // Written expecting the opposite (no trimming, strict equality fails) — wrong, and worth
    // keeping the correction visible rather than quietly fixing the assertion: the Fetch API's
    // Headers.set()/parsing strips leading/trailing HTTP whitespace from a header's VALUE per
    // spec, before verifyCronRequest's own `===` ever runs. That makes the real behavior MORE
    // robust than assumed, not less — a proxy or client that adds incidental whitespace to the
    // Authorization value wouldn't break a legitimate cron request.
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    expect(verifyCronRequest(requestWithAuthHeader("Bearer the-real-secret "))).toBe(true);
  });

  test("header lookup is case-insensitive on the header NAME itself — a real property of the Fetch API Headers class, not this file's own code", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    const { verifyCronRequest } = await import("@/lib/jobs/verify-cron-request");

    const headers = new Headers();
    headers.set("AUTHORIZATION", "Bearer the-real-secret"); // uppercase header name
    const request = new NextRequest("http://localhost/api/jobs/deadline-reminders", { headers });

    expect(verifyCronRequest(request)).toBe(true);
  });
});
