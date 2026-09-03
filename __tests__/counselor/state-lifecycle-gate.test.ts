import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 2026-09-03: `getCounselorState`'s `eligibleOpportunityMatches` re-checked `status` and
 * `verification_state` (SQL-level `.eq()`s, unchanged by this fix) but never `cycle_status`
 * or `deadline` — the same half-a-rule gap lib/opportunities/lifecycle.ts's own header
 * documents happening to lib/opportunities/eligibility.ts, mirrored (that file kept the
 * cycle half and lost the deadline half; this one had neither). Measured live: 269 of 1,556
 * match rows passing the two existing `.eq()`s (17.3%, all 8 accounts) were closed/historical
 * cycles or already past deadline.
 *
 * Neither existing state.ts test file (state-skip-match-refresh.test.ts,
 * state-read-safety.test.ts) exercises eligibleOpportunityMatches with a real match+
 * opportunity pair — both use an empty [] fixture, which is why this gap survived without
 * either suite noticing. This file fills that gap directly.
 */

function chainable(result: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

interface OpportunityRow {
  id: string;
  status: string;
  cycle_status: string;
  deadline: string | null;
  verification_state: string;
}

function client(matchOpportunityIds: string[], opportunities: OpportunityRow[]) {
  return {
    from: (table: string) => {
      if (table === "profiles") return chainable({ data: { country: null, school_name: null, graduation_year: null, curriculum: null, headline: null, about: null }, error: null });
      if (table === "skills") return chainable({ data: null, error: null, count: 0 });
      if (table === "featured_items") return chainable({ data: null, error: null, count: 0 });
      if (table === "contact_info") return chainable({ data: null, error: null });
      if (table === "opportunity_matches") {
        return chainable({ data: matchOpportunityIds.map((id) => ({ opportunity_id: id, id: `m-${id}`, user_id: USER_ID, eligible: true })), error: null });
      }
      // The mock's `.eq()` is a no-op (see chainable above), same as this file's sibling
      // suites — the real status/verification_state SQL filters are unit-tested by their
      // own live-bug regression comments in state.ts, not re-simulated here. This fixture
      // returns exactly the rows those filters would have already let through, so the only
      // thing under test is the new TypeScript-level isOpportunityActionable filter.
      if (table === "opportunities") return chainable({ data: opportunities, error: null });
      return chainable({ data: [], error: null });
    },
  };
}

const USER_ID = "11111111-1111-1111-1111-111111111111";

const { buildStudentAdvisorContextMock } = vi.hoisted(() => ({ buildStudentAdvisorContextMock: vi.fn() }));
vi.mock("@/lib/ai/student-context", () => ({ buildStudentAdvisorContext: buildStudentAdvisorContextMock }));
vi.mock("@/lib/scoring/assemble-facts", () => ({ assembleScoringFacts: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/scoring/completeness", () => ({ getCompletenessChecklist: vi.fn().mockReturnValue([]) }));

import { getCounselorState } from "@/lib/counselor/state";

beforeEach(() => {
  buildStudentAdvisorContextMock.mockReset().mockResolvedValue({ student: { displayName: "Test", preferredLanguage: "en" }, targetUniversities: [] });
});

describe("getCounselorState — eligibleOpportunityMatches applies the lifecycle gate", () => {
  test("an active, open-cycle, no-deadline opportunity is kept — the ordinary case", async () => {
    const opp: OpportunityRow = { id: "o-open", status: "active", cycle_status: "open", deadline: null, verification_state: "verified_current" };
    const state = await getCounselorState(USER_ID, "en", client(["o-open"], [opp]) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches.map((e) => e.opportunity.id)).toEqual(["o-open"]);
  });

  test("a closed-cycle opportunity is excluded — the exact gap this fix closes", async () => {
    const opp: OpportunityRow = { id: "o-closed", status: "active", cycle_status: "closed", deadline: null, verification_state: "verified_current" };
    const state = await getCounselorState(USER_ID, "en", client(["o-closed"], [opp]) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches).toEqual([]);
  });

  test("a historical-cycle opportunity is excluded", async () => {
    const opp: OpportunityRow = { id: "o-hist", status: "active", cycle_status: "historical", deadline: null, verification_state: "verified_current" };
    const state = await getCounselorState(USER_ID, "en", client(["o-hist"], [opp]) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches).toEqual([]);
  });

  test("a past-deadline opportunity is excluded even with an open cycle_status", async () => {
    const opp: OpportunityRow = { id: "o-past", status: "active", cycle_status: "open", deadline: "2020-01-01", verification_state: "verified_current" };
    const state = await getCounselorState(USER_ID, "en", client(["o-past"], [opp]) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches).toEqual([]);
  });

  test("a future-deadline opportunity is kept", async () => {
    const opp: OpportunityRow = { id: "o-future", status: "active", cycle_status: "open", deadline: "2099-01-01", verification_state: "verified_current" };
    const state = await getCounselorState(USER_ID, "en", client(["o-future"], [opp]) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches.map((e) => e.opportunity.id)).toEqual(["o-future"]);
  });

  test("a mixed batch keeps only the actionable ones, in the same order they were fetched", async () => {
    const opps: OpportunityRow[] = [
      { id: "o-good-1", status: "active", cycle_status: "open", deadline: null, verification_state: "verified_current" },
      { id: "o-bad", status: "active", cycle_status: "discontinued", deadline: null, verification_state: "verified_current" },
      { id: "o-good-2", status: "active", cycle_status: "upcoming", deadline: "2099-06-01", verification_state: "verified_current" },
    ];
    const state = await getCounselorState(USER_ID, "en", client(["o-good-1", "o-bad", "o-good-2"], opps) as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches.map((e) => e.opportunity.id)).toEqual(["o-good-1", "o-good-2"]);
  });
});
