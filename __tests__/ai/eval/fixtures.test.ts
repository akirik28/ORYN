import { describe, expect, test } from "vitest";
import { REGRESSION_CONTEXT, BASELINE_CONTEXT, REGRESSION_COUNSELOR_RESULT, REGRESSION_UNASSESSED_LABELS_EN, REGRESSION_UNASSESSED_LABELS_TR, FIXTURES } from "@/lib/ai/eval/fixtures";
import { isAssessed } from "@/lib/scoring/signal";
import { dimensionLabel } from "@/lib/scoring/labels";

/**
 * Sanity checks on the fixture data itself — not the harness logic (harness.test.ts covers
 * that). A fixture that silently stops actually exercising the scenario it's named for
 * (e.g. someone "fixes" REGRESSION_CONTEXT's academics score without noticing it was
 * supposed to stay unassessed) would make the whole package quietly stop testing anything,
 * with every other test still green.
 */

describe("REGRESSION_CONTEXT", () => {
  test("has at least one genuinely unassessed dimension (isAssessed false) — the fixture's whole point", () => {
    const unassessed = REGRESSION_CONTEXT.profileScores.filter((s) => !isAssessed(s.state));
    expect(unassessed.length).toBeGreaterThan(0);
  });

  test("REGRESSION_UNASSESSED_LABELS_EN/TR match the actual unassessed dimensions in the fixture, via the real dimensionLabel function — not hand-typed strings that could silently drift from it", () => {
    const unassessedDimensions = REGRESSION_CONTEXT.profileScores.filter((s) => !isAssessed(s.state)).map((s) => s.dimension);
    const expectedEn = unassessedDimensions.map((d) => dimensionLabel(d, "en")).sort();
    const expectedTr = unassessedDimensions.map((d) => dimensionLabel(d, "tr")).sort();
    expect([...REGRESSION_UNASSESSED_LABELS_EN].sort()).toEqual(expectedEn);
    expect([...REGRESSION_UNASSESSED_LABELS_TR].sort()).toEqual(expectedTr);
  });

  test("has a target university with the specific extreme_reach outlook CEO named", () => {
    expect(REGRESSION_CONTEXT.targetUniversities.some((t) => t.outlook === "extreme_reach")).toBe(true);
  });

  test("has a genuine Phase-39 occasion: at least one strong dimension and at least one weak/unassessed one, so 'discourage the strong-area activity' is the objectively correct answer", () => {
    const strong = REGRESSION_CONTEXT.profileScores.filter((s) => s.state === "strong");
    const weak = REGRESSION_CONTEXT.profileScores.filter((s) => s.state === "not_assessed" || s.state === "limited_evidence");
    expect(strong.length).toBeGreaterThan(0);
    expect(weak.length).toBeGreaterThan(0);
  });

  test("declares every one of the 9 ProfileDimension values exactly once — an omitted dimension would silently narrow what the raw-identifier check can ever observe in the assembled prompt", () => {
    const dims = REGRESSION_CONTEXT.profileScores.map((s) => s.dimension);
    expect(new Set(dims).size).toBe(9);
  });
});

describe("BASELINE_CONTEXT", () => {
  test("has no unassessed dimensions — the control case has nothing for the regression checks to catch", () => {
    const unassessed = BASELINE_CONTEXT.profileScores.filter((s) => !isAssessed(s.state));
    expect(unassessed).toHaveLength(0);
  });

  test("declares every one of the 9 ProfileDimension values exactly once", () => {
    const dims = BASELINE_CONTEXT.profileScores.map((s) => s.dimension);
    expect(new Set(dims).size).toBe(9);
  });
});

describe("REGRESSION_COUNSELOR_RESULT", () => {
  test("has both a 'do' and an 'avoid_for_now' recommendation — the shape counselor-explain needs to have anything to narrate a discourage-verdict about", () => {
    const classes = REGRESSION_COUNSELOR_RESULT.recommendations.map((r) => r.recommendationClass);
    expect(classes).toContain("do");
    expect(classes).toContain("avoid_for_now");
  });
});

describe("FIXTURES", () => {
  test("expectDiscourage matches each fixture's actual data shape", () => {
    const regression = FIXTURES.find((f) => f.id === "regression")!;
    const baseline = FIXTURES.find((f) => f.id === "baseline")!;
    expect(regression.expectDiscourage).toBe("yes");
    expect(baseline.expectDiscourage).toBe("no");
  });
});
