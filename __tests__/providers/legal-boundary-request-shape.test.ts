import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Guards LEGAL_REVIEW.md §2's three "no personal data" provider claims — Tavily ("search
 * terms only, and they never describe a student"), OpenAlex ("No name, email, or account
 * identifier is attached"), College Scorecard ("university identifiers only"). Provider files
 * unchanged since the packet was written (confirmed via git log,
 * docs/legal-review-currency-check-2026-09-03.md), so these claims currently hold — this test
 * is what keeps them from silently stopping holding the way the Anthropic paragraph did.
 *
 * **What this DOES prove, mechanically:** each provider sends exactly the request-body/URL-
 * param field set named below — nothing extra attached by the provider itself. If a future
 * change adds a field (a userId, an email, a name) to any of these three requests, this test
 * fails by revealing an unlisted key.
 *
 * **What this does NOT prove, and cannot from here:** whether every current or future *caller*
 * (lib/opportunities/discover.ts, lib/requirements/discover.ts, lib/ai/research-generator.ts)
 * ever puts a student's name or other personal data *inside* the `query`/`name` string these
 * functions accept — that string is caller-supplied free text, and its content is a property
 * of each call site, not of the provider. §2's "never describe a student" claim rests on both
 * halves; this test closes the provider half only. The caller half would need per-call-site
 * tests asserting what string each one actually builds, not attempted here.
 */

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/providers/fetch-json", () => ({ fetchProviderJson: fetchMock }));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  fetchMock.mockClear();
  fetchMock.mockResolvedValue({ success: true, data: { results: [] } });
});

describe("TavilySearchProvider.search — request body field set is closed", () => {
  test("the POST body carries exactly the known-safe fields, nothing keyed by user/student identity", async () => {
    vi.stubEnv("TAVILY_API_KEY", "fake-key-for-test");
    const { tavilyProvider } = await import("@/lib/providers/tavily");

    await tavilyProvider.search("high school economics competition Turkey", { maxResults: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const ALLOWED = new Set(["query", "max_results", "search_depth", "include_domains", "exclude_domains", "time_range"]);
    for (const key of Object.keys(body)) {
      expect(ALLOWED.has(key), `unexpected field "${key}" in the Tavily request body — LEGAL_REVIEW.md §2 says Tavily receives search terms only`).toBe(true);
    }
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("studentId");
  });
});

describe("OpenAlexResearchProvider.searchWorks — URL param field set is closed, mailto is Proxola's own", () => {
  test("the request URL carries exactly the known-safe params, and mailto (if set) is Proxola's operational address, never a per-call value", async () => {
    vi.stubEnv("OPENALEX_CONTACT_EMAIL", "oryn-ops@example.com");
    const { openAlexProvider } = await import("@/lib/providers/openalex");

    await openAlexProvider.searchWorks("youth unemployment tertiary education OECD", 10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [urlArg] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URL(urlArg).searchParams;
    const ALLOWED = new Set(["search", "per_page", "sort", "mailto"]);
    for (const key of params.keys()) {
      expect(ALLOWED.has(key), `unexpected param "${key}" in the OpenAlex request — LEGAL_REVIEW.md §2 says no name/email/account identifier is attached`).toBe(true);
    }
    // mailto, when present, is the module-level operational address from env, not anything
    // derived from a student or a call argument — searchWorks() takes no such argument at all.
    if (params.has("mailto")) expect(params.get("mailto")).toBe("oryn-ops@example.com");
    expect(params.has("email")).toBe(false);
    expect(params.has("userId")).toBe(false);
  });
});

describe("CollegeScorecardProvider — URL param field set is closed, no student-identifying param exists", () => {
  test("searchByName's request URL carries only school-identifying params, never a student one", async () => {
    vi.stubEnv("COLLEGE_SCORECARD_API_KEY", "fake-key-for-test");
    const { collegeScorecardProvider } = await import("@/lib/providers/college-scorecard");

    await collegeScorecardProvider.searchByName("Boston University", 5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [urlArg] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URL(urlArg).searchParams;
    const ALLOWED = new Set(["api_key", "school.name", "fields", "per_page"]);
    for (const key of params.keys()) {
      expect(ALLOWED.has(key), `unexpected param "${key}" in the College Scorecard request — LEGAL_REVIEW.md §2 says this provider receives university identifiers only`).toBe(true);
    }
  });

  test("getById's request URL carries only a numeric college id, never a student one", async () => {
    vi.stubEnv("COLLEGE_SCORECARD_API_KEY", "fake-key-for-test");
    const { collegeScorecardProvider } = await import("@/lib/providers/college-scorecard");

    await collegeScorecardProvider.getById(164988);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [urlArg] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URL(urlArg).searchParams;
    const ALLOWED = new Set(["api_key", "id", "fields"]);
    for (const key of params.keys()) {
      expect(ALLOWED.has(key), `unexpected param "${key}" in the College Scorecard request`).toBe(true);
    }
  });
});
