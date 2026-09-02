import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Confirms fetchProviderJson reports every real failure to monitoring, alongside
 * provider_health, without ever forwarding `url`, `init.body`, or the response body — the
 * no-content rule from lib/monitoring/redact.ts's own comment applies here as much as to
 * the AI call path, since a search provider's `url` carries the caller's query. Same
 * mocking pattern as __tests__/ai/anthropic-provider-health.test.ts.
 */

const { recordSuccessMock, recordFailureMock, reportErrorMock } = vi.hoisted(() => ({
  recordSuccessMock: vi.fn().mockResolvedValue(undefined),
  recordFailureMock: vi.fn().mockResolvedValue(undefined),
  reportErrorMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/providers/health", () => ({
  recordProviderSuccess: recordSuccessMock,
  recordProviderFailure: recordFailureMock,
}));

vi.mock("@/lib/monitoring", () => ({
  reportError: reportErrorMock,
}));

import { fetchProviderJson } from "@/lib/providers/fetch-json";

beforeEach(() => {
  recordSuccessMock.mockClear();
  recordFailureMock.mockClear();
  reportErrorMock.mockClear();
  vi.unstubAllGlobals();
});

const SECRET_URL = "https://api.example.com/search?q=student-name-or-cv-detail&key=leak-me";

describe("fetchProviderJson — monitoring on real failures", () => {
  test("a clean 200 reports success, never a failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const result = await fetchProviderJson(SECRET_URL, {}, { provider: "tavily" });

    expect(result.success).toBe(true);
    expect(recordSuccessMock).toHaveBeenCalledWith("tavily");
    expect(reportErrorMock).not.toHaveBeenCalled();
  });

  test.each([
    ["401 → auth_failed", 401, "auth_failed"],
    ["403 → auth_failed", 403, "auth_failed"],
    ["429 → rate_limited", 429, "rate_limited"],
    ["500 → unavailable", 500, "unavailable"],
  ])("%s reports to both provider_health and monitoring", async (_label, status, errorType) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    const result = await fetchProviderJson(SECRET_URL, {}, { provider: "tavily" });

    expect(result.success).toBe(false);
    expect(recordFailureMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    const [, context] = reportErrorMock.mock.calls[0];
    expect(context.tags).toEqual({ provider: "tavily", error_type: errorType });
  });

  test("malformed JSON reports to both", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));
    await fetchProviderJson(SECRET_URL, {}, { provider: "college_scorecard" });

    expect(recordFailureMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });

  test("a network throw reports unavailable to both", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")));
    await fetchProviderJson(SECRET_URL, {}, { provider: "openalex" });

    expect(recordFailureMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    const [, context] = reportErrorMock.mock.calls[0];
    expect(context.tags.error_type).toBe("unavailable");
  });

  test("a timeout reports to both, not just provider_health", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))))
    );
    vi.useFakeTimers();
    const pending = fetchProviderJson(SECRET_URL, {}, { provider: "tavily", timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(200);
    await pending;
    vi.useRealTimers();

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock.mock.calls[0][1].tags.error_type).toBe("timeout");
  });

  test("never forwards the request URL, headers, or body to monitoring — only the provider name and a synthetic message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    await fetchProviderJson(SECRET_URL, { headers: { Authorization: "Bearer real-secret" }, body: "student-cv-text-goes-here" }, { provider: "tavily" });

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    const [errorArg, context] = reportErrorMock.mock.calls[0];
    const serialized = JSON.stringify({ errorArg: { message: errorArg.message }, context });
    expect(serialized).not.toContain("student-name-or-cv-detail");
    expect(serialized).not.toContain("leak-me");
    expect(serialized).not.toContain("real-secret");
    expect(serialized).not.toContain("student-cv-text-goes-here");
  });
});
