import { describe, expect, test } from "vitest";
import { HOME_STRIP_SIZE, MIN_CARDS_TO_ANIMATE, selectHomeStripCandidates, shouldAnimateStrip } from "@/lib/opportunities/home-strip";

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
