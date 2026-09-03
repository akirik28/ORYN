import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * recheckProvider (app/(app)/admin/actions.ts) — had zero server-side test coverage before
 * this (only provider-recheck-button.test.tsx, which mocks this action away entirely rather
 * than testing it). Rewritten 2026-09-03 to remove its own `isConfigured()`/`isAIConfigured()`
 * pre-checks — those were a SECOND, earlier short-circuit that returned `{notConfigured:true}`
 * before ever reaching the provider methods this session just taught to record
 * provider_health on that exact branch, so the recheck button's own path would have kept
 * writing nothing even after lib/providers/tavily.ts etc. were fixed. These tests pin the
 * new behavior: recheckProvider now calls straight into each provider method and reads
 * `result.error.type`/the thrown error's type, so there is exactly one place "not
 * configured" gets decided, and it's the same place that already records it.
 */

vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { tavilySearchMock, collegeScorecardSearchMock, generateTextMock } = vi.hoisted(() => ({
  tavilySearchMock: vi.fn(),
  collegeScorecardSearchMock: vi.fn(),
  generateTextMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: tavilySearchMock } }));
vi.mock("@/lib/providers/college-scorecard", () => ({ collegeScorecardProvider: { searchByName: collegeScorecardSearchMock } }));
vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
  return { ...actual, getAIProvider: () => ({ generateText: generateTextMock }) };
});

import { recheckProvider } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";
import { AIProviderNotConfiguredError } from "@/lib/ai";

const ADMIN_PROFILE = { id: "admin-1", display_name: "Ada", is_admin: true };

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_PROFILE as never);
  tavilySearchMock.mockReset();
  collegeScorecardSearchMock.mockReset();
  generateTextMock.mockReset();
});

describe("recheckProvider — tavily", () => {
  test("not configured -- the provider's own error.type, not a separate pre-check -- reports notConfigured", async () => {
    tavilySearchMock.mockResolvedValue({ success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } });
    expect(await recheckProvider("tavily")).toEqual({ notConfigured: true });
  });

  test("a real failure (key present but rejected) reports the error message, not notConfigured", async () => {
    tavilySearchMock.mockResolvedValue({ success: false, error: { type: "auth_failed", message: "tavily rejected the API credential (HTTP 401)." } });
    expect(await recheckProvider("tavily")).toEqual({ error: "tavily rejected the API credential (HTTP 401)." });
  });

  test("success reports neither field", async () => {
    tavilySearchMock.mockResolvedValue({ success: true, data: [] });
    expect(await recheckProvider("tavily")).toEqual({});
  });
});

describe("recheckProvider — college_scorecard", () => {
  test("not configured reports notConfigured", async () => {
    collegeScorecardSearchMock.mockResolvedValue({ success: false, error: { type: "not_configured", message: "COLLEGE_SCORECARD_API_KEY is not set." } });
    expect(await recheckProvider("college_scorecard")).toEqual({ notConfigured: true });
  });

  test("a real failure reports the error message", async () => {
    collegeScorecardSearchMock.mockResolvedValue({ success: false, error: { type: "unavailable", message: "College Scorecard returned HTTP 500." } });
    expect(await recheckProvider("college_scorecard")).toEqual({ error: "College Scorecard returned HTTP 500." });
  });
});

describe("recheckProvider — anthropic", () => {
  test("AIProviderNotConfiguredError thrown by generateText maps to notConfigured, not a generic error message", async () => {
    generateTextMock.mockRejectedValue(new AIProviderNotConfiguredError());
    expect(await recheckProvider("anthropic")).toEqual({ notConfigured: true });
  });

  test("a real transport failure still reports as a generic error, not notConfigured", async () => {
    generateTextMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    expect(await recheckProvider("anthropic")).toEqual({ error: "connect ECONNREFUSED" });
  });

  test("success reports neither field", async () => {
    generateTextMock.mockResolvedValue({ text: "OK", usage: { inputTokens: 5, outputTokens: 1 }, model: "claude-sonnet-5" });
    expect(await recheckProvider("anthropic")).toEqual({});
  });
});

test("requires admin before doing anything else", async () => {
  vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("not an admin"));
  await expect(recheckProvider("tavily")).rejects.toThrow("not an admin");
  expect(tavilySearchMock).not.toHaveBeenCalled();
});
