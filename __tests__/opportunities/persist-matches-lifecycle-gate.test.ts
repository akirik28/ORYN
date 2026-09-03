import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 2026-09-03 (docs/vacuous-gate-test-sweep-2026-09-03.md): filterActionableOpportunities
 * (lib/opportunities/lifecycle.ts) runs at the top of refreshOpportunityMatches, with its
 * own comment stating the job plainly — "A cycle that has closed... must stop producing
 * fresh matches, even though `status` stays `active`." Neither of the other two files
 * touching this function (refresh-matches-confidence-degradation.test.ts, scoped to the
 * migration-0086 upsert degrade; refresh-matches-no-session.test.ts, scoped to the
 * session/client-parameter question) constructs a closed-cycle or past-deadline
 * opportunity, so nothing previously proved this specific behavior. This file does, and the
 * exclusion is verified by inspecting the actual upsert payload — not by trusting that a
 * function which reads `filterActionableOpportunities` must therefore be calling it
 * correctly — the same standard __tests__/counselor/state-lifecycle-gate.test.ts already
 * set for the sibling bug in the same sweep.
 *
 * Verified to actually fail: removing lib/opportunities/persist-matches.ts's
 * `filterActionableOpportunities(...)` call (restoring the bare `readOr(...)` result) turns
 * the first test below red — both opportunities reach the upsert — before being reverted.
 */

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

/** Same base shape as refresh-matches-confidence-degradation.test.ts's own
 *  sessionClientWithOneOpportunity — reused rather than reinvented, extended to two rows so
 *  the gate has something real to discriminate between. */
function baseOpportunity(overrides: Record<string, unknown>) {
  return {
    category: "research",
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    eligible_citizenships: [],
    eligible_grades: [],
    country_eligibility_confirmed_open: true,
    citizenship_restrictions: null,
    residency_restrictions: null,
    fields: [],
    country: null,
    status: "active",
    cycle_status: "open",
    deadline: null,
    ...overrides,
  };
}

function sessionClientWithTwoOpportunities(opportunities: Record<string, unknown>[]) {
  return {
    from: (table: string) => {
      if (table === "profiles") {
        return chainable({ data: { id: "student-1", birth_year: 2009, country: "United States", citizenship_countries: [], graduation_year: 2027, preferred_language: "en" }, error: null });
      }
      if (table === "opportunities") {
        return chainable({ data: opportunities, error: null });
      }
      return chainable({ data: [], error: null });
    },
  };
}

const { getProfileScoresMock, tryCreateAdminClientMock, createClientMock, upsertSpy } = vi.hoisted(() => ({
  getProfileScoresMock: vi.fn().mockResolvedValue([]),
  tryCreateAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
  upsertSpy: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@/lib/security/dal", () => ({ getProfileScores: getProfileScoresMock }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));

import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  getProfileScoresMock.mockClear();
  tryCreateAdminClientMock.mockReset();
  createClientMock.mockReset();
  upsertSpy.mockClear();
  tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: upsertSpy }) });
});

describe("refreshOpportunityMatches — the lifecycle gate stops a closed/expired cycle from getting a fresh match", () => {
  test("a closed-cycle opportunity never reaches the upsert; an open one alongside it does", async () => {
    createClientMock.mockResolvedValue(
      sessionClientWithTwoOpportunities([
        baseOpportunity({ id: "opp-closed", title: "Closed Cycle Programme", cycle_status: "closed" }),
        baseOpportunity({ id: "opp-open", title: "Open Programme" }),
      ])
    );

    await refreshOpportunityMatches(USER_ID);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const rows = upsertSpy.mock.calls[0]![0] as Array<{ opportunity_id: string }>;
    const upsertedIds = rows.map((r) => r.opportunity_id);
    expect(upsertedIds).toContain("opp-open");
    expect(upsertedIds).not.toContain("opp-closed");
  });

  test("a past-deadline opportunity is excluded the same way, even with an open cycle_status", async () => {
    createClientMock.mockResolvedValue(
      sessionClientWithTwoOpportunities([
        baseOpportunity({ id: "opp-past", title: "Past Deadline Programme", deadline: "2020-01-01" }),
        baseOpportunity({ id: "opp-future", title: "Future Deadline Programme", deadline: "2099-01-01" }),
      ])
    );

    await refreshOpportunityMatches(USER_ID);

    const rows = upsertSpy.mock.calls[0]![0] as Array<{ opportunity_id: string }>;
    const upsertedIds = rows.map((r) => r.opportunity_id);
    expect(upsertedIds).toContain("opp-future");
    expect(upsertedIds).not.toContain("opp-past");
  });

  test("all candidates closed: refreshed: true, and the upsert is never called at all — the documented zero-opportunities early return", async () => {
    createClientMock.mockResolvedValue(sessionClientWithTwoOpportunities([baseOpportunity({ id: "opp-closed", title: "Closed Cycle Programme", cycle_status: "closed" })]));

    const result = await refreshOpportunityMatches(USER_ID);

    expect(result).toEqual({ refreshed: true });
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
