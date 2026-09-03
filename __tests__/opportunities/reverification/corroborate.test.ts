import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The direct answer to the concern raised before this job was built (6e's manual
 * verification passes, perimeterinstitute.ca 403ing two independent ways): does the
 * corroboration mechanism actually distinguish "we can't reach it, and neither can anyone
 * else" from "we can't reach it, but the Internet Archive can"? These tests pin exactly that.
 */

const { fetchProviderJsonMock } = vi.hoisted(() => ({ fetchProviderJsonMock: vi.fn() }));

vi.mock("@/lib/providers/fetch-json", () => ({ fetchProviderJson: fetchProviderJsonMock }));

import { checkWaybackAvailability, tavilyCorroborates, corroborateUnreadable } from "@/lib/opportunities/reverification/corroborate";

beforeEach(() => {
  fetchProviderJsonMock.mockReset();
});

describe("checkWaybackAvailability", () => {
  test("no capture at all -- corroborates_unreadable", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: {} } });
    return expect(checkWaybackAvailability("https://perimeterinstitute.ca/issyp")).resolves.toBe("corroborates_unreadable");
  });

  test("a capture exists but available is explicitly false -- corroborates_unreadable", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: { closest: { available: false, status: "200" } } } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("corroborates_unreadable");
  });

  test("a real, successful (200) capture exists -- falsifies_unreadable, direct proof the page is readable", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: { closest: { available: true, status: "200" } } } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("falsifies_unreadable");
  });

  test("a redirect (3xx) capture also falsifies -- IA already followed it to archive it", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: { closest: { available: true, status: "301" } } } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("falsifies_unreadable");
  });

  test("a captured ERROR page (IA successfully archived a 404/500) does NOT falsify -- archiving an error is not evidence the real page reads fine now", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: { closest: { available: true, status: "500" } } } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("corroborates_unreadable");
  });

  test("the Wayback API itself being unavailable is inconclusive, never treated as either signal", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: false, error: { type: "unavailable", message: "timeout" } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("inconclusive");
  });

  test("a response with no archived_snapshots key at all is treated as 'no capture', not malformed -- the schema key is optional", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { unexpected: "shape" } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("corroborates_unreadable");
  });

  test("a genuinely malformed body (wrong type where the schema expects an object) is inconclusive, not a crash", () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: "not an object" } });
    return expect(checkWaybackAvailability("https://example.com")).resolves.toBe("inconclusive");
  });
});

describe("tavilyCorroborates", () => {
  test("true when the exact URL appears in Tavily's own failed_results", () => {
    expect(tavilyCorroborates("https://maa.org/amc", [{ url: "https://maa.org/amc", error: "403" }])).toBe(true);
  });

  test("false when the URL is absent from failed_results", () => {
    expect(tavilyCorroborates("https://maa.org/amc", [{ url: "https://other.com", error: "403" }])).toBe(false);
    expect(tavilyCorroborates("https://maa.org/amc", [])).toBe(false);
  });
});

describe("corroborateUnreadable -- the combined signal", () => {
  test("Wayback falsifies -- corroborated is false regardless of what Tavily says, and falsified is true", async () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: { closest: { available: true, status: "200" } } } });
    const result = await corroborateUnreadable("https://example.com", [{ url: "https://example.com", error: "403" }]);
    expect(result).toEqual({ corroborated: false, falsified: true, waybackSignal: "falsifies_unreadable", tavilyCorroborated: true });
  });

  test("Wayback corroborates AND Tavily corroborates -- corroborated, not falsified", async () => {
    fetchProviderJsonMock.mockResolvedValue({ success: true, data: { archived_snapshots: {} } });
    const result = await corroborateUnreadable("https://maa.org/amc", [{ url: "https://maa.org/amc", error: "403" }]);
    expect(result.corroborated).toBe(true);
    expect(result.falsified).toBe(false);
  });

  test("Wayback inconclusive but Tavily corroborates -- still corroborated (the fallback signal, assumption A11)", async () => {
    fetchProviderJsonMock.mockResolvedValue({ success: false, error: { type: "unavailable", message: "timeout" } });
    const result = await corroborateUnreadable("https://maa.org/amc", [{ url: "https://maa.org/amc", error: "403" }]);
    expect(result.corroborated).toBe(true);
    expect(result.falsified).toBe(false);
  });

  test("neither signal available -- uncorroborated (assumption A11's weaker outcome), never silently treated as corroborated", async () => {
    fetchProviderJsonMock.mockResolvedValue({ success: false, error: { type: "unavailable", message: "timeout" } });
    const result = await corroborateUnreadable("https://example.com", []);
    expect(result.corroborated).toBe(false);
    expect(result.falsified).toBe(false);
  });
});
