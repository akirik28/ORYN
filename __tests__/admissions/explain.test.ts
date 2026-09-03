import { describe, expect, test } from "vitest";
import { explainOutlook, type DimensionScoreInput } from "@/lib/admissions/explain";
import { DIMENSION_LABELS, DIMENSION_ORDER, dimensionLabel } from "@/lib/scoring/labels";

function allZeroLowConfidence(): DimensionScoreInput[] {
  return DIMENSION_ORDER.map((dimension) => ({ dimension, score: 0, confidence: "low" as const }));
}

// admissionRateKnown is `true` throughout this first describe block and the two after it --
// none of these tests are about the admission-rate disclosure itself (see "explainOutlook —
// admission-rate disclosure" below for that), so `true` (no fourth unknowns item appended)
// keeps every pre-existing assertion here asserting exactly what it always asserted.
describe("explainOutlook", () => {
  test("no scores at all: insufficient data, no fabricated gaps or strengths", () => {
    const explanation = explainOutlook([], undefined, true);
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
    const explanation = explainOutlook(allZeroLowConfidence(), undefined, true);
    expect(explanation.gaps).toEqual([]);
    expect(explanation.strengths).toEqual([]);
    expect(explanation.insufficientData).toBe(true);
  });

  test("a dimension with real evidence but a 0 score is still not named as a gap if every dimension is low confidence", () => {
    // Sanity check that "insufficientData" is driven by confidence, not by the presence of a
    // nonzero score — a profile can have facts and still score 0 on a dimension it has zero
    // relevant activity in, but that's a different case (covered below) from having no facts.
    const explanation = explainOutlook([{ dimension: "research", score: 0, confidence: "low" }], undefined, true);
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
    const explanation = explainOutlook(scores, undefined, true);
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

    const a = explainOutlook(inDeclarationOrder, undefined, true);
    const b = explainOutlook(reversed, undefined, true);

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

    const a = explainOutlook(inDeclarationOrder, undefined, true);
    const b = explainOutlook(reversed, undefined, true);

    expect(a.gaps).toEqual(b.gaps);
    expect(a.gaps).toEqual([DIMENSION_LABELS.career_exploration, DIMENSION_LABELS.execution_project_depth]);
  });

  test("strengths and gaps are independent — evidence-backed ties among real strengths are named even when they aren't the single best two", () => {
    // Three dimensions all clear the strength threshold; only the top 2 are named — that's
    // incompleteness (there IS a third real strength Proxola didn't list), not fabrication, since
    // all three are genuinely evidenced and >= 55.
    const scores: DimensionScoreInput[] = [
      { dimension: "leadership", score: 80, confidence: "high" },
      { dimension: "academics", score: 80, confidence: "high" },
      { dimension: "research", score: 80, confidence: "medium" },
    ];
    const explanation = explainOutlook(scores, undefined, true);
    expect(explanation.strengths).toHaveLength(2);
    // Deterministic (alphabetical) pick among the tie, not whichever came first in the array.
    expect(explanation.strengths).toEqual([DIMENSION_LABELS.academics, DIMENSION_LABELS.leadership]);
  });

  test("unknowns are always the fixed disclosure list regardless of scores", () => {
    const explanation = explainOutlook([{ dimension: "leadership", score: 90, confidence: "high" }], undefined, true);
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

  // admissionRateKnown has no default (see lib/admissions/explain.ts's own comment on why) --
  // the "omit everything optional" case this test named no longer exists as a valid call at
  // all, so this now checks the one comparison that's still meaningful: undefined shape and
  // null shape must still be indistinguishable from each other.
  test("undefined shape and null shape are indistinguishable from each other", () => {
    expect(explainOutlook(evidenced, undefined, true)).toEqual(explainOutlook(evidenced, null, true));
  });

  test("a holistic target is unchanged: strengths, gaps, and the essay/recommendation unknowns", () => {
    const holistic = explainOutlook(evidenced, "holistic_review", true);
    expect(holistic.strengths).toEqual([DIMENSION_LABELS.leadership]);
    expect(holistic.gaps).toEqual([DIMENSION_LABELS.research]);
    expect(holistic.unknowns).toEqual(["Essays", "Recommendations", "Applicant pool in this admission cycle"]);
    expect(holistic.profileNotAnInput).toBe(false);
  });

  // The tri-state discipline reviewsNonAcademicEvidence itself keeps: "not established" must
  // never be silently treated as "established false". An unresearched country keeps the
  // existing framing rather than getting a confident claim Proxola hasn't earned.
  test("an unresolved target is treated as holistic, never as established-no-review", () => {
    const unknownShape = explainOutlook(evidenced, "unknown", true);
    expect(unknownShape).toEqual(explainOutlook(evidenced, "holistic_review", true));
    expect(unknownShape.profileNotAnInput).toBe(false);
  });

  test("a rank-competitive target names no strengths or gaps and drops the essay/recommendation unknowns", () => {
    const yks = explainOutlook(evidenced, "academic_rank_competitive", true);
    expect(yks.profileNotAnInput).toBe(true);
    expect(yks.strengths).toEqual([]);
    expect(yks.gaps).toEqual([]);
    expect(yks.unknowns).not.toContain("Essays");
    expect(yks.unknowns).not.toContain("Recommendations");
    // The one thing genuinely unknown about this mechanism: a cutoff exists, Proxola can't see it.
    expect(yks.unknowns).toEqual(["Where this cycle's score cutoff lands"]);
  });

  // RULE-ADMISSIONS-001: once the published threshold is met, admission follows. There is no
  // cutoff to land above, so an "unknowns" entry here would manufacture doubt the mechanism
  // does not have — a different wrong answer from the rank-competitive case, not the same one.
  test("a threshold target names nothing and invents no unknowns at all", () => {
    const dutch = explainOutlook(evidenced, "academic_threshold", true);
    expect(dutch.profileNotAnInput).toBe(true);
    expect(dutch.strengths).toEqual([]);
    expect(dutch.gaps).toEqual([]);
    expect(dutch.unknowns).toEqual([]);
  });

  test("the two no-review shapes are told apart, not collapsed", () => {
    expect(explainOutlook(evidenced, "academic_rank_competitive", true).unknowns).not.toEqual(
      explainOutlook(evidenced, "academic_threshold", true).unknowns
    );
  });

  // insufficientData drives "we don't know enough about you yet". That is the wrong sentence
  // for a target where more profile data would not change the answer — Proxola knows plenty here.
  test("an empty profile against a no-review target reports profileNotAnInput, not insufficientData", () => {
    const empty = explainOutlook(allZeroLowConfidence(), "academic_rank_competitive", true);
    expect(empty.profileNotAnInput).toBe(true);
    expect(empty.insufficientData).toBe(false);
  });

  test("an empty profile against a holistic target still reports insufficientData", () => {
    const empty = explainOutlook(allZeroLowConfidence(), "holistic_review", true);
    expect(empty.insufficientData).toBe(true);
    expect(empty.profileNotAnInput).toBe(false);
  });
});

/**
 * Found auditing per-country admissions coverage 2026-09-03 (see lib/admissions/explain.ts's
 * own ADMISSION_RATE_UNKNOWN_ITEM comment for the measured scale): classifyOutlook labels a
 * target confidently from compositeScore even when the target's admission_rate is null,
 * because SELECTIVITY_PENALTY.unknown substitutes a flat generic value — and nothing
 * disclosed that substitution anywhere. This is the disclosure.
 */
describe("explainOutlook — admission-rate disclosure", () => {
  const evidenced: DimensionScoreInput[] = [
    { dimension: "leadership", score: 91, confidence: "high" },
    { dimension: "research", score: 42, confidence: "high" },
  ];

  test("holistic_review with a known rate: unchanged, three items, no rate caveat", () => {
    const result = explainOutlook(evidenced, "holistic_review", true);
    expect(result.unknowns).toEqual(["Essays", "Recommendations", "Applicant pool in this admission cycle"]);
  });

  test("holistic_review with an unknown rate: the fourth item appears, appended not prepended", () => {
    const result = explainOutlook(evidenced, "holistic_review", false);
    expect(result.unknowns).toEqual(["Essays", "Recommendations", "Applicant pool in this admission cycle", "This institution's own admission rate"]);
  });

  test("unknown shape with an unknown rate also gets the caveat — this is the largest real population (533 institutions measured live, zero with any statistics row)", () => {
    const result = explainOutlook(evidenced, "unknown", false);
    expect(result.unknowns).toContain("This institution's own admission rate");
  });

  // The core claim of lib/admissions/explain.ts's own comment: a suppressed shape never
  // reaches classifyOutlook's rate-dependent label, so admissionRateKnown must change nothing
  // about its unknowns — asserted directly here, not just claimed in a comment.
  test("academic_rank_competitive ignores admissionRateKnown entirely — the flag is irrelevant once Gate 1 already suppressed the label", () => {
    const withRate = explainOutlook(evidenced, "academic_rank_competitive", true);
    const withoutRate = explainOutlook(evidenced, "academic_rank_competitive", false);
    expect(withRate.unknowns).toEqual(withoutRate.unknowns);
    expect(withoutRate.unknowns).not.toContain("This institution's own admission rate");
  });

  test("academic_threshold ignores admissionRateKnown entirely and still invents nothing", () => {
    const withRate = explainOutlook(evidenced, "academic_threshold", true);
    const withoutRate = explainOutlook(evidenced, "academic_threshold", false);
    expect(withRate.unknowns).toEqual([]);
    expect(withoutRate.unknowns).toEqual([]);
  });

  test("the caveat is Turkish under locale tr", () => {
    const result = explainOutlook(evidenced, "holistic_review", false, "tr");
    expect(result.unknowns).toContain("Bu kurumun kendi kabul oranı");
    expect(result.unknowns).not.toContain("This institution's own admission rate");
  });
});

describe("explainOutlook — locale: tr", () => {
  const evidenced: DimensionScoreInput[] = [
    { dimension: "leadership", score: 91, confidence: "high" },
    { dimension: "research", score: 42, confidence: "high" },
  ];

  test("strengths/gaps use the Turkish dimension label, reusing lib/scoring/labels.ts's shared source", () => {
    const result = explainOutlook(evidenced, "holistic_review", true, "tr");
    expect(result.strengths).toEqual([dimensionLabel("leadership", "tr")]);
    expect(result.gaps).toEqual([dimensionLabel("research", "tr")]);
    expect(result.strengths).toEqual(["Liderlik"]);
    expect(result.gaps).toEqual(["Araştırma"]);
  });

  test("holistic unknowns are Turkish", () => {
    const result = explainOutlook(evidenced, "holistic_review", true, "tr");
    expect(result.unknowns).toEqual(["Kompozisyonlar", "Referans mektupları", "Bu başvuru döneminin aday havuzu"]);
  });

  test("rank-competitive unknowns are Turkish and still just the one real unknown", () => {
    const result = explainOutlook(evidenced, "academic_rank_competitive", true, "tr");
    expect(result.unknowns).toEqual(["Bu dönemin puan eşiğinin nereye geleceği"]);
  });

  test("threshold shape still invents no unknowns in Turkish either", () => {
    const result = explainOutlook(evidenced, "academic_threshold", true, "tr");
    expect(result.unknowns).toEqual([]);
  });

  test("omitting locale is identical to passing 'en' explicitly (default-locale backward compatibility)", () => {
    for (const shape of ["holistic_review", "academic_rank_competitive", "academic_threshold", "unknown"] as const) {
      expect(explainOutlook(evidenced, shape, true)).toEqual(explainOutlook(evidenced, shape, true, "en"));
    }
  });
});
