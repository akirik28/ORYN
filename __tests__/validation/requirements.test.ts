import { describe, expect, test } from "vitest";
import { RequirementInputSchema, RequirementQualifiersSchema, StructuredRuleSchema, ruleAuthoringRefusal } from "@/lib/validation/requirements";

/**
 * The authoring side of the same problem `__tests__/requirements/evaluate.test.ts` covers
 * from the evaluation side.
 *
 * `evaluateRequirement` already ignores `structured_rule` on a manual-review category and on
 * any gated row, so a rule sitting on a binding Early Decision record does nothing today.
 * "Does nothing today" is not the property that matters: the row is what a later reviewer,
 * or a later edit to `MANUAL_REVIEW_CATEGORIES`/`categoryToRuleKind`, reads. These tests
 * assert the rule cannot be written in the first place.
 */

function input(overrides: Record<string, unknown> = {}) {
  return {
    universityId: "11111111-1111-4111-8111-111111111111",
    programId: null,
    requirementType: "standardized_test",
    title: "SAT 1400",
    requirementDetail: "Applicants should present an SAT total of at least 1400.",
    isRequired: true,
    sourceUrl: "https://example.edu/admissions",
    structuredRuleJson: JSON.stringify({ kind: "test_score", testName: "SAT", minScore: 1400 }),
    ...overrides,
  };
}

describe("ruleAuthoringRefusal — a binding round can never be given a structured rule", () => {
  test("refuses a rule on a US Early Decision commitment even under an evaluable category", () => {
    const refusal = ruleAuthoringRefusal({
      category: "standardized_test",
      title: "Early Decision agreement",
      requirementDetail: "Early Decision is binding: if admitted you must enroll and withdraw all other applications.",
    });
    expect(refusal).not.toBeNull();
    expect(refusal).toMatch(/binding application round/i);
  });

  test("refuses a rule on Restrictive Early Action, which forbids other early applications", () => {
    expect(
      ruleAuthoringRefusal({ category: "supplemental_requirement", title: "Restrictive Early Action", requirementDetail: "You may not apply early to other private institutions." })
    ).not.toBeNull();
  });

  test("refuses a rule on any manual-review category, where one would never be read", () => {
    expect(ruleAuthoringRefusal({ category: "essay", title: "Personal statement", requirementDetail: "650 words." })).toMatch(/reviewed by hand/i);
  });

  test("does NOT refuse Tilburg's non-binding matching activity — the word 'binding' alone is not the trigger", () => {
    // REQ-2026-08-21-TIL0029: "The advice is non-binding, so independent to your admission to
    // the study program." A looser detector would block an ordinary supplemental requirement
    // and, worse, teach whoever hit it to work around the guard.
    expect(
      ruleAuthoringRefusal({ category: "prerequisite_coursework", title: "Matching activity", requirementDetail: "The advice is non-binding, so independent to your admission to the study program." })
    ).toBeNull();
  });

  test("does NOT refuse TU Berlin's 'recommended vs required' language-skills wording", () => {
    // REQ-2026-08-21-TUB0012's researcher note uses "non-binding" for a recommendation.
    expect(
      ruleAuthoringRefusal({ category: "language_proficiency", title: "German C1", requirementDetail: "German is required; English at CEFR B2 is recommended and non-binding." })
    ).toBeNull();
  });

  test("an ordinary sourced threshold is authorable", () => {
    expect(ruleAuthoringRefusal({ category: "english_proficiency", title: "IELTS 6.5", requirementDetail: "IELTS Academic: total 6.5 with at least 5.5 in each component." })).toBeNull();
  });
});

