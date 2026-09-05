import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/digest/build.ts — content assembly for the periodic email digest
 * (docs/digest-email-design-2026-09-03.md). getUpcomingDeadlines is mocked directly rather
 * than re-simulated from raw tables — it already has its own coverage
 * (__tests__/deadlines/upcoming.test.ts); this suite's job is proving buildDigestContent
 * wires it correctly and gets the opportunity-match half (built fresh in this file, no
 * existing helper to reuse) right, not re-proving deadline logic that's tested elsewhere.
 *
 * 2026-09-03: this file previously had no recommendable/commercial gate at all — every
 * fixture below defaults to a passing shape (`recommendableOpportunity`) so existing cases
 * keep testing what they always tested, and the new cases below specifically construct a
 * failing shape to prove the gate now excludes it. See lib/digest/build.ts's own header for
 * the measured live numbers (382/1,809, 21.1%) this fixes.
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
  status: string;
  cycle_status: string;
  deadline: string | null;
  last_verified_at: string | null;
  verified_at: string | null;
  source_verified_at: string | null;
  cost: number | null;
  selectivity_tier: string;
}

/** A row that passes both isOpportunityRecommendable and competesInCoreRecommendations —
 * the baseline every fixture below starts from, overridden per-field where a test needs a
 * specific failure shape. `cost: null` alone passes the commercial gate (judgePayToEnroll
 * treats a null cost as `cost_unverified`, mapped to `not_pay_to_enroll` — see
 * lib/opportunities/commercial.ts), so selectivity_tier's exact value is unused here. */
function recommendableOpportunity(overrides: Partial<OpportunityRow> & { id: string; title: string }): OpportunityRow {
  return {
    organization: null,
    official_url: null,
    application_url: null,
    status: "active",
    cycle_status: "open",
    deadline: null,
    last_verified_at: "2026-08-01T00:00:00Z",
    verified_at: null,
    source_verified_at: null,
    cost: null,
    selectivity_tier: "unknown",
    ...overrides,
  };
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
    opportunitiesRef.current = [recommendableOpportunity({ id: "o-1", title: "Youth Research Fellowship", organization: "OECD Youth Lab", official_url: "https://example.org/fellowship" })];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", null);
    expect(content!.newMatches).toEqual([{ title: "Youth Research Fellowship", organization: "OECD Youth Lab", href: "https://example.org/fellowship", deadline: null }]);
  });

  test("a match calculated before lastDigestSentAt is excluded — only genuinely new matches render", async () => {
    matchesRef.current = [{ opportunity_id: "o-old", calculated_at: "2026-08-01T00:00:00Z", user_id: "u-1", eligible: true }];
    opportunitiesRef.current = [recommendableOpportunity({ id: "o-old", title: "Old Match" })];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", "2026-09-01T00:00:00Z");
    expect(content).toBeNull(); // no deadlines mocked, and the one match is filtered out as not-new
  });

  test("a match calculated after lastDigestSentAt is included", async () => {
    matchesRef.current = [{ opportunity_id: "o-new", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
    opportunitiesRef.current = [recommendableOpportunity({ id: "o-new", title: "New Match" })];
    const { buildDigestContent } = await import("@/lib/digest/build");
    const content = await buildDigestContent(fakeSupabase(), "u-1", "2026-09-01T00:00:00Z");
    expect(content!.newMatches.map((m) => m.title)).toEqual(["New Match"]);
  });

  /**
   * 2026-09-03: the real bug. This file applied neither isOpportunityRecommendable nor
   * competesInCoreRecommendations — measured live, 382 of 1,809 eligible match rows (21.1%,
   * all 8 onboarded accounts) pointed at an opportunity failing the gate, meaning roughly one
   * digest slot in five was a dead record with no caveat the student could see before
   * clicking a passed deadline.
   */
  describe("the recommendable gate (lib/opportunities/lifecycle.ts) — the actual fix", () => {
    test("a disabled opportunity is excluded even though its match row is eligible and new", async () => {
      matchesRef.current = [{ opportunity_id: "o-disabled", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
      opportunitiesRef.current = [recommendableOpportunity({ id: "o-disabled", title: "Disabled Programme", status: "disabled" })];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content).toBeNull();
    });

    test("a closed-cycle opportunity is excluded — cycle_status, not just status", async () => {
      matchesRef.current = [{ opportunity_id: "o-closed", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
      opportunitiesRef.current = [recommendableOpportunity({ id: "o-closed", title: "Closed Cycle Programme", cycle_status: "closed" })];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content).toBeNull();
    });

    test("a past-deadline opportunity is excluded — the exact 'clicks a passed deadline' failure this closes", async () => {
      matchesRef.current = [{ opportunity_id: "o-past", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
      opportunitiesRef.current = [recommendableOpportunity({ id: "o-past", title: "Past Deadline Programme", deadline: "2020-01-01" })];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content).toBeNull();
    });

    test("a pay-to-enroll opportunity is excluded — this is a push surface, at least as assertive as the homepage card", async () => {
      matchesRef.current = [{ opportunity_id: "o-paid", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
      opportunitiesRef.current = [recommendableOpportunity({ id: "o-paid", title: "Pay To Enroll Camp", cost: 500, selectivity_tier: "open_enrollment" })];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content).toBeNull();
    });

    test("a selective programme with a real fee is NOT excluded — the pay-to-enroll gate exempts materially selective admissions", async () => {
      matchesRef.current = [{ opportunity_id: "o-selective", calculated_at: "2026-09-02T00:00:00Z", user_id: "u-1", eligible: true }];
      opportunitiesRef.current = [recommendableOpportunity({ id: "o-selective", title: "Selective Award", cost: 500, selectivity_tier: "highly_selective" })];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content!.newMatches.map((m) => m.title)).toEqual(["Selective Award"]);
    });

    /**
     * The other named judgment call: filter BEFORE the final limit, not after. 7 raw matches,
     * newest-first; the two newest fail the gate. Filtering a pre-truncated top-5 would yield
     * 3 (or fewer); filtering the full pool before slicing yields the real 5.
     */
    test("filters before limiting to 5 — a pre-truncated top-5 would under-fill the digest", async () => {
      const dates = ["2026-09-07", "2026-09-06", "2026-09-05", "2026-09-04", "2026-09-03", "2026-09-02", "2026-09-01"];
      matchesRef.current = dates.map((d, i) => ({ opportunity_id: `o-${i}`, calculated_at: `${d}T00:00:00Z`, user_id: "u-1", eligible: true }));
      opportunitiesRef.current = [
        recommendableOpportunity({ id: "o-0", title: "Newest, but disabled", status: "disabled" }),
        recommendableOpportunity({ id: "o-1", title: "Second newest, but closed cycle", cycle_status: "closed" }),
        recommendableOpportunity({ id: "o-2", title: "Good 1" }),
        recommendableOpportunity({ id: "o-3", title: "Good 2" }),
        recommendableOpportunity({ id: "o-4", title: "Good 3" }),
        recommendableOpportunity({ id: "o-5", title: "Good 4" }),
        recommendableOpportunity({ id: "o-6", title: "Good 5" }),
      ];
      const { buildDigestContent } = await import("@/lib/digest/build");
      const content = await buildDigestContent(fakeSupabase(), "u-1", null);
      expect(content!.newMatches.map((m) => m.title)).toEqual(["Good 1", "Good 2", "Good 3", "Good 4", "Good 5"]);
    });
  });
});
