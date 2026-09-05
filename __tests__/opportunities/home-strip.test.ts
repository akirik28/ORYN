import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  HOME_STRIP_SIZE,
  MIN_CARDS_TO_ANIMATE,
  getHomeOpportunityStrip,
  selectHomeStripCandidates,
  shouldAnimateStrip,
} from "@/lib/opportunities/home-strip";

describe("shouldAnimateStrip", () => {
  test("false below MIN_CARDS_TO_ANIMATE — a static row, not a loop with nothing to loop into", () => {
    expect(shouldAnimateStrip(0)).toBe(false);
    expect(shouldAnimateStrip(MIN_CARDS_TO_ANIMATE - 1)).toBe(false);
  });

  test("true at and above MIN_CARDS_TO_ANIMATE", () => {
    expect(shouldAnimateStrip(MIN_CARDS_TO_ANIMATE)).toBe(true);
    expect(shouldAnimateStrip(HOME_STRIP_SIZE)).toBe(true);
  });
});

function opportunity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Opportunity ${id}`,
    organization: "Test Org",
    category: "competition" as const,
    image_url: null,
    deadline: null,
    cycle_status: "open" as const,
    current_cycle_label: null,
    selectivity_tier: "selective" as const,
    status: "active" as const,
    cost: 0,
    last_verified_at: "2026-08-01T00:00:00Z",
    verified_at: "2026-08-01T00:00:00Z",
    source_verified_at: null,
    ...overrides,
  };
}

function match(opportunityId: string, matchScore: number, eligibilityNotes: unknown[] | null = []) {
  return { opportunity_id: opportunityId, match_score: matchScore, eligibility_notes: eligibilityNotes };
}

describe("selectHomeStripCandidates", () => {
  test("joins matches to opportunities, preserving the match array's own ranked order", () => {
    const matches = [match("opp-2", 90), match("opp-1", 70)];
    const opportunities = [opportunity("opp-1"), opportunity("opp-2")];
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result.map((r) => r.id)).toEqual(["opp-2", "opp-1"]);
  });

  test("excludes a non-actionable opportunity (closed cycle) even though its match row is present", () => {
    const matches = [match("opp-1", 90), match("opp-2", 70)];
    const opportunities = [opportunity("opp-1", { cycle_status: "closed", deadline: null }), opportunity("opp-2")];
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result.map((r) => r.id)).toEqual(["opp-2"]);
  });

  test("excludes a pay-to-enroll opportunity (high cost + no real selectivity)", () => {
    const matches = [match("opp-1", 90), match("opp-2", 70)];
    const opportunities = [opportunity("opp-1", { cost: 5000, selectivity_tier: "open" }), opportunity("opp-2")];
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result.map((r) => r.id)).toEqual(["opp-2"]);
  });

  test("skips a match whose opportunity row never arrived (filtered out upstream, or genuinely missing)", () => {
    const matches = [match("opp-1", 90), match("opp-ghost", 80)];
    const opportunities = [opportunity("opp-1")];
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result.map((r) => r.id)).toEqual(["opp-1"]);
  });

  test("slices to HOME_STRIP_SIZE even when more candidates survive", () => {
    const matches = Array.from({ length: HOME_STRIP_SIZE + 5 }, (_, i) => match(`opp-${i}`, 100 - i));
    const opportunities = Array.from({ length: HOME_STRIP_SIZE + 5 }, (_, i) => opportunity(`opp-${i}`));
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result).toHaveLength(HOME_STRIP_SIZE);
    expect(result.map((r) => r.id)).toEqual(Array.from({ length: HOME_STRIP_SIZE }, (_, i) => `opp-${i}`));
  });

  test("never pads below HOME_STRIP_SIZE — fewer survivors means fewer cards, not fabricated ones", () => {
    const matches = [match("opp-1", 90)];
    const opportunities = [opportunity("opp-1")];
    expect(selectHomeStripCandidates(matches, opportunities)).toHaveLength(1);
    expect(selectHomeStripCandidates([], [])).toHaveLength(0);
  });

  // 2026-09-03 (eligibility_notes -> codes): this surface never rendered the note's own
  // text, only whether one exists (see HomeStripOpportunity's own comment) — the field is a
  // presence flag now, not a pass-through, so this covers empty, non-empty, and the
  // defensive not-an-array case (an unmigrated environment still returning the old text
  // column) rather than the boolean collapsing every real shape to the same assertion.
  test("eligibilityNotes is true only when the stored code array is genuinely non-empty", () => {
    const matches = [
      match("opp-1", 90, []),
      match("opp-2", 80, [{ code: "country_eligibility_unverified" }]),
      match("opp-3", 70, null),
    ];
    const opportunities = [opportunity("opp-1"), opportunity("opp-2"), opportunity("opp-3")];
    const result = selectHomeStripCandidates(matches, opportunities);
    expect(result.find((r) => r.id === "opp-1")?.eligibilityNotes).toBe(false);
    expect(result.find((r) => r.id === "opp-2")?.eligibilityNotes).toBe(true);
    expect(result.find((r) => r.id === "opp-3")?.eligibilityNotes).toBe(false);
  });
});

/**
 * 2026-09-05 (ranking-tiebreaker fix, CEO/oryn-5b dispatch): docs/home-strip-ranking-stability-
 * 2026-09-04.md found this query had zero secondary sort key on `match_score` — 191 rows tied
 * at one student's own rank-5 boundary score, empirically stable that night only because
 * nothing had written to the table (an index scan over a quiescent table preserves physical
 * leaf order; that's an accident of the plan, not a guarantee the query asks for). This is a
 * genuine gap in getHomeOpportunityStrip specifically, not selectHomeStripCandidates (that pure
 * function only ever preserves whatever order its `matches` argument already arrives in — see
 * its own tests above) — so it can only be caught by asserting on the actual query construction,
 * not on selectHomeStripCandidates's join/filter behavior. Hand-rolled vi.fn() chain, not
 * __tests__/stubs/mock-supabase-table.ts: that harness treats `.order()` as an intentional
 * no-op ("nothing under test depends on ordering correctness") — this is the first test where
 * something does. Modeled on __tests__/scoring/monthly-review.test.ts's own per-table builder.
 *
 * Proved red first: before the fix landed, `.order.mock.calls` held exactly one entry
 * (`["match_score", { ascending: false }]`) and this test failed on the `toHaveLength(2)`
 * assertion below — confirming the test can actually catch the regression it's named for,
 * not just describe the fixed behavior in prose.
 */
describe("getHomeOpportunityStrip — query construction", () => {
  test("orders by match_score, then by a second, genuinely unique column — a real tiebreaker, not just a second call", async () => {
    const orderSpy = vi.fn(() => matchesBuilder);
    const matchesBuilder = {
      select: () => matchesBuilder,
      eq: () => matchesBuilder,
      order: orderSpy,
      limit: () => Promise.resolve({ data: [], error: null }),
    };
    const opportunitiesBuilder = {
      select: () => opportunitiesBuilder,
      in: () => opportunitiesBuilder,
      eq: () => Promise.resolve({ data: [], error: null }),
    };
    const from = vi.fn((table: string) => {
      if (table === "opportunity_matches") return matchesBuilder;
      if (table === "opportunities") return opportunitiesBuilder;
      throw new Error(`unexpected table in test fixture: ${table}`);
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    await getHomeOpportunityStrip(supabase, "student-1");

    expect(orderSpy.mock.calls).toHaveLength(2);
    expect(orderSpy.mock.calls[0]).toEqual(["match_score", { ascending: false }]);
    const [secondColumn] = orderSpy.mock.calls[1] as unknown as [string, unknown];
    expect(secondColumn).not.toBe("match_score");
    expect(["id", "created_at"]).toContain(secondColumn);
  });
});
