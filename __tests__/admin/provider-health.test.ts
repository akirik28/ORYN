import { describe, expect, it } from "vitest";
import { summarizeProviderHealth, PROVIDER_DEFINITIONS } from "@/lib/admin/provider-health";
import type { ProviderHealth } from "@/types/database";

const NOW = new Date("2026-09-02T12:00:00Z");
const DEF = PROVIDER_DEFINITIONS[0]; // anthropic

function makeRow(overrides: Partial<ProviderHealth>): ProviderHealth {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    provider: DEF.provider,
    status: "healthy",
    last_success_at: NOW.toISOString(),
    last_failure_at: null,
    last_error: null,
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

describe("summarizeProviderHealth — a provider with no row at all", () => {
  it("reads as never_attempted/never_called, not absent — the gap this module exists to close", () => {
    const summary = summarizeProviderHealth(DEF, null, NOW);
    expect(summary).toMatchObject({ provider: "anthropic", status: "never_attempted", freshness: "never_called", lastSuccessAt: null, sinceLastSuccessMs: null });
  });
});

describe("summarizeProviderHealth — not_configured, 2026-09-03", () => {
  it("a row whose last_error carries the not-configured marker reads as its own synthetic status, not the raw stored 'degraded'", () => {
    const row = makeRow({
      status: "degraded",
      last_success_at: null,
      last_failure_at: NOW.toISOString(),
      last_error: "Not configured — TAVILY_API_KEY is not set.",
    });
    const summary = summarizeProviderHealth(DEF, row, NOW);
    expect(summary.status).toBe("not_configured");
    // last_failure_at is real (the attempt happened, it just skipped before reaching the
    // provider) — freshness/lastFailureAt aren't overridden, only `status` is reinterpreted.
    expect(summary.lastFailureAt).toBe(NOW.toISOString());
  });

  it("a row with a real failure message (no marker) is left as the raw stored status — not every degraded row is not_configured", () => {
    const row = makeRow({ status: "degraded", last_success_at: null, last_failure_at: NOW.toISOString(), last_error: "Tavily rejected the API credential (HTTP 401)." });
    const summary = summarizeProviderHealth(DEF, row, NOW);
    expect(summary.status).toBe("degraded");
  });
});

describe("summarizeProviderHealth — freshness tiers", () => {
  it("succeeded moments ago reads as fresh", () => {
    const row = makeRow({ last_success_at: new Date(NOW.getTime() - 5 * 60_000).toISOString() });
    expect(summarizeProviderHealth(DEF, row, NOW).freshness).toBe("fresh");
  });

  it("succeeded 12 hours ago reads as recent, not fresh", () => {
    const row = makeRow({ last_success_at: new Date(NOW.getTime() - 12 * 60 * 60_000).toISOString() });
    expect(summarizeProviderHealth(DEF, row, NOW).freshness).toBe("recent");
  });

  it("succeeded 3 days ago reads as aging", () => {
    const row = makeRow({ last_success_at: new Date(NOW.getTime() - 3 * 24 * 60 * 60_000).toISOString() });
    expect(summarizeProviderHealth(DEF, row, NOW).freshness).toBe("aging");
  });

  it("succeeded 10 days ago reads as stale — the exact case a single status badge can't tell apart from a minute ago", () => {
    const row = makeRow({ last_success_at: new Date(NOW.getTime() - 10 * 24 * 60 * 60_000).toISOString() });
    const summary = summarizeProviderHealth(DEF, row, NOW);
    expect(summary.freshness).toBe("stale");
    // status is left as the raw stored value, deliberately not overridden — this row's
    // `status` column can still say "healthy" here, which is exactly the ambiguity
    // `freshness` exists to resolve without discarding the raw fact.
    expect(summary.status).toBe("healthy");
  });

  it("a row that has status set but has never actually succeeded reads as never_called freshness, even though it isn't the never-row case", () => {
    const row = makeRow({ status: "down", last_success_at: null, last_failure_at: NOW.toISOString(), last_error: "connection refused" });
    const summary = summarizeProviderHealth(DEF, row, NOW);
    expect(summary.freshness).toBe("never_called");
    expect(summary.status).toBe("down");
    expect(summary.lastError).toBe("connection refused");
  });
});

describe("PROVIDER_DEFINITIONS", () => {
  it("covers all five external providers this product actually calls — internet_archive added 2026-09-03, found live-reporting with no entry here", () => {
    expect(PROVIDER_DEFINITIONS.map((d) => d.provider).sort()).toEqual(["anthropic", "college_scorecard", "internet_archive", "openalex", "tavily"]);
  });
});
