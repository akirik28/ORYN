import { describe, expect, test } from "vitest";
import { rankDimensionStrengths } from "@/lib/counselor/strengths";
import type { DimensionScoreRow } from "@/lib/counselor/types";
import type { ProfileDimension } from "@/types/database";

function row(dimension: ProfileDimension, score: number, overrides: Partial<DimensionScoreRow> = {}): DimensionScoreRow {
  return { dimension, score, confidence: "high", reasonCodes: [], ...overrides };
}

describe("rankDimensionStrengths", () => {
  test("ranks descending by score, rank 1 is the strongest dimension", () => {
    const strengths = rankDimensionStrengths([row("leadership", 80), row("research", 20), row("academics", 50)]);
    expect(strengths.map((s) => s.dimension)).toEqual(["leadership", "academics", "research"]);
    expect(strengths.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  test("computes spreadFromWeakest as this dimension's score minus the weakest score", () => {
    const strengths = rankDimensionStrengths([row("leadership", 90), row("research", 30)]);
    const leadership = strengths.find((s) => s.dimension === "leadership")!;
    const research = strengths.find((s) => s.dimension === "research")!;
    expect(leadership.spreadFromWeakest).toBe(60);
    expect(research.spreadFromWeakest).toBe(0);
  });

  test("marks a low-confidence dimension as insufficient_data regardless of score", () => {
    const strengths = rankDimensionStrengths([row("leadership", 90, { confidence: "low" }), row("research", 10)]);
    const leadership = strengths.find((s) => s.dimension === "leadership")!;
    expect(leadership.tier).toBe("insufficient_data");
  });

  test("marks a wide, top-ranked strength as standout (spread >= 30, rank <= 2)", () => {
    const strengths = rankDimensionStrengths([row("leadership", 90), row("research", 40)]);
    const leadership = strengths.find((s) => s.dimension === "leadership")!;
    expect(leadership.spreadFromWeakest).toBe(50);
    expect(leadership.tier).toBe("standout");
  });

  test("marks a moderate spread as notable, not standout", () => {
    const strengths = rankDimensionStrengths([row("leadership", 90), row("research", 78)]);
    const leadership = strengths.find((s) => s.dimension === "leadership")!;
    expect(leadership.spreadFromWeakest).toBe(12);
    expect(leadership.tier).toBe("typical");
  });

  test("a wide spread outside the top-2 rank is notable, not standout", () => {
    const strengths = rankDimensionStrengths([
      row("research", 60), // weakest
      row("leadership", 100), // strongest, rank 1
      row("academics", 95), // rank 2
      row("awards_distinction", 90), // rank 3, spread 30 from weakest (wide), but not top-2
    ]);
    const awards = strengths.find((s) => s.dimension === "awards_distinction")!;
    expect(awards.rank).toBe(3);
    expect(awards.spreadFromWeakest).toBe(30);
    expect(awards.tier).toBe("notable");
  });

  test("small spread is typical", () => {
    const strengths = rankDimensionStrengths([row("leadership", 80), row("research", 75)]);
    const research = strengths.find((s) => s.dimension === "research")!;
    expect(research.spreadFromWeakest).toBe(0);
    expect(research.tier).toBe("typical");
  });

  test("passes reasonCodes through unchanged, never re-derives them", () => {
    const codes = [{ code: "leadership_role", detail: "Club president, 2 years" }];
    const strengths = rankDimensionStrengths([row("leadership", 90, { reasonCodes: codes })]);
    expect(strengths[0].reasonCodes).toBe(codes);
  });

  test("returns an empty array for an empty input (near-empty profile, no crash)", () => {
    expect(rankDimensionStrengths([])).toEqual([]);
  });

  test("ties are broken deterministically by input order", () => {
    const strengths = rankDimensionStrengths([row("leadership", 50), row("research", 50), row("academics", 50)]);
    expect(strengths.map((s) => s.dimension)).toEqual(["leadership", "research", "academics"]);
    expect(strengths.every((s) => s.tier === "typical")).toBe(true);
  });

  test("is the mirror image of rankDimensionGaps: the strongest strength is the same dimension as the least severe gap", () => {
    const scores = [row("leadership", 90), row("research", 40), row("academics", 60)];
    const strengths = rankDimensionStrengths(scores);
    expect(strengths[0].dimension).toBe("leadership");
    expect(strengths[0].score).toBe(90);
  });
});
