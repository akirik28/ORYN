import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * getParentPanelData's own job, distinct from lib/parent/child-panel.ts's seam test
 * (__tests__/parent/child-panel.test.ts covers "does state resolution collapse revoked into
 * active-but-empty" -- already green, not retested here): does the enrichment this file adds
 * on top of an "active" state actually resolve real names, given that
 * get_parent_child_target_universities/_applications (44, 2026-09-04) return bare
 * university_id/target_university_id FKs, never a joined name. Verified to actually fail:
 * temporarily hardcoding `name: ""` in enrichWithUniversityNames's return (skipping the
 * nameByUniversityId lookup) turns both "resolves a real name" assertions below red before
 * being reverted -- a test that only checked "the function doesn't throw" would have stayed
 * green through that.
 */

const { getParentChildPanelStateMock } = vi.hoisted(() => ({ getParentChildPanelStateMock: vi.fn() }));
vi.mock("@/lib/parent/child-panel", () => ({ getParentChildPanelState: getParentChildPanelStateMock }));

const { getProfileScoresMock } = vi.hoisted(() => ({ getProfileScoresMock: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/security/dal", () => ({ getProfileScores: getProfileScoresMock }));

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: fromMock }) }));

import { getParentPanelData } from "@/lib/parent/panel-data";

const STUDENT_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  getParentChildPanelStateMock.mockReset();
  getProfileScoresMock.mockClear();
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => {
    if (table === "opportunity_matches") return chainable({ data: [], error: null });
    if (table === "opportunities") return chainable({ data: [], error: null });
    if (table === "universities") {
      return chainable({
        data: [
          { id: "uni-lse", name: "London School of Economics" },
          { id: "uni-bocconi", name: "Bocconi University" },
        ],
        error: null,
      });
    }
    if (table === "target_universities") {
      return chainable({ data: [{ id: "target-bocconi", university_id: "uni-bocconi" }], error: null });
    }
    return chainable({ data: [], error: null });
  });
});

describe("getParentPanelData — enrichment on top of an active state", () => {
  test("resolves a real university name for a target university (one-hop join)", async () => {
    getParentChildPanelStateMock.mockResolvedValue({
      state: "active",
      profile: { display_name: "Ada" },
      targetUniversities: [{ id: "tu-1", university_id: "uni-lse", outlook: "reach", updated_at: "2026-09-01" }],
      applications: [],
    });

    const result = await getParentPanelData(STUDENT_ID);

    expect(result.state).toBe("active");
    if (result.state !== "active") throw new Error("unreachable");
    expect(result.data.universities).toEqual([{ id: "tu-1", name: "London School of Economics", outlook: "reach" }]);
  });

  test("resolves a real university name for an application via the two-hop join (target_university_id -> target_universities.university_id -> universities.name)", async () => {
    getParentChildPanelStateMock.mockResolvedValue({
      state: "active",
      profile: { display_name: "Ada" },
      targetUniversities: [],
      applications: [{ id: "app-1", target_university_id: "target-bocconi", status: "in_progress", deadline: null, updated_at: "2026-09-01" }],
    });

    const result = await getParentPanelData(STUDENT_ID);

    expect(result.state).toBe("active");
    if (result.state !== "active") throw new Error("unreachable");
    expect(result.data.applications).toEqual([{ id: "app-1", universityName: "Bocconi University", status: "in_progress", deadline: null }]);
  });

  test("a row whose university can't be resolved is dropped, not shown with a blank name", async () => {
    getParentChildPanelStateMock.mockResolvedValue({
      state: "active",
      profile: { display_name: "Ada" },
      targetUniversities: [{ id: "tu-orphan", university_id: "uni-does-not-exist", outlook: null, updated_at: "2026-09-01" }],
      applications: [],
    });

    const result = await getParentPanelData(STUDENT_ID);

    expect(result.state).toBe("active");
    if (result.state !== "active") throw new Error("unreachable");
    expect(result.data.universities).toEqual([]);
  });

  test("a non-active state short-circuits before any enrichment query runs", async () => {
    getParentChildPanelStateMock.mockResolvedValue({ state: "revoked" });

    const result = await getParentPanelData(STUDENT_ID);

    expect(result).toEqual({ state: "revoked" });
    expect(fromMock).not.toHaveBeenCalled();
    expect(getProfileScoresMock).not.toHaveBeenCalled();
  });

  /**
   * 2026-09-05 (ranking-tiebreaker fix, same root cause as
   * lib/opportunities/home-strip.ts's own fix this same night): fetchOpportunities orders its
   * opportunity_matches query by match_score alone too, then slices to 5 -- the exact same
   * "which of many tied rows survives the cutoff is undefined" shape, on a different surface
   * (the parent panel, not the student home strip). The shared `chainable()` builder above
   * treats `.order()` as a no-op by design (nothing else in this file depends on order), so
   * this test builds its own spied builder rather than extend that shared one.
   */
  test("orders opportunity_matches by match_score then a genuine tiebreaker, not match_score alone", async () => {
    getParentChildPanelStateMock.mockResolvedValue({
      state: "active",
      profile: { display_name: "Ada" },
      targetUniversities: [],
      applications: [],
    });

    const orderSpy = vi.fn(() => matchesBuilder);
    const matchesBuilder: Record<string, unknown> = {
      select: () => matchesBuilder,
      eq: () => matchesBuilder,
      order: orderSpy,
      limit: () => Promise.resolve({ data: [], error: null }),
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "opportunity_matches") return matchesBuilder;
      return chainable({ data: [], error: null });
    });

    await getParentPanelData(STUDENT_ID);

    expect(orderSpy.mock.calls).toHaveLength(2);
    expect(orderSpy.mock.calls[0]).toEqual(["match_score", { ascending: false }]);
    const [secondColumn] = orderSpy.mock.calls[1] as unknown as [string, unknown];
    expect(secondColumn).not.toBe("match_score");
  });
});
