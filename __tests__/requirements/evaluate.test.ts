import { describe, expect, test } from "vitest";
import { evaluateRequirement } from "@/lib/requirements/evaluate";
import type { RequirementFacts } from "@/lib/requirements/types";

const EMPTY_FACTS: RequirementFacts = { curricula: [], courses: [], gpas: [], testScores: [], languages: [] };

describe("evaluateRequirement — manual review and informational categories", () => {
  test("essay always needs manual review, even with a structured rule attached", () => {
    const result = evaluateRequirement("essay", { kind: "coursework", subject: "English" }, EMPTY_FACTS);
    expect(result.status).toBe("needs_manual_review");
  });

  test("recommendation, interview, portfolio, supplemental, and international requirements all need manual review", () => {
    for (const category of ["recommendation", "interview", "portfolio", "supplemental_requirement", "international_requirement"] as const) {
      expect(evaluateRequirement(category, null, EMPTY_FACTS).status).toBe("needs_manual_review");
    }
  });

  test("application_deadline is informational, never met/not_met", () => {
    const result = evaluateRequirement("application_deadline", null, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("an evaluable category with no structured rule recorded needs manual review, never guesses", () => {
    const result = evaluateRequirement("required_subject", null, EMPTY_FACTS);
    expect(result.status).toBe("needs_manual_review");
  });

  test("a malformed structured rule needs manual review rather than crashing", () => {
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: "not a number" }, EMPTY_FACTS);
    expect(result.status).toBe("needs_manual_review");
  });
});

describe("evaluateRequirement — curriculum", () => {
  test("unknown with no education record on file", () => {
    const result = evaluateRequirement("curriculum", { kind: "curriculum", curricula: ["ib"] }, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("met when the student's curriculum is in the accepted list", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, curricula: ["ib"] };
    const result = evaluateRequirement("curriculum", { kind: "curriculum", curricula: ["ib", "a_level"] }, facts);
    expect(result.status).toBe("met");
  });

  test("not_met when the student has a curriculum but it isn't accepted", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, curricula: ["turkish_curriculum"] };
    const result = evaluateRequirement("curriculum", { kind: "curriculum", curricula: ["ib", "a_level"] }, facts);
    expect(result.status).toBe("not_met");
  });
});

describe("evaluateRequirement — coursework (required_subject / prerequisite_coursework)", () => {
  test("unknown with no coursework on file", () => {
    const result = evaluateRequirement("required_subject", { kind: "coursework", subject: "Mathematics" }, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("not_met when courses exist but none match the subject", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, courses: [{ subject: "History", level: "regular", gradeValue: "A" }] };
    const result = evaluateRequirement("prerequisite_coursework", { kind: "coursework", subject: "Mathematics" }, facts);
    expect(result.status).toBe("not_met");
  });

  test("met on an exact subject match with no level requirement", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, courses: [{ subject: "Mathematics", level: "regular", gradeValue: "A" }] };
    const result = evaluateRequirement("required_subject", { kind: "coursework", subject: "Mathematics" }, facts);
    expect(result.status).toBe("met");
  });

  test("likely_met on a fuzzy (substring) subject match", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, courses: [{ subject: "AP Mathematics", level: "ap", gradeValue: "A" }] };
    const result = evaluateRequirement("required_subject", { kind: "coursework", subject: "Mathematics" }, facts);
    expect(result.status).toBe("likely_met");
  });

  test("met when the course level clears the required minimum level", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, courses: [{ subject: "Mathematics", level: "ib_hl", gradeValue: "7" }] };
    const result = evaluateRequirement("required_subject", { kind: "coursework", subject: "Mathematics", minLevel: "ib_sl" }, facts);
    expect(result.status).toBe("met");
  });

  test("not_met when the subject matches but the level falls short", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, courses: [{ subject: "Mathematics", level: "regular", gradeValue: "A" }] };
    const result = evaluateRequirement("required_subject", { kind: "coursework", subject: "Mathematics", minLevel: "ib_hl" }, facts);
    expect(result.status).toBe("not_met");
  });
});

