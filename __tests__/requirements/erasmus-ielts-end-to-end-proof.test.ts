import { describe, expect, test } from "vitest";
import { evaluateRequirement } from "@/lib/requirements/evaluate";
import type { RequirementFacts } from "@/lib/requirements/types";

/**
 * Step 1 of CEO's structured-rule authoring assignment (docs/requirement-evaluation-
 * manual-review-audit-2026-09-05.md): prove ONE requirement end-to-end before writing 205
 * rows of SQL. "If this doesn't work, writing 205 rows is meaningless."
 *
 * Requirement: Erasmus University Rotterdam, `university_requirements.id`
 * `94a53352-4f5f-4a8e-a480-ce206b4ef34b`, university-wide (program_id null), the single
 * cleanest candidate in the whole targeted-university set — one test, one number, no
 * bands, no validity window, no multi-test alternatives. Its real, live text
 * (`requirement_detail`): "IELTS Academic: minimum 6.0".
 *
 * Student: a REAL student who actually targets this university (`target_universities`
 * where university_id = the row above, status 'exploring') — user_id
 * `6e2f0ff1-b8f6-424e-9682-a56a5033325e` — with a REAL `test_scores` row on file:
 * IELTS Academic, 7.5/9.0. Both ids and the score value are read directly from
 * `oryn-qa-scratch`, not invented for this test.
 *
 * evaluateRequirement() is pure (no DB, no AI call — its own doc comment states this
 * directly), so this proves the evaluation logic itself without needing a live session;
 * the facts object below is the exact shape assembleRequirementFacts() would have built
 * from this student's real rows.
 */

const REAL_STUDENT_FACTS: RequirementFacts = {
  curricula: [],
  courses: [],
  gpas: [],
  testScores: [
    { testName: "SAT", score: "1470", maxScore: "1600", testDate: null },
    { testName: "IELTS Academic", score: "7.5", maxScore: "9.0", testDate: null },
    { testName: "IB Predicted", score: "38", maxScore: "45", testDate: null },
  ],
  languages: [],
};

describe("Erasmus IELTS requirement (94a53352-4f5f-4a8e-a480-ce206b4ef34b) — real student, real score", () => {
  test("RED: today's live state (structured_rule = null) evaluates to needs_manual_review", () => {
    const result = evaluateRequirement("english_proficiency", null, REAL_STUDENT_FACTS);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("no_structured_rule");
  });

  test("GREEN: with the requirement's own text turned into a structured rule, the same real student evaluates to met", () => {
    // { kind: "language_proficiency", testName: "IELTS Academic", minScore: 6.0 } —
    // exactly what "IELTS Academic: minimum 6.0" says, no more, no less.
    const structuredRule = { kind: "language_proficiency" as const, testName: "IELTS Academic", minScore: 6.0 };
    const result = evaluateRequirement("english_proficiency", structuredRule, REAL_STUDENT_FACTS);
    expect(result.status).toBe("met");
    expect(result.reasoning).toContain("7.5");
  });

  test("the same rule correctly returns not_met for a student below the threshold — not just always met", () => {
    const structuredRule = { kind: "language_proficiency" as const, testName: "IELTS Academic", minScore: 6.0 };
    const belowThreshold: RequirementFacts = { ...REAL_STUDENT_FACTS, testScores: [{ testName: "IELTS Academic", score: "5.5", maxScore: "9.0", testDate: null }] };
    const result = evaluateRequirement("english_proficiency", structuredRule, belowThreshold);
    expect(result.status).toBe("not_met");
  });

  test("a student with no IELTS score on file correctly returns unknown, not a false pass or fail", () => {
    const structuredRule = { kind: "language_proficiency" as const, testName: "IELTS Academic", minScore: 6.0 };
    const noScore: RequirementFacts = { ...REAL_STUDENT_FACTS, testScores: [] };
    const result = evaluateRequirement("english_proficiency", structuredRule, noScore);
    expect(result.status).toBe("unknown");
  });
});
