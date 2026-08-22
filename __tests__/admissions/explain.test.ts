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

/**
 * Gate 1 reached the explanation, not just the label.
 *
 * The defect these cover, verified on the real path before the fix: a Turkish student with a
 * Boğaziçi target saw a badge reading "Not a profile-review system" sitting directly above
 * "Strengths + Leadership", "Gaps − Research", and "Unknowns ? Essays ? Recommendations".
 * ÖSYM's YKS placement reads no essay and no reference letter, so the panel told that student
 * unseen letters were weighing on a decision that never sees one, and presented their
 * leadership as a reason for an outcome it has no channel into — the same false-holistic
 * framing Gate 1 exists to stop, one layer up in the copy.
 */
describe("explainOutlook — Gate 1 shape awareness", () => {
  const evidenced: DimensionScoreInput[] = [
    { dimension: "leadership", score: 91, confidence: "high" },
    { dimension: "research", score: 42, confidence: "high" },
  ];

  test("omitting the shape is byte-identical to before the parameter existed", () => {
    expect(explainOutlook(evidenced)).toEqual(explainOutlook(evidenced, undefined));
    expect(explainOutlook(evidenced)).toEqual(explainOutlook(evidenced, null));
  });

  test("a holistic target is unchanged: strengths, gaps, and the essay/recommendation unknowns", () => {
    const holistic = explainOutlook(evidenced, "holistic_review");
    expect(holistic).toEqual(explainOutlook(evidenced));
    expect(holistic.strengths).toEqual([DIMENSION_LABELS.leadership]);
    expect(holistic.gaps).toEqual([DIMENSION_LABELS.research]);
    expect(holistic.unknowns).toEqual(["Essays", "Recommendations", "Applicant pool in this admission cycle"]);
    expect(holistic.profileNotAnInput).toBe(false);
  });

  // The tri-state discipline reviewsNonAcademicEvidence itself keeps: "not established" must
  // never be silently treated as "established false". An unresearched country keeps the
  // existing framing rather than getting a confident claim Oryn hasn't earned.
  test("an unresolved target is treated as holistic, never as established-no-review", () => {
    const unknownShape = explainOutlook(evidenced, "unknown");
    expect(unknownShape).toEqual(explainOutlook(evidenced));
    expect(unknownShape.profileNotAnInput).toBe(false);
  });

  test("a rank-competitive target names no strengths or gaps and drops the essay/recommendation unknowns", () => {
    const yks = explainOutlook(evidenced, "academic_rank_competitive");
    expect(yks.profileNotAnInput).toBe(true);
    expect(yks.strengths).toEqual([]);
    expect(yks.gaps).toEqual([]);
    expect(yks.unknowns).not.toContain("Essays");
    expect(yks.unknowns).not.toContain("Recommendations");
    // The one thing genuinely unknown about this mechanism: a cutoff exists, Oryn can't see it.
    expect(yks.unknowns).toEqual(["Where this cycle's score cutoff lands"]);
  });

  // RULE-ADMISSIONS-001: once the published threshold is met, admission follows. There is no
  // cutoff to land above, so an "unknowns" entry here would manufacture doubt the mechanism
  // does not have — a different wrong answer from the rank-competitive case, not the same one.
  test("a threshold target names nothing and invents no unknowns at all", () => {
    const dutch = explainOutlook(evidenced, "academic_threshold");
    expect(dutch.profileNotAnInput).toBe(true);
    expect(dutch.strengths).toEqual([]);
    expect(dutch.gaps).toEqual([]);
    expect(dutch.unknowns).toEqual([]);
  });

  test("the two no-review shapes are told apart, not collapsed", () => {
    expect(explainOutlook(evidenced, "academic_rank_competitive").unknowns).not.toEqual(
      explainOutlook(evidenced, "academic_threshold").unknowns
    );
  });

  // insufficientData drives "we don't know enough about you yet". That is the wrong sentence
  // for a target where more profile data would not change the answer — Oryn knows plenty here.
  test("an empty profile against a no-review target reports profileNotAnInput, not insufficientData", () => {
    const empty = explainOutlook(allZeroLowConfidence(), "academic_rank_competitive");
    expect(empty.profileNotAnInput).toBe(true);
    expect(empty.insufficientData).toBe(false);
  });

  test("an empty profile against a holistic target still reports insufficientData", () => {
    const empty = explainOutlook(allZeroLowConfidence(), "holistic_review");
    expect(empty.insufficientData).toBe(true);
    expect(empty.profileNotAnInput).toBe(false);
  });
});