describe("evaluateRequirement — minimum_grade", () => {
  test("unknown with no GPA on file", () => {
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("met on the same scale, above the threshold", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 3.8, scale: 4 }] };
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, facts);
    expect(result.status).toBe("met");
  });

  test("not_met on the same scale, below the threshold", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 3.0, scale: 4 }] };
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, facts);
    expect(result.status).toBe("not_met");
  });

  test("needs_manual_review when every GPA on file is on a different scale than the rule — never auto-converted", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 95, scale: 100 }] };
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, facts);
    expect(result.status).toBe("needs_manual_review");
  });

  test("met on the matching-scale GPA even when a different-scale one is also on file", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 95, scale: 100 }, { value: 3.8, scale: 4 }] };
    const result = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, facts);
    expect(result.status).toBe("met");
  });
});

describe("evaluateRequirement — test_score (standardized_test / entrance_exam)", () => {
  test("unknown with no matching test on file", () => {
    const result = evaluateRequirement("standardized_test", { kind: "test_score", testName: "SAT", minScore: 1400 }, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("met on an exact test name at or above the minimum score", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1480" }] };
    const result = evaluateRequirement("standardized_test", { kind: "test_score", testName: "SAT", minScore: 1400 }, facts);
    expect(result.status).toBe("met");
  });

  test("not_met on an exact test name below the minimum score", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1200" }] };
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "SAT", minScore: 1400 }, facts);
    expect(result.status).toBe("not_met");
  });

  test("met on presence alone when the rule states no minimum score", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "Pass" }] };
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TOEFL" }, facts);
    expect(result.status).toBe("met");
  });

  test("needs_manual_review when the recorded score isn't numeric but a minimum score is required", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "Pass" }] };
    const result = evaluateRequirement("english_proficiency", { kind: "test_score", testName: "IELTS", minScore: 6.5 }, facts);
    expect(result.status).toBe("needs_manual_review");
  });

  test("a higher score never evaluates worse than a lower one against the same threshold", () => {
    const weakFacts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1350" }] };
    const strongFacts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1550" }] };
    const rule = { kind: "test_score" as const, testName: "SAT", minScore: 1400 };
    const order: Record<string, number> = { not_met: 0, unknown: 1, needs_manual_review: 1, likely_met: 2, met: 3 };
    const weak = evaluateRequirement("standardized_test", rule, weakFacts);
    const strong = evaluateRequirement("standardized_test", rule, strongFacts);
    expect(order[strong.status]).toBeGreaterThanOrEqual(order[weak.status]);
  });
});

describe("evaluateRequirement — language_proficiency", () => {
  test("unknown with no matching language on file", () => {
    const result = evaluateRequirement(
      "language_proficiency",
      { kind: "language_proficiency", languageName: "English", acceptNativeOrFluent: true },
      EMPTY_FACTS
    );
    expect(result.status).toBe("unknown");
  });

  test("met when the recorded proficiency is native or fluent and the rule accepts that", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, languages: [{ name: "English", proficiency: "Native" }] };
    const result = evaluateRequirement(
      "language_proficiency",
      { kind: "language_proficiency", languageName: "English", acceptNativeOrFluent: true },
      facts
    );
    expect(result.status).toBe("met");
  });

  test("needs_manual_review when the language is on file with no proficiency level recorded", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, languages: [{ name: "English", proficiency: null }] };
    const result = evaluateRequirement(
      "language_proficiency",
      { kind: "language_proficiency", languageName: "English", acceptNativeOrFluent: true },
      facts
    );
    expect(result.status).toBe("needs_manual_review");
  });

  test("falls back to test-score evaluation when the rule specifies a test instead of a language name", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.5" }] };
    const result = evaluateRequirement(
      "english_proficiency",
      { kind: "language_proficiency", testName: "IELTS", minScore: 6.5 },
      facts
    );
    expect(result.status).toBe("met");
  });
});
