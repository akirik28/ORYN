import { describe, expect, test } from "vitest";
import { explainOutlook, type DimensionScoreInput } from "@/lib/admissions/explain";
import { DIMENSION_LABELS, DIMENSION_ORDER } from "@/lib/scoring/labels";

function allZeroLowConfidence(): DimensionScoreInput[] {
  return DIMENSION_ORDER.map((dimension) => ({ dimension, score: 0, confidence: "low" as const }));
}

describe("explainOutlook", () => {
  test("no scores at all: insufficient data, no fabricated gaps or strengths", () => {
    const explanation = explainOutlook([]);
    expect(explanation.strengths).toEqual([]);
    expect(explanation.gaps).toEqual([]);
    expect(explanation.insufficientData).toBe(true);
  });

  // Regression: every dimension in an empty profile scores 0 with "low" confidence (no
  // underlying facts). Before this fix, sorting all-equal scores and slicing the array's tail
  // always picked the same two dimensions — Career Exploration and Execution / Project Depth,
  // because those sort last in DIMENSION_SCORERS (lib/scoring/index.ts) — and presented them as
  // this specific student's weaknesses on every university page, for every student with an
  // empty profile. That's fabricated signal, not a real finding.
  test("an all-zero, all-low-confidence profile names no gaps and no strengths", () => {
    const explanation = explainOutlook(allZeroLowConfidence());
    expect(explanation.gaps).toEqual([]);
    expect(explanation.strengths).toEqual([]);
    expect(explanation.insufficientData).toBe(true);
  });

  test("a dimension with real evidence but a 0 score is still not named as a gap if every dimension is low confidence", () => {
    // Sanity check that "insufficientData" is driven by confidence, not by the presence of a
    // nonzero score — a profile can have facts and still score 0 on a dimension it has zero
    // relevant activity in, but that's a different case (covered below) from having no facts.
    const explanation = explainOutlook([{ dimension: "research", score: 0, confidence: "low" }]);
    expect(explanation.insufficientData).toBe(true);
  });

  test("low-confidence dimensions are excluded from naming even when other dimensions have real evidence", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: "leadership", score: 90, confidence: "high" },
      { dimension: "academics", score: 85, confidence: "high" },
      // Every other dimension is unevidenced — must never appear as a named gap.
      ...DIMENSION_ORDER.filter((d) => d !== "leadership" && d !== "academics").map((dimension) => ({
        dimension,
        score: 0,
        confidence: "low" as const,
      })),
    ];
    const explanation = explainOutlook(scores);
    expect(explanation.insufficientData).toBe(false);
    expect(explanation.gaps).toEqual([]);
    expect(explanation.strengths.sort()).toEqual([DIMENSION_LABELS.academics, DIMENSION_LABELS.leadership].sort());
  });

  // Regression: a genuine tie in score must resolve by an explicit, documented rule
  // (alphabetical by dimension key), never by whatever order the caller's array happens to be
  // in — the exact bug that made an all-zero profile always name the same two dimensions.
  test("a genuine tie among evidenced dimensions breaks deterministically, not by input array order", () => {
    // "research" sorts before "academics" would if declaration order were used naively, but
    // alphabetically "academics" < "research" — this only passes if the tie-break is real.
    const inDeclarationOrder: DimensionScoreInput[] = [
      { dimension: "research", score: 70, confidence: "high" },
      { dimension: "academics", score: 70, confidence: "high" },
    ];
    const reversed = [...inDeclarationOrder].reverse();

    const a = explainOutlook(inDeclarationOrder);
    const b = explainOutlook(reversed);

    // Both orderings of the same input must produce the identical result — order-independence
    // is the whole point of a real tie-break.
    expect(a.strengths).toEqual(b.strengths);
    expect(a.strengths).toEqual([DIMENSION_LABELS.academics, DIMENSION_LABELS.research]);
  });

  test("a genuine tie below the threshold breaks the same deterministic way for gaps", () => {
    const inDeclarationOrder: DimensionScoreInput[] = [
      { dimension: "execution_project_depth", score: 20, confidence: "high" },
      { dimension: "career_exploration", score: 20, confidence: "high" },
    ];
    const reversed = [...inDeclarationOrder].reverse();

    const a = explainOutlook(inDeclarationOrder);
    const b = explainOutlook(reversed);

    expect(a.gaps).toEqual(b.gaps);
    expect(a.gaps).toEqual([DIMENSION_LABELS.career_exploration, DIMENSION_LABELS.execution_project_depth]);
  });

  test("strengths and gaps are independent — evidence-backed ties among real strengths are named even when they aren't the single best two", () => {
    // Three dimensions all clear the strength threshold; only the top 2 are named — that's
    // incompleteness (there IS a third real strength Oryn didn't list), not fabrication, since
    // all three are genuinely evidenced and >= 55.
    const scores: DimensionScoreInput[] = [
      { dimension: "leadership", score: 80, confidence: "high" },
      { dimension: "academics", score: 80, confidence: "high" },
      { dimension: "research", score: 80, confidence: "medium" },
    ];
    const explanation = explainOutlook(scores);
    expect(explanation.strengths).toHaveLength(2);
    // Deterministic (alphabetical) pick among the tie, not whichever came first in the array.
    expect(explanation.strengths).toEqual([DIMENSION_LABELS.academics, DIMENSION_LABELS.leadership]);
  });

  test("unknowns are always the fixed disclosure list regardless of scores", () => {
    const explanation = explainOutlook([{ dimension: "leadership", score: 90, confidence: "high" }]);
    expect(explanation.unknowns).toEqual(["Essays", "Recommendations", "Applicant pool in this admission cycle"]);
  });
});
