import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { categorizeAiFeature, cumulativeByUtcDay } from "@/lib/admin/queries";

/**
 * Unit coverage for the two pure-logic pieces of the 2026-09-02 AI-spend deep-dive
 * (oryn-a7's dispatch) — categorizeAiFeature and cumulativeByUtcDay. Everything else added
 * alongside them (getSpendSummary's extensions, getJobBudgetStatus, getDegradeStanding)
 * reads a real Supabase client and is deliberately left untested, matching this file's own
 * established boundary: __tests__/admin/exchange-rate.test.ts's header names it directly —
 * "no test file exercises getSpendSummary/getPerUserSpend/getRemainingCredit directly...
 * matching this codebase's established practice of not unit-testing thin DB-read wrappers."
 * These two functions are the exception for the same reason that one is: real logic with no
 * I/O, worth pinning directly rather than trusting by inspection.
 */

describe("categorizeAiFeature — the shape docs/ai-cost-at-scale-2026-09-02.md §2 names", () => {
  test.each([
    "advisor_chat",
    "research_generator",
    "weekly_plan",
    "cv_extraction",
    "achievement_refinement",
    "counselor_explanation",
    "essay_story_bank",
  ])("%s is student_pool", (feature) => {
    expect(categorizeAiFeature(feature)).toBe("student_pool");
  });

  test.each(["opportunity_extraction", "requirement_extraction"])("%s is job_budgeted", (feature) => {
    expect(categorizeAiFeature(feature)).toBe("job_budgeted");
  });

  test("requirement_interpretation is admin_only", () => {
    expect(categorizeAiFeature("requirement_interpretation")).toBe("admin_only");
  });

  test("an unknown feature string falls to uncategorized rather than throwing or silently matching one of the three", () => {
    expect(categorizeAiFeature("some_future_feature_nobody_added_yet")).toBe("uncategorized");
  });
});

describe("cumulativeByUtcDay — the burn-chart series feeding getJobBudgetStatus", () => {
  const SINCE = "2026-09-01T00:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("one point per UTC day from sinceIso through today, inclusive — three days, three points", () => {
    const series = cumulativeByUtcDay([], SINCE);
    expect(series.map((p) => p.x)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  test("no rows at all -- every day is a real, known zero, not a missing point", () => {
    const series = cumulativeByUtcDay([], SINCE);
    expect(series.every((p) => p.y === 0)).toBe(true);
  });

  test("running total accumulates across days rather than resetting", () => {
    const series = cumulativeByUtcDay(
      [
        { estimated_cost: 5, created_at: "2026-09-01T10:00:00.000Z" },
        { estimated_cost: 3, created_at: "2026-09-02T10:00:00.000Z" },
      ],
      SINCE,
    );
    expect(series).toEqual([
      { x: "2026-09-01", y: 5 },
      { x: "2026-09-02", y: 8 },
      { x: "2026-09-03", y: 8 }, // forward-filled: a real, known "no new spend," not a gap
    ]);
  });

  test("multiple rows the same day sum before the day boundary advances", () => {
    const series = cumulativeByUtcDay(
      [
        { estimated_cost: 1, created_at: "2026-09-01T01:00:00.000Z" },
        { estimated_cost: 2, created_at: "2026-09-01T23:00:00.000Z" },
      ],
      SINCE,
    );
    expect(series[0]).toEqual({ x: "2026-09-01", y: 3 });
  });

  test("a null estimated_cost is excluded from the sum, not treated as $0 -- an unpriced row must not silently understate the running total", () => {
    const series = cumulativeByUtcDay(
      [
        { estimated_cost: 5, created_at: "2026-09-01T10:00:00.000Z" },
        { estimated_cost: null, created_at: "2026-09-02T10:00:00.000Z" },
      ],
      SINCE,
    );
    expect(series.map((p) => p.y)).toEqual([5, 5, 5]);
  });

  test("sinceIso equal to today -- a single-point series, not an off-by-one empty array", () => {
    const series = cumulativeByUtcDay([{ estimated_cost: 2, created_at: "2026-09-03T01:00:00.000Z" }], "2026-09-03T00:00:00.000Z");
    expect(series).toEqual([{ x: "2026-09-03", y: 2 }]);
  });
});
