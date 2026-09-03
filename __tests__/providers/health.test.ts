import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * recordProviderNotConfigured / isNotConfiguredLastError (lib/providers/health.ts) — the
 * write half of the 2026-09-03 fix. Pins the two things that matter: the stored row is
 * shaped so isNotConfiguredLastError can recognize it later (lib/admin/provider-health.ts
 * reads this same marker), and a genuine failure message never accidentally matches it.
 */

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "provider_health") throw new Error(`health.test.ts: unexpected table "${table}"`);
      return { upsert: upsertMock };
    },
  }),
}));

import { recordProviderNotConfigured, isNotConfiguredLastError } from "@/lib/providers/health";

beforeEach(() => {
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe("recordProviderNotConfigured", () => {
  test("upserts status: degraded (the real enum value closest to true) with the marker prefixed onto the message", async () => {
    await recordProviderNotConfigured("tavily", "TAVILY_API_KEY is not set.");

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsertMock.mock.calls[0];
    expect(payload.provider).toBe("tavily");
    expect(payload.status).toBe("degraded");
    expect(typeof payload.last_failure_at).toBe("string");
    expect(payload.last_error).toBe("Not configured — TAVILY_API_KEY is not set.");
    expect(opts).toEqual({ onConflict: "provider" });
  });

  test("a failed upsert is swallowed after a console.warn — health tracking must never throw into its caller", async () => {
    upsertMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(recordProviderNotConfigured("tavily", "TAVILY_API_KEY is not set.")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("isNotConfiguredLastError", () => {
  test("recognizes exactly what recordProviderNotConfigured writes", () => {
    expect(isNotConfiguredLastError("Not configured — TAVILY_API_KEY is not set.")).toBe(true);
  });

  test("null (no error at all) is not a not-configured marker", () => {
    expect(isNotConfiguredLastError(null)).toBe(false);
  });

  test("a real failure message, even one that happens to mention a key, does not match", () => {
    expect(isNotConfiguredLastError("tavily rejected the API credential (HTTP 401).")).toBe(false);
  });

  test("a message that merely contains the phrase, not as its own prefix, does not match", () => {
    expect(isNotConfiguredLastError("Retry failed. Not configured — TAVILY_API_KEY is not set.")).toBe(false);
  });
});
