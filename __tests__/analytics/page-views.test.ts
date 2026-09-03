import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * recordPageView (lib/analytics/page-views.ts) -- the write side of anonymous visitor
 * counting. after() is mocked to capture its callback instead of actually deferring it, so
 * these tests can await the real recording logic directly; the callback is exactly what
 * would run after the response is sent in production. Covers every silent-skip path
 * (unconfigured secret, unconfigured admin client, missing table) and confirms the one
 * thing that must never happen: no raw IP or user agent reaching the insert call.
 *
 * PAGE_VIEW_HASH_SECRET is read once at module scope (lib/env.ts's own `export const env`),
 * same gotcha __tests__/jobs/verify-cron-request.test.ts's own header already names for
 * CRON_SECRET -- vi.stubEnv + vi.resetModules() + a fresh dynamic import per test, not a
 * shared beforeEach stub, or every test after the first would see whichever value the first
 * test's module evaluation happened to freeze.
 */

const { afterMock, insertMock, tryCreateAdminClientMock } = vi.hoisted(() => ({
  afterMock: vi.fn(),
  insertMock: vi.fn(),
  tryCreateAdminClientMock: vi.fn(),
}));

vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ["x-forwarded-for", "203.0.113.9, 10.0.0.1"],
      ["user-agent", "Mozilla/5.0 (test)"],
    ])
  ),
}));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));

async function runRecording() {
  const [callback] = afterMock.mock.calls[0];
  await callback();
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  afterMock.mockReset();
  insertMock.mockReset();
  tryCreateAdminClientMock.mockReset();
  tryCreateAdminClientMock.mockReturnValue({ from: () => ({ insert: insertMock }) });
  insertMock.mockResolvedValue({ error: null });
});

describe("recordPageView", () => {
  test("schedules its work via after(), not inline", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled(); // not run yet -- only the callback runs it
  });

  test("inserts a hashed row, never the raw IP or user agent", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();

    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.path).toBe("/");
    expect(typeof row.visitor_hash).toBe("string");
    expect(row.visitor_hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex digest
    expect(JSON.stringify(row)).not.toContain("203.0.113.9");
    expect(JSON.stringify(row)).not.toContain("Mozilla");
  });

  test("hashes the first address in a multi-hop x-forwarded-for, not the proxy's own", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();
    const actual = insertMock.mock.calls[0][0].visitor_hash;

    const { createHash } = await import("node:crypto");
    const today = new Date().toISOString().slice(0, 10);
    const expected = createHash("sha256").update(`test-secret-do-not-use-in-prod:${today}:203.0.113.9:Mozilla/5.0 (test)`).digest("hex");
    expect(actual).toBe(expected);
  });

  test("no PAGE_VIEW_HASH_SECRET configured -- skips recording, never hashes with a predictable secret", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "");
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();

    expect(insertMock).not.toHaveBeenCalled();
  });

  test("no admin client configured (e.g. local dev) -- skips recording silently", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    tryCreateAdminClientMock.mockReturnValue(null);
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();

    expect(insertMock).not.toHaveBeenCalled();
  });

  test("page_views table missing -- swallows the error silently, no console.error", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    insertMock.mockResolvedValue({ error: { code: "PGRST205", message: "Could not find the table 'public.page_views' in the schema cache" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("an unrecognized insert error -- logged, unlike the expected missing-table case", async () => {
    vi.stubEnv("PAGE_VIEW_HASH_SECRET", "test-secret-do-not-use-in-prod");
    insertMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { recordPageView } = await import("@/lib/analytics/page-views");

    recordPageView("/");
    await runRecording();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