describe("RequirementInputSchema — the refusal is enforced at save time, not only advertised", () => {
  test("an Early Decision row with a structured rule is rejected by the admin save schema", () => {
    const parsed = RequirementInputSchema.safeParse(
      input({ title: "Early Decision agreement", requirementDetail: "Early Decision is binding; if admitted you must enroll." })
    );
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/binding application round/i);
  });

  test("the same Early Decision row saves fine with no structured rule — the record itself is welcome", () => {
    const parsed = RequirementInputSchema.safeParse(
      input({ title: "Early Decision agreement", requirementDetail: "Early Decision is binding; if admitted you must enroll.", structuredRuleJson: null })
    );
    expect(parsed.success).toBe(true);
  });

  test("an ordinary requirement with a structured rule still saves", () => {
    expect(RequirementInputSchema.safeParse(input()).success).toBe(true);
  });
});

describe("StructuredRuleSchema — a rank and a score are not the same quantity", () => {
  test("METU's percentile threshold parses on its own", () => {
    expect(StructuredRuleSchema.safeParse({ kind: "test_score", testName: "TR-YÖS", minPercentileRank: 5 }).success).toBe(true);
  });

  test("a rule stating both a minimum score and a minimum percentile rank is refused", () => {
    const parsed = StructuredRuleSchema.safeParse({ kind: "test_score", testName: "TR-YÖS", minScore: 400, minPercentileRank: 5 });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/never both/i);
  });
});

describe("RequirementQualifiersSchema — reads migration 0056's columns and fails closed", () => {
  test("a whole university_requirements row can be passed; unrelated columns are stripped", () => {
    const parsed = RequirementQualifiersSchema.safeParse({
      id: "abc",
      requirement_type: "english_proficiency",
      structured_rule: { kind: "test_score", testName: "IELTS", minScore: 6.5 },
      test_scale: "IELTS_0_9",
      scale_ambiguity: "none",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ evaluationGate: null, isExclusion: null, testScale: "IELTS_0_9", scaleAmbiguity: "none", recencyRule: null, excludedProvenances: null });
  });

  test("migration 0052's is_exclusion is read off the row, not stripped with the unrelated columns", () => {
    // The one qualifier column that exists in production today (0052 is applied, 0056 is
    // not), which is why callers hand over the whole row: one argument carries both.
    expect(RequirementQualifiersSchema.safeParse({ id: "abc", is_exclusion: true }).data?.isExclusion).toBe(true);
    expect(RequirementQualifiersSchema.safeParse({ id: "abc", is_exclusion: false }).data?.isExclusion).toBe(false);
    expect(RequirementQualifiersSchema.safeParse({ id: "abc" }).data?.isExclusion).toBeNull();
  });

  test("a bare boolean is not a row and fails the parse rather than reading as 'no qualifiers'", () => {
    // The fourth argument of evaluateRequirement was once `isExclusion: boolean`. A stale
    // boolean must fail closed, never be silently read as an empty qualifier set.
    expect(RequirementQualifiersSchema.safeParse(true).success).toBe(false);
    expect(RequirementQualifiersSchema.safeParse(false).success).toBe(false);
  });

  test("a row from before migration 0056 (no qualifier columns at all) parses to all-null", () => {
    const parsed = RequirementQualifiersSchema.safeParse({ id: "abc", requirement_type: "english_proficiency" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.evaluationGate).toBeNull();
  });

  test("METU's inverted recency rule round-trips with its direction intact", () => {
    const parsed = RequirementQualifiersSchema.safeParse({ recency_rule: { direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" } });
    expect(parsed.data?.recencyRule).toEqual({ direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" });
  });

  test("an evaluation_gate outside the known vocabulary fails the parse rather than being dropped", () => {
    expect(RequirementQualifiersSchema.safeParse({ evaluation_gate: "invented_later" }).success).toBe(false);
  });

  test("binding_commitment is in the vocabulary, matching migration 0056's CHECK constraint", () => {
    expect(RequirementQualifiersSchema.safeParse({ evaluation_gate: "binding_commitment" }).success).toBe(true);
  });

  test("an unknown excluded provenance fails the parse rather than becoming no exclusion", () => {
    expect(RequirementQualifiersSchema.safeParse({ excluded_provenances: ["one_skill_retake", "invented_later"] }).success).toBe(false);
  });
});
