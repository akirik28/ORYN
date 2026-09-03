import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * TavilySearchProvider / CollegeScorecardProvider — every `if (!this.apiKey)` short-circuit
 * (2 + 2 methods) now calls recordProviderNotConfigured before returning, closing the exact
 * gap b9 found by hand: TAVILY_API_KEY sat as an empty string all night, every short-circuit
 * skipped fetch-json.ts entirely (which is the only thing that used to record
 * provider_health), and nothing else on this branch ever wrote a row. fetchProviderJson
 * itself is unmocked here on purpose -- these tests confirm the branch never reaches it at
 * all when unconfigured, not just that fetchProviderJson behaves once called.
 */

const { recordNotConfiguredMock, fetchMock } = vi.hoisted(() => ({
  recordNotConfiguredMock: vi.fn().mockResolvedValue(undefined),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/providers/health", () => ({ recordProviderNotConfigured: recordNotConfiguredMock }));
vi.mock("@/lib/providers/fetch-json", () => ({ fetchProviderJson: fetchMock }));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  recordNotConfiguredMock.mockClear();
  fetchMock.mockClear();
});

describe("TavilySearchProvider — no API key configured", () => {
  test("search() records not-configured for tavily and never reaches fetch-json.ts", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    const { tavilyProvider } = await import("@/lib/providers/tavily");

    const result = await tavilyProvider.search("economics competitions");

    expect(result).toEqual({ success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } });
    expect(recordNotConfiguredMock).toHaveBeenCalledWith("tavily", "TAVILY_API_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("extract() records not-configured too, independently of search()", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    const { tavilyProvider } = await import("@/lib/providers/tavily");

    const result = await tavilyProvider.extract(["https://example.com"]);

    expect(result).toEqual({ success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } });
    expect(recordNotConfiguredMock).toHaveBeenCalledWith("tavily", "TAVILY_API_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a real key present -- neither records not-configured nor short-circuits before fetch-json.ts", async () => {
    vi.stubEnv("TAVILY_API_KEY", "a-real-key");
    fetchMock.mockResolvedValue({ success: true, data: { query: "q", results: [] } });
    const { tavilyProvider } = await import("@/lib/providers/tavily");

    await tavilyProvider.search("economics competitions");

    expect(recordNotConfiguredMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("CollegeScorecardProvider — no API key configured", () => {
  test("searchByName() records not-configured for college_scorecard and never reaches fetch-json.ts", async () => {
    vi.stubEnv("COLLEGE_SCORECARD_API_KEY", "");
    const { collegeScorecardProvider } = await import("@/lib/providers/college-scorecard");

    const result = await collegeScorecardProvider.searchByName("Harvard");

    expect(result).toEqual({ success: false, error: { type: "not_configured", message: "COLLEGE_SCORECARD_API_KEY is not set." } });
    expect(recordNotConfiguredMock).toHaveBeenCalledWith("college_scorecard", "COLLEGE_SCORECARD_API_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("getById() records not-configured too, independently of searchByName()", async () => {
    vi.stubEnv("COLLEGE_SCORECARD_API_KEY", "");
    const { collegeScorecardProvider } = await import("@/lib/providers/college-scorecard");

    const result = await collegeScorecardProvider.getById(166027);

    expect(result).toEqual({ success: false, error: { type: "not_configured", message: "COLLEGE_SCORECARD_API_KEY is not set." } });
    expect(recordNotConfiguredMock).toHaveBeenCalledWith("college_scorecard", "COLLEGE_SCORECARD_API_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
