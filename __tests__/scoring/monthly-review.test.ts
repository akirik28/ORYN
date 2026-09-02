import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-02 progress/history audit (Phase 40): getMonthlyReview had zero test coverage —
 * everything downstream (progress-view.tsx) trusts its `hasHistory` branch and its
 * per-dimension deltas without either ever having been pinned. Confirmed against live data
 * first (26 real snapshots across 8 students) that this function's actual behavior — real
 * before/after per dimension, not a bare current-value snapshot — matches what
 * lib/scoring/monthly-review.ts's own header comment claims; this locks the two properties
 * that claim depends on.
 */

const CURRENT_SCORES = [
  { dimension: "research", score: 58, confidence: "medium", reason_codes: [{ code: "research_experience", detail: "x" }] },
  { dimension: "leadership", score: 91, confidence: "high", reason_codes: [{ code: "leadership_role", detail: "y" }] },
];

function makeSupabase(opts: { baselineSnapshot: { overall_score: number; dimension_scores: Record<string, number> } | null; projectsCount?: number; applicationsCount?: number }) {
  const from = vi.fn((table: string) => {
    if (table === "profile_scores") {
      return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: CURRENT_SCORES, error: null })) })) };
    }
    if (table === "profile_score_snapshots") {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(() => Promise.resolve({ data: opts.baselineSnapshot, error: null })),
      };
      return builder;
    }
    if (table === "projects") {
      const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), gte: vi.fn(() => Promise.resolve({ count: opts.projectsCount ?? 0, error: null })) };
      return builder;
    }
    if (table === "applications") {
      const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), in: vi.fn(() => builder), gte: vi.fn(() => Promise.resolve({ count: opts.applicationsCount ?? 0, error: null })) };
      return builder;
    }
    throw new Error(`unexpected table in test fixture: ${table}`);
  });
  return { from } as unknown as SupabaseClient<Database>;
}

import { getMonthlyReview } from "@/lib/scoring/monthly-review";

describe("getMonthlyReview", () => {
  test("no snapshot from 30+ days ago: hasHistory is false, not a false '0 change'", async () => {
    const supabase = makeSupabase({ baselineSnapshot: null });
    const review = await getMonthlyReview(supabase, "student-1");

    expect(review.hasHistory).toBe(false);
    expect(review.dimensionDeltas).toEqual([]);
    // Current scores are still surfaced (signal/overallAfter) even with no history to diff
    // against -- "no baseline" must not also mean "no current read".
    expect(review.overallAfter).toBe(Math.round((58 + 91) / 2));
  });

  test("a real baseline: shows genuine before/after movement per dimension, not just a current value", async () => {
    const supabase = makeSupabase({ baselineSnapshot: { overall_score: 50, dimension_scores: { research: 42, leadership: 91 } } });
    const review = await getMonthlyReview(supabase, "student-1");

    expect(review.hasHistory).toBe(true);
    const research = review.dimensionDeltas.find((d) => d.dimension === "research");
    const leadership = review.dimensionDeltas.find((d) => d.dimension === "leadership");
    expect(research).toEqual({ dimension: "research", before: 42, after: 58, delta: 16 });
    expect(leadership).toEqual({ dimension: "leadership", before: 91, after: 91, delta: 0 });
  });

  test("deltas are sorted by magnitude of movement, largest first — the point of the whole page is naming what moved most", async () => {
    const supabase = makeSupabase({ baselineSnapshot: { overall_score: 50, dimension_scores: { research: 42, leadership: 91 } } });
    const review = await getMonthlyReview(supabase, "student-1");

    expect(review.dimensionDeltas[0].dimension).toBe("research"); // |16| > |0|
  });

  test("a dimension present in the baseline but absent from current scores is dropped, not shown as a false decline to 0", async () => {
    const supabase = makeSupabase({ baselineSnapshot: { overall_score: 50, dimension_scores: { research: 42, leadership: 91, awards_distinction: 30 } } });
    const review = await getMonthlyReview(supabase, "student-1");

    expect(review.dimensionDeltas.find((d) => d.dimension === "awards_distinction")).toBeUndefined();
  });

  test("projects completed and applications submitted pass through as their own counts, matching Phase 40's own example shape", async () => {
    const supabase = makeSupabase({ baselineSnapshot: null, projectsCount: 1, applicationsCount: 2 });
    const review = await getMonthlyReview(supabase, "student-1");

    expect(review.projectsCompletedRecently).toBe(1);
    expect(review.applicationsSubmittedRecently).toBe(2);
  });
});
