import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/digest/build.ts — content assembly for the periodic email digest
 * (docs/digest-email-design-2026-09-03.md). getUpcomingDeadlines is mocked directly rather
 * than re-simulated from raw tables — it already has its own coverage
 * (__tests__/deadlines/upcoming.test.ts); this suite's job is proving buildDigestContent
 * wires it correctly and gets the opportunity-match half (built fresh in this file, no
 * existing helper to reuse) right, not re-proving deadline logic that's tested elsewhere.
 */

interface MatchRow {
  opportunity_id: string;
  calculated_at: string;
  user_id: string;
  eligible: boolean;
}
interface OpportunityRow {
  id: string;
  title: string;
  organization: string | null;
  official_url: string | null;
  application_url: string | null;
}

const { getUpcomingDeadlinesMock, matchesRef, opportunitiesRef } = vi.hoisted(() => ({
  getUpcomingDeadlinesMock: vi.fn(),
  matchesRef: { current: [] as MatchRow[] },
  opportunitiesRef: { current: [] as OpportunityRow[] },
}));

vi.mock("@/lib/deadlines/upcoming", () => ({ getUpcomingDeadlines: getUpcomingDeadlinesMock }));

function fakeSupabase() {
  return {
    from: (table: string) => {
      if (table === "opportunity_matches") {
        return {
          select: () => {
            let rows = matchesRef.current;
            // .limit() deliberately does NOT resolve immediately — the real Supabase builder
            // stays chainable after .limit() too (call order between filters doesn't matter),
            // so this mock's .limit() just records the cap and returns `chain`, the same as
            // every other filter method. Only `then` (i.e. actually awaiting the chain, as
            // `await query` does in build.ts) resolves to the filtered rows.
            let limit: number | null = null;
            const chain: Record<string, unknown> = {
              eq: (col: string, value: unknown) => {
                rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[col] === value);
                return chain;
              },
              gt: (col: string, value: string) => {
                rows = rows.filter((r) => (r as unknown as Record<string, string>)[col] > value);
                return chain;
              },
              order: () => chain,
              limit: (n: number) => {
                limit = n;
                return chain;
              },
              then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: limit !== null ? rows.slice(0, limit) : rows, error: null }).then(resolve),
            };
            return chain;
          },
        };
      }
      if (table === "opportunities") {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({ data: opportunitiesRef.current.filter((o) => ids.includes(o.id)), error: null }),
          }),
        };
      }
      throw new Error(`fakeSupabase: unhandled table "${table}"`);
    },
  } as never;
}

beforeEach(() => {
  getUpcomingDeadlinesMock.mockReset();
  getUpcomingDeadlinesMock.mockResolvedValue([]);
  matchesRef.current = [];
  opportunitiesRef.current = [];
});

describe("buildDigestContent", () => {
  test("returns null when there are no deadlines and no new matches — an empty digest is worse than none", async () => {
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", null);
    expect(content).toBeNull();
  });

  test("returns deadlines from getUpcomingDeadlines, mapped to the digest's own item shape", async () => {
    getUpcomingDeadlinesMock.mockResolvedValue([{ id: "d-1", source: "application", title: "Economics Challenge", date: "2026-09-20", href: "/applications/d-1" }]);
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", null);
    expect(content).not.toBeNull();
    expect(content!.deadlines).toEqual([{ title: "Economics Challenge", date: "2026-09-20", href: "/applications/d-1" }]);
  });

  test("a null lastDigestSentAt (never sent before) includes every currently-eligible match, not zero", async () => {
    matchesRef.current = [{ opportunity_id: "o-1", calculated_at: "2026-09-01T00:00:00Z", user_id: "u-1", eligible: true }];
    opportunitiesRef.current = [{ id: "o-1", title: "Youth Research Fellowship", organization: "OECD Youth Lab", official_url: "https://example.org/fellowship", application_url: null }];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", null);
    expect(content!.newMatches).toEqual([{ title: "Youth Research Fellowship", organization: "OECD Youth Lab", href: "https://example.org/fellowship" }]);
  });

  test("a match calculated before lastDigestSentAt is excluded — only genuinely new matches render", async () => {
    matchesRef.current = [{ opportunity_id: "o-old", calculated_at: "2026-08-01T00:00:00Z", user_id: "u-1", eligible: true }];
    opportunitiesRef.current = [{ id: "o-old", title: "Old Match", organization: null, official_url: null, application_url: null }];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", "2026-09-01T00:00:00Z");
    expect(content).toBeNull(); // no deadlines mocked, and the one match is filtered out as not-new
  });

  test("a match calculated after lastDigestSentAt is included", async () => {
    matchesRef.current = [{ opportunity_id: "o-new", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
    opportunitiesRef.current = [{ id: "o-new", title: "New Match", organization: null, official_url: null, application_url: null }];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", "2026-09-01T00:00:00Z");
    expect(content!.newMatches.map((m) => m.title)).toEqual(["New Match"]);
  });
});
