import { describe, expect, test } from "vitest";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import type { DimensionScoreRow } from "@/lib/counselor/types";
import type { ProfileDimension } from "@/types/database";

function row(dimension: ProfileDimension, score: number, overrides: Partial<DimensionScoreRow> = {}): DimensionScoreRow {
  return { dimension, score, confidence: "high", reasonCodes: [], ...overrides };
}

describe("rankDimensionGaps", () => {
  test("ranks ascending by score, rank 1 is the weakest dimension", () => {
    const gaps = rankDimensionGaps([row("leadership", 80), row("research", 20), row("academics", 50)]);
    expect(gaps.map((g) => g.dimension)).toEqual(["research", "academics", "leadership"]);
    expect(gaps.map((g) => g.rank)).toEqual([1, 2, 3]);
  });

  test("computes spreadFromStrongest as the strongest score minus this dimension's score", () => {
    const gaps = rankDimensionGaps([row("leadership", 90), row("research", 30)]);
    const research = gaps.find((g) => g.dimension === "research")!;
    const leadership = gaps.find((g) => g.dimension === "leadership")!;
    expect(research.spreadFromStrongest).toBe(60);
    expect(leadership.spreadFromStrongest).toBe(0);
  });

  test("marks a low-confidence dimension as insufficient_data regardless of score", () => {
    const gaps = rankDimensionGaps([row("leadership", 90), row("research", 10, { confidence: "low" })]);
    const research = gaps.find((g) => g.dimension === "research")!;
    expect(research.severity).toBe("insufficient_data");
  });

  test("marks a wide, top-ranked gap as critical (spread >= 30, rank <= 2)", () => {
    const gaps = rankDimensionGaps([row("leadership", 90), row("research", 40)]);
    const research = gaps.find((g) => g.dimension === "research")!;
    expect(research.spreadFromStrongest).toBe(50);
    expect(research.severity).toBe("critical");
  });

  test("marks a moderate spread as moderate, not critical", () => {
    const gaps = rankDimensionGaps([row("leadership", 90), row("research", 78)]);
    const research = gaps.find((g) => g.dimension === "research")!;
    expect(research.spreadFromStrongest).toBe(12);
    expect(research.severity).toBe("minor");
  });

  test("a wide spread outside the top-2 rank is moderate, not critical", () => {
    const gaps = rankDimensionGaps([
      row("leadership", 100), // strongest
      row("research", 60), // spread 40 from strongest (wide), but ranks 3rd, not top-2
      row("academics", 50), // rank 1 (weakest)
      row("awards_distinction", 55), // rank 2
    ]);
    const research = gaps.find((g) => g.dimension === "research")!;
    expect(research.rank).toBe(3);
    expect(research.spreadFromStrongest).toBe(40);
    expect(research.severity).toBe("moderate");
  });

  test("small spread is minor", () => {
    const gaps = rankDimensionGaps([row("leadership", 80), row("research", 75)]);
    const research = gaps.find((g) => g.dimension === "research")!;
    expect(research.spreadFromStrongest).toBe(5);
    expect(research.severity).toBe("minor");
  });

  test("passes reasonCodes through unchanged, never re-derives them", () => {
    const codes = [{ code: "gpa", detail: "3.9 GPA on file" }];
    const gaps = rankDimensionGaps([row("academics", 50, { reasonCodes: codes })]);
    expect(gaps[0].reasonCodes).toBe(codes);
  });

  test("returns an empty array for an empty input (near-empty profile, no crash)", () => {
    expect(rankDimensionGaps([])).toEqual([]);
  });

  test("ties are broken deterministically by input order", () => {
    const gaps = rankDimensionGaps([row("leadership", 50), row("research", 50), row("academics", 50)]);
    expect(gaps.map((g) => g.dimension)).toEqual(["leadership", "research", "academics"]);
    expect(gaps.every((g) => g.severity === "minor")).toBe(true);
  });
});

describe("toDimensionScoreRows", () => {
  test("maps raw profile_scores rows (snake_case reason_codes) to DimensionScoreRow", () => {
    const rows = toDimensionScoreRows([
      { dimension: "research", score: 42, confidence: "medium", reason_codes: [{ code: "research_experience", detail: "1 project" }] },
    ]);
    expect(rows).toEqual([
      { dimension: "research", score: 42, confidence: "medium", reasonCodes: [{ code: "research_experience", detail: "1 project" }] },
    ]);
  });

  test("defaults missing/malformed reason_codes to an empty array rather than throwing", () => {
    const rows = toDimensionScoreRows([{ dimension: "academics", score: 10, confidence: "low", reason_codes: null }]);
    expect(rows[0].reasonCodes).toEqual([]);
  });
});
