import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/requirements/discover.ts — same fix and same reasoning as
 * __tests__/opportunities/discover-dedup-read-safety.test.ts (see that file's own header),
 * applied to the sibling pipeline: the existing-requirements read that feeds dedup must
 * throw on a real failure, not degrade to an empty comparison set that reads every
 * candidate as new.
 */

const { searchMock, extractMock, requirementsSelectMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
  requirementsSelectMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/requirement-extraction", () => ({ extractRequirementsFromContent: extractMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "university_requirements") {
        return { select: () => ({ eq: requirementsSelectMock }), insert: () => Promise.resolve({ data: { id: "req-1" }, error: null }) };
      }
      throw new Error(`discover-dedup-read-safety.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { discoverRequirementsForUniversity } from "@/lib/requirements/discover";

function tavilyResult(url: string) {
  return { url, content: `Content for ${url}`, raw_content: null };
}

const UNIVERSITY = { universityId: "univ-1", universityName: "Example University" };

beforeEach(() => {
  searchMock.mockReset();
  extractMock.mockReset();
  requirementsSelectMock.mockReset();
});

describe("discoverRequirementsForUniversity — the dedup read must throw on failure, not degrade to an empty set", () => {
  test("a real read error rejects the whole call, before any candidate is even extracted", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    requirementsSelectMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });

    await expect(discoverRequirementsForUniversity(UNIVERSITY)).rejects.toThrow(/failed to load existing requirements/);
    expect(extractMock).not.toHaveBeenCalled();
  });

  test("a clean read (even zero existing rows) behaves exactly as before -- the fix doesn't touch the real empty-catalog case", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidates: [{ category: "academic", title: "Minimum GPA", detail: "3.5 GPA required.", isRequired: true, structuredRule: null }], usage: { inputTokens: 10, outputTokens: 10 } });
    requirementsSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await discoverRequirementsForUniversity(UNIVERSITY);

    expect(result.requirementsStored).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
