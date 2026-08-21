import { describe, expect, test } from "vitest";
import { evaluateRequirement, evaluateRequirementGroup, inferStudentScale } from "@/lib/requirements/evaluate";
import type { RequirementFacts, RequirementGroupMember } from "@/lib/requirements/types";

const EMPTY_FACTS: RequirementFacts = { curricula: [], courses: [], gpas: [], testScores: [], languages: [] };

// Edinburgh-shaped: four English-proficiency test alternatives, any one of which suffices —
// the defect-B motivating case (a valid IELTS score must not be reported as a failed TOEFL
// requirement).
const IELTS: RequirementGroupMember = { id: "ielts", category: "english_proficiency", rawStructuredRule: { kind: "test_score", testName: "IELTS", minScore: 6.5 }, groupRole: "inclusion", title: "IELTS 6.5" };
// The TOEFL alternative carries its scale, and has to: a bare "TOEFL 90" is not a comparable
// number after ETS's January 2026 rescale, and the evaluator now refuses it rather than
// picking a scale (see the "TOEFL rescale" describe below, which asserts that refusal
// directly). Edinburgh's own page states the 0-120 threshold, so recording the scale here is
// what the requirement actually says, not a workaround for the check.
const TOEFL: RequirementGroupMember = {
  id: "toefl",
  category: "english_proficiency",
  rawStructuredRule: { kind: "test_score", testName: "TOEFL", minScore: 90 },
  rawQualifiers: { test_scale: "TOEFL_IBT_0_120_LEGACY" },
  groupRole: "inclusion",
  title: "TOEFL 90",
};
const PTE: RequirementGroupMember = { id: "pte", category: "english_proficiency", rawStructuredRule: { kind: "test_score", testName: "PTE", minScore: 62 }, groupRole: "inclusion", title: "PTE 62" };
const DUOLINGO: RequirementGroupMember = { id: "duolingo", category: "english_proficiency", rawStructuredRule: { kind: "test_score", testName: "Duolingo", minScore: 120 }, groupRole: "inclusion", title: "Duolingo 120" };
const ENGLISH_TEST_ALTERNATIVES = [IELTS, TOEFL, PTE, DUOLINGO];

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

describe("evaluateRequirementGroup — inclusion alternatives (defect B)", () => {
  test("a valid IELTS score makes the whole group met, even though TOEFL/PTE/Duolingo are individually unknown", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const result = evaluateRequirementGroup(ENGLISH_TEST_ALTERNATIVES, facts);
    expect(result.status).toBe("met");
    expect(result.memberResults.get("ielts")!.status).toBe("met");
    expect(result.memberResults.get("toefl")!.status).toBe("unknown");
  });

  test("met wins even when it's the last-ranked alternative evaluated, not the first", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "Duolingo", score: "130" }] };
    const result = evaluateRequirementGroup(ENGLISH_TEST_ALTERNATIVES, facts);
    expect(result.status).toBe("met");
  });

  test("not_met only when every alternative is confidently not_met", () => {
    const facts: RequirementFacts = {
      ...EMPTY_FACTS,
      testScores: [
        { testName: "IELTS", score: "5.0" },
        { testName: "TOEFL", score: "70" },
        { testName: "PTE", score: "40" },
        { testName: "Duolingo", score: "90" },
      ],
    };
    const result = evaluateRequirementGroup(ENGLISH_TEST_ALTERNATIVES, facts);
    expect(result.status).toBe("not_met");
  });

  test("unknown (not not_met) when no test is on file at all — a missing fact might still satisfy one alternative", () => {
    const result = evaluateRequirementGroup(ENGLISH_TEST_ALTERNATIVES, EMPTY_FACTS);
    expect(result.status).toBe("unknown");
  });

  test("needs_manual_review outranks unknown: an unresolved alternative could still turn out met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "not a number" }] };
    const result = evaluateRequirementGroup([IELTS, TOEFL], facts);
    expect(result.status).toBe("needs_manual_review");
  });

  test("every member gets its own individually-computed result in memberResults regardless of the combined verdict", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const result = evaluateRequirementGroup(ENGLISH_TEST_ALTERNATIVES, facts);
    expect(result.memberResults.size).toBe(4);
  });
});

describe("evaluateRequirementGroup — exclusion and qualifier roles never auto-resolve", () => {
  test("an exclusion role forces needs_manual_review even though an inclusion in the same group would otherwise be met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const exclusion: RequirementGroupMember = { id: "excl", category: "international_requirement", rawStructuredRule: null, groupRole: "exclusion", title: "Turkish high school graduates excluded" };
    const result = evaluateRequirementGroup([IELTS, exclusion], facts);
    expect(result.status).toBe("needs_manual_review");
  });

  test("a qualifier role forces needs_manual_review even though the inclusion would otherwise be met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const qualifier: RequirementGroupMember = { id: "qual", category: "english_proficiency", rawStructuredRule: null, groupRole: "qualifier", title: "Must be within 2 years" };
    const result = evaluateRequirementGroup([IELTS, qualifier], facts);
    expect(result.status).toBe("needs_manual_review");
  });

  test("exclusion and qualifier members still get an individually-computed entry in memberResults", () => {
    const exclusion: RequirementGroupMember = { id: "excl", category: "international_requirement", rawStructuredRule: null, groupRole: "exclusion", title: null };
    const result = evaluateRequirementGroup([IELTS, exclusion], EMPTY_FACTS);
    expect(result.memberResults.has("excl")).toBe(true);
  });

  test("a group with no recognized alternatives needs manual review rather than crashing", () => {
    const result = evaluateRequirementGroup([], EMPTY_FACTS);
    expect(result.status).toBe("needs_manual_review");
  });
});

describe("evaluateRequirement — is_exclusion is never auto-resolved", () => {
  // Migration 0052's column comment states this contract; nothing implemented it, because
  // ingestion discarded exclusion records so none could reach the evaluator. They land now
  // (lib/requirements/ingest.ts), so the flag has to be honoured here.
  test("an exclusion row needs manual review even when its structured rule would evaluate met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 90, scale: 100 }] };
    // Ankara University REQ-2026-08-21-9326: an 80/100 GPA bar that EXCLUDES diplomas from
    // schools in Türkiye. Read as an ordinary threshold, a 90 clears it and the student is
    // told they qualify — the exact inversion.
    const asThreshold = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 80, scale: 100 }, facts, { is_exclusion: false });
    expect(asThreshold.status).toBe("met");
    const asExclusion = evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 80, scale: 100 }, facts, { is_exclusion: true });
    expect(asExclusion.status).toBe("needs_manual_review");
  });

  test("an exclusion row needs manual review even when its rule would evaluate not_met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "900" }] };
    expect(evaluateRequirement("standardized_test", { kind: "test_score", testName: "SAT", minScore: 1100 }, facts, { is_exclusion: true }).status).toBe("needs_manual_review");
  });

  test("a row with no exclusion flag keeps its current behaviour, as does one that omits qualifiers entirely", () => {
    // `is_exclusion` is absent on the overwhelming majority of rows and must stay inert
    // there — the flag only ever blocks, it never has to be supplied to get a verdict.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const rule = { kind: "test_score", testName: "IELTS", minScore: 6.5 };
    expect(evaluateRequirement("english_proficiency", rule, facts).status).toBe("met");
    expect(evaluateRequirement("english_proficiency", rule, facts, { is_exclusion: null }).status).toBe("met");
  });

  test("a member flagged is_exclusion cannot satisfy a group even if it sits in the inclusion list", () => {
    // The DB enforces group_role='exclusion' => is_exclusion, but not the reverse, so this
    // row shape is representable and must not count as a qualifying alternative.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const mislabelled: RequirementGroupMember = { ...IELTS, id: "mislabelled", isExclusion: true };
    const result = evaluateRequirementGroup([mislabelled], facts);
    expect(result.status).toBe("needs_manual_review");
    expect(result.memberResults.get("mislabelled")!.status).toBe("needs_manual_review");
  });
});

/**
 * Every test below names the institution and the rule it protects, because these are not
 * abstract shapes — each one is a page that was read on 2026-08-21 and is recorded in
 * data/research/university-requirements/. A test called "handles inverted recency" cannot
 * tell a later reader whether the behaviour still matches what METU publishes; one called
 * "METU rejects certificates taken on or after 2022-12-24" can.
 *
 * The bias is uniform and deliberate. A wrong "met" shown to a student about their own
 * eligibility is the most damaging output this system produces, so several of these assert
 * `needs_manual_review` where a more confident answer looks available. That is the intended
 * verdict, not a placeholder for one.
 */

const IELTS_RULE = { kind: "test_score" as const, testName: "IELTS", minScore: 6.5 };

describe("Case 1 — recency rules that run backwards (METU)", () => {
  // https://iso.metu.edu.tr/en/english-proficiency — "IELTS exams taken on or after the 24th
  // of December 2022 will not be anymore accepted." REQ-2026-08-21-9102.
  const METU_IELTS_CUTOFF = { recency_rule: { direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" } };

  test("METU rejects certificates taken on or after 2022-12-24, even at a qualifying IELTS band", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0", testDate: "2025-06-01" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, METU_IELTS_CUTOFF).status).toBe("not_met");
  });

  test("METU's cut-off fires exactly on 2022-12-24, not the day after", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0", testDate: "2022-12-24" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, METU_IELTS_CUTOFF).status).toBe("not_met");
  });

  test("METU: a max-age reading is unrepresentable — the fresh 2025 IELTS 8.0 is never `met`", () => {
    // The defect this closes. Under "certificates must be at most N years old" a 2025 IELTS
    // 8.0 is the freshest, strongest possible evidence and evaluates `met`. At METU it is
    // precisely the freshness that disqualifies it.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0", testDate: "2025-06-01" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, METU_IELTS_CUTOFF).status).not.toBe("met");
  });

  test("METU: an IELTS predating 2022-12-24 is still not `met` — clearing the stated window is not holding a usable certificate", () => {
    // A 2021 certificate clears METU's exclusion and is, in 2026, years past IELTS's own
    // two-year validity. Both are true and only the first is checkable here, so the honest
    // answer is a review rather than a pass.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0", testDate: "2021-03-01" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, METU_IELTS_CUTOFF).status).toBe("needs_manual_review");
  });

  test("METU: no test date on file means review, never a pass on the number alone", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, METU_IELTS_CUTOFF);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("inverted_recency");
  });

  test("Tilburg's opposite direction: the TOEFL 4-of-6 threshold does not apply to a report predating 2026-01-21", () => {
    // https://www.tilburguniversity.edu/.../english-proficiency-requirements — "TOEFL iBT -
    // test reports obtained on or after January 21, 2026: minimum total score of 4."
    // REQ-2026-08-21-TIL0013. Same field, other direction.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "5", maxScore: "6", testDate: "2025-11-02" }] };
    const result = evaluateRequirement(
      "english_proficiency",
      { kind: "test_score", testName: "TOEFL", minScore: 4 },
      facts,
      { test_scale: "TOEFL_IBT_1_6", recency_rule: { direction: "not_valid_before", boundaryDate: "2026-01-21" } }
    );
    expect(result.status).toBe("not_met");
  });

  test("Ankara's TR-YÖS 'valid for 2 years from the exam date' is never resolved to `met`", () => {
    // REQ-2026-08-21-9323. The window is measured at the point of application and Oryn does
    // not know when the student will apply, so even a recorded exam date does not settle it.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TR-YÖS", score: "300", maxScore: "500", testDate: "2026-05-01" }] };
    const result = evaluateRequirement(
      "entrance_exam",
      { kind: "test_score", testName: "TR-YÖS", minScore: 200 },
      facts,
      { test_scale: "TR_YOS_0_500", recency_rule: { direction: "max_age", value: 2, unit: "years", anchor: "exam_date" } }
    );
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("recency_window");
  });

  test("a recency rule with an unrecognised direction is refused, never defaulted to max-age", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, { recency_rule: { direction: "within_two_years" } });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unreadable_qualifiers");
  });
});

describe("Case 2 — TOEFL scale ambiguity across the January 2026 rescale", () => {
  test("a bare 'TOEFL 100' threshold with no scale recorded is reviewed, not guessed at", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "105", maxScore: "120" }] };
    const result = evaluateRequirement("english_proficiency", { kind: "test_score", testName: "TOEFL", minScore: 100 }, facts);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unstated_scale");
  });

  test("Tilburg's TOEFL iBT 4 of 6 (reports from 2026-01-21) is met by a 1-6 score of 4.5", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "4.5", maxScore: "6" }] };
    expect(evaluateRequirement("english_proficiency", { kind: "test_score", testName: "TOEFL", minScore: 4 }, facts, { test_scale: "TOEFL_IBT_1_6" }).status).toBe("met");
  });

  test("Tilburg's 4-of-6 threshold is NOT met by a legacy 0-120 score of 100, which clears it as a bare number", () => {
    // The whole hazard in one assertion: 100 >= 4 is true and means nothing.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "100", maxScore: "120" }] };
    const result = evaluateRequirement("english_proficiency", { kind: "test_score", testName: "TOEFL", minScore: 4 }, facts, { test_scale: "TOEFL_IBT_1_6" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("incomparable_student_scale");
  });

  test("Erasmus's TOEFL iBT 90 (0-120 comparable) is met by a 95 with no maximum recorded — the number itself places it", () => {
    // REQ-2026-08-21-ERA0041, test_scale TOEFL_IBT_0_120_COMPARABLE. 95 cannot be a 1-6 score.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "95" }] };
    expect(evaluateRequirement("english_proficiency", { kind: "test_score", testName: "TOEFL", minScore: 90 }, facts, { test_scale: "TOEFL_IBT_0_120_COMPARABLE" }).status).toBe("met");
  });

  test("a TOEFL score of 5 sits on the dual-reporting boundary and is reviewed rather than placed on a scale", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "5" }] };
    const result = evaluateRequirement("english_proficiency", { kind: "test_score", testName: "TOEFL", minScore: 90 }, facts, { test_scale: "TOEFL_IBT_0_120_LEGACY" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unstated_student_scale");
    expect(inferStudentScale("TOEFL", "5", null)).toBeNull();
  });

  test("scale_ambiguity outside {none, resolved_unambiguous} blocks evaluation, possibly_discontinued_instrument included", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    for (const ambiguity of ["undated_scale_assumption", "partially_unsatisfiable", "possibly_discontinued_instrument"]) {
      expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, { scale_ambiguity: ambiguity }).status, ambiguity).toBe("needs_manual_review");
    }
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, { scale_ambiguity: "resolved_unambiguous" }).status).toBe("met");
  });

  test("IELTS and SAT thresholds are deliberately NOT made to require a scale qualifier", () => {
    // Only TOEFL and TR-YÖS have a scale boundary. Demanding one everywhere would turn the
    // requirement check into manual review across the board for no truth gained.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1480" }] };
    expect(evaluateRequirement("standardized_test", { kind: "test_score", testName: "SAT", minScore: 1400 }, facts, {}).status).toBe("met");
  });
});

describe("Case 3 — mutually incomparable scales inside one TR-YÖS cycle", () => {
  // One exam, one cycle, three published forms of the same requirement.
  const STUDENT_TR_YOS: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TR-YÖS", score: "440", maxScore: "500" }] };

  test("Hacettepe's 'TR-YÖS: 500 puan üzerinden en az 400 puan' is met by 440 of 500", () => {
    // REQ-2026-08-21-9302 — a score on a stated denominator, the one form that IS comparable.
    expect(evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minScore: 400 }, STUDENT_TR_YOS, { test_scale: "TR_YOS_0_500" }).status).toBe("met");
  });

  test("Ankara's 'Minimum 440 points from TR-YÖS' publishes no denominator and is never compared", () => {
    // REQ-2026-08-21-9320 — the table gives 440 with no "out of" anywhere on either page.
    // Hacettepe's directive establishes TR-YÖS as a 500-point exam, but that is an inference
    // from a different university's document, and importing it here is how a wrong "met" is
    // born.
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minScore: 440 }, STUDENT_TR_YOS, { test_scale: "TR_YOS_SCALE_UNSTATED" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unstated_scale");
  });

  test("METU's TR-YÖS 'first 5th percentile' is a rank, and a stored score is never compared to it", () => {
    // REQ-2026-08-21-9330. Resolving it needs the cycle's national distribution, which Oryn
    // does not hold and cannot derive; a student who knows their score cannot self-assess.
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minPercentileRank: 5 }, STUDENT_TR_YOS);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("incomparable_scale");
  });

  test("METU's percentile is neither met nor not_met by a score of 440, though 440 > 5", () => {
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minPercentileRank: 5 }, STUDENT_TR_YOS);
    expect(result.status).not.toBe("met");
    expect(result.status).not.toBe("not_met");
  });

  test("METU's percentile scale blocks even a rule mistakenly written with a plain minScore", () => {
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minScore: 5 }, STUDENT_TR_YOS, { test_scale: "TR_YOS_PERCENTILE_RANK" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("incomparable_scale");
  });

  test("Hacettepe's 400-of-500 is not compared against a TR-YÖS result whose denominator is unknown", () => {
    const noDenominator: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TR-YÖS", score: "440" }] };
    const result = evaluateRequirement("entrance_exam", { kind: "test_score", testName: "TR-YÖS", minScore: 400 }, noDenominator, { test_scale: "TR_YOS_0_500" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unstated_student_scale");
  });
});

describe("Case 4 — score provenance is per-institution, never a property of the test", () => {
  // The same student, the same certificate, two official UK pages, opposite answers.
  const OSR_SEVEN: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0", provenance: "one_skill_retake" }] };

  test("Southampton accepts IELTS One Skill Retake, so a 7.0 obtained that way is met", () => {
    // REQ-2026-08-21-9211: "(IELTS) Academic UKVI SELT (including One Skill Retake)". No
    // excluded list on the requirement, so provenance never enters the comparison.
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, OSR_SEVEN, {}).status).toBe("met");
  });

  test("Edinburgh refuses IELTS One Skill Retake, so the identical 7.0 is not met there", () => {
    // REQ-2026-08-21-3020: "We do not accept IELTS One Skill Retake to meet our English
    // language requirements."
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, OSR_SEVEN, { excluded_provenances: ["one_skill_retake"] }).status).toBe("not_met");
  });

  test("Edinburgh's refusal does not leak to Southampton: the list lives on the requirement, not the test", () => {
    const atSouthampton = evaluateRequirement("english_proficiency", IELTS_RULE, OSR_SEVEN, {});
    const atEdinburgh = evaluateRequirement("english_proficiency", IELTS_RULE, OSR_SEVEN, { excluded_provenances: ["one_skill_retake"] });
    expect(atSouthampton.status).toBe("met");
    expect(atEdinburgh.status).toBe("not_met");
  });

  test("Groningen refuses MyBest and One Skill Retake, so an unknown provenance is reviewed rather than passed", () => {
    // REQ-2026-08-21-GRO0006. Nothing records provenance on a student's score today, so this
    // is the branch production actually takes — and it is the outcome the research lane asked
    // for by name: "must still evaluate to needs_manual_review, not met".
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, { excluded_provenances: ["one_skill_retake", "mybest"] });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("named_exclusion");
  });

  test("TU Delft accepts One Skill Retake while refusing IELTS Online and Indicator — per-variant, not a blanket policy", () => {
    // REQ-2026-08-21-DEL0027, which states both directions on one page.
    const osr: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.5", provenance: "one_skill_retake" }] };
    const online: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.5", provenance: "online_edition" }] };
    const delft = { excluded_provenances: ["online_edition", "indicator"] };
    const rule = { kind: "test_score" as const, testName: "IELTS", minScore: 7.0 };
    expect(evaluateRequirement("english_proficiency", rule, osr, delft).status).toBe("met");
    expect(evaluateRequirement("english_proficiency", rule, online, delft).status).toBe("not_met");
  });

  test("a provenance outside the known vocabulary is refused rather than ignored", () => {
    // Fails closed: an unrecognised exclusion must never silently become no exclusion at all.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, { excluded_provenances: ["taken_on_a_tuesday"] });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unreadable_qualifiers");
  });

  test("Edinburgh's exclusion never rescues a score that misses the number anyway", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "5.0" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, { excluded_provenances: ["mybest"] }).status).toBe("not_met");
  });
});

describe("Case 5 — TU Dublin's age bar is unevaluable from birth year alone", () => {
  // REQ-2026-08-21-9415: "Applicants must be 18 before 31st December (September Start
  // programmes) or 31st May (January Start programmes)."
  const TU_DUBLIN_AGE_BAR = { evaluation_gate: "age_bar" };

  test("TU Dublin's 'must be 18 before 31 December' is never met and never not_met", () => {
    const result = evaluateRequirement("international_requirement", null, EMPTY_FACTS, TU_DUBLIN_AGE_BAR);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("age_bar");
  });

  test("TU Dublin's age bar survives a structured rule being attached to the row", () => {
    // The gate is read before the rule, so nothing authored later can convert it.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts, TU_DUBLIN_AGE_BAR).status).toBe("needs_manual_review");
  });

  test("TU Dublin's age bar explains the birth-year limitation instead of blaming the student's data", () => {
    // Phase 68: Oryn should say when it does not know enough. The privacy commitment
    // (AGENTS.md Phase 2, birth year only) is the reason, and the student is told so.
    const result = evaluateRequirement("international_requirement", null, EMPTY_FACTS, TU_DUBLIN_AGE_BAR);
    expect(result.reasoning).toMatch(/birth year/i);
    expect(result.reasoning).not.toMatch(/review it yourself/i);
  });
});

describe("Case 6 — binding round semantics are a commitment, not a checkbox", () => {
  const EARLY_DECISION = { evaluation_gate: "binding_commitment" };

  test("a US Early Decision companion requirement needs review even with a structured rule attached", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "SAT", score: "1550" }] };
    const result = evaluateRequirement("standardized_test", { kind: "test_score", testName: "SAT", minScore: 1400 }, facts, EARLY_DECISION);
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("binding_commitment");
  });

  test("Early Decision copy states the obligation to enrol and does not read like a missing essay", () => {
    const binding = evaluateRequirement("supplemental_requirement", null, EMPTY_FACTS, EARLY_DECISION);
    const essay = evaluateRequirement("essay", null, EMPTY_FACTS);
    expect(binding.status).toBe(essay.status);
    expect(binding.reasoning).not.toBe(essay.reasoning);
    expect(binding.reasoning).toMatch(/enrol/i);
    expect(binding.reasoning).toMatch(/withdraw your other applications/i);
    expect(essay.reasoning).toMatch(/review it yourself/i);
  });

  test("Restrictive Early Action is gated even on a category the evaluator would otherwise score", () => {
    // The gate is checked before the category, so filing the record under an evaluable
    // category cannot route around it.
    const facts: RequirementFacts = { ...EMPTY_FACTS, gpas: [{ value: 4.0, scale: 4 }] };
    expect(evaluateRequirement("minimum_grade", { kind: "minimum_grade", minGpa: 3.5, scale: 4 }, facts, EARLY_DECISION).status).toBe("needs_manual_review");
  });

  test("an unrecognised evaluation gate blocks rather than being dropped", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, { evaluation_gate: "some_future_reason" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("unreadable_qualifiers");
  });
});

describe("qualifiers only ever make a verdict more cautious", () => {
  test("every gate turns an otherwise-met IELTS 8.0 into a review, and none turns anything into met", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts).status).toBe("met");
    for (const gate of ["inverted_recency", "recency_window", "unstated_scale", "incomparable_scale", "named_exclusion", "eligibility_restriction", "age_bar", "source_conflict", "historical", "binding_commitment"]) {
      const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, { evaluation_gate: gate });
      expect(result.status, gate).toBe("needs_manual_review");
      expect(result.reasoning.length, gate).toBeGreaterThan(0);
    }
  });

  test("no qualifier upgrades `unknown` (nothing on file) into a verdict", () => {
    const qualifierSets: unknown[] = [{ excluded_provenances: ["mybest"] }, { recency_rule: { direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" } }];
    for (const qualifiers of qualifierSets) {
      expect(evaluateRequirement("english_proficiency", IELTS_RULE, EMPTY_FACTS, qualifiers).status).toBe("unknown");
    }
  });

  test("omitting qualifiers entirely leaves every pre-existing verdict byte-identical", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "7.0" }] };
    expect(evaluateRequirement("english_proficiency", IELTS_RULE, facts)).toEqual(evaluateRequirement("english_proficiency", IELTS_RULE, facts, {}));
  });

  test("a gated alternative inside a group does not block a different alternative that is cleanly met", () => {
    // METU's IELTS route is gated; a student holding a qualifying TOEFL still passes the group.
    const gatedIelts: RequirementGroupMember = { ...IELTS, rawQualifiers: { evaluation_gate: "inverted_recency" } };
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "100", maxScore: "120" }, { testName: "IELTS", score: "8.0" }] };
    const result = evaluateRequirementGroup([gatedIelts, TOEFL], facts);
    expect(result.status).toBe("met");
    expect(result.memberResults.get("ielts")!.status).toBe("needs_manual_review");
  });
});

/**
 * The two features above were built on separate branches and met in this file. `is_exclusion`
 * (migration 0052, applied) came from the representability work; the 0056 qualifier columns
 * came from the confident-wrong-answers work. One row can carry both, and the merge resolved
 * them into a single check, so the interaction is pinned here rather than inferred from
 * either side's tests.
 */
describe("exclusion rows and 0056 qualifiers on the same requirement", () => {
  test("an exclusion carrying a recency qualifier is reviewed, and is never met", () => {
    // Ankara-shaped exclusion + METU-shaped inverted recency on one row. The exclusion is
    // resolved before the rule or any other qualifier is consulted; even if it were not,
    // a recency rule never permits `met` either, so no ordering of the two yields a pass.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0", testDate: "2021-03-01" }] };
    const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, {
      is_exclusion: true,
      recency_rule: { direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" },
    });
    expect(result.status).toBe("needs_manual_review");
    expect(result.status).not.toBe("met");
    expect(result.reviewReason).toBe("eligibility_restriction");
  });

  test("an exclusion carrying a resolvable test scale is still reviewed, not scored", () => {
    // The qualifier that would otherwise licence a clean comparison does not rescue the row.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "105", maxScore: "120" }] };
    const result = evaluateRequirement(
      "english_proficiency",
      { kind: "test_score", testName: "TOEFL", minScore: 90 },
      facts,
      { is_exclusion: true, test_scale: "TOEFL_IBT_0_120_COMPARABLE" }
    );
    expect(result.status).toBe("needs_manual_review");
  });

  test("an explicit evaluation_gate on an exclusion row keeps its own, more specific copy", () => {
    // Both block; the gate is the more precise statement of why, so it wins the wording.
    const result = evaluateRequirement("international_requirement", null, EMPTY_FACTS, { is_exclusion: true, evaluation_gate: "age_bar" });
    expect(result.status).toBe("needs_manual_review");
    expect(result.reviewReason).toBe("age_bar");
  });

  test("a bare boolean fourth argument fails closed instead of reading as 'no qualifiers'", () => {
    // The fourth argument used to be `isExclusion: boolean` and is now the requirement row.
    // No caller passes a boolean any more, and if one ever does again it must land on a
    // review — a stale `false` silently meaning "nothing to check here" is the one outcome
    // this whole file exists to prevent.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    for (const stale of [true, false]) {
      const result = evaluateRequirement("english_proficiency", IELTS_RULE, facts, stale);
      expect(result.status, String(stale)).toBe("needs_manual_review");
      expect(result.reviewReason, String(stale)).toBe("unreadable_qualifiers");
    }
  });

  test("an exclusion member blocks a whole group, where a merely gated member does not", () => {
    // The distinction the merge had to preserve on both sides: a gate confines itself to the
    // alternative carrying it (any other alternative may still satisfy the group), while an
    // exclusion is a carve-out on the group and condemns all of it.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "TOEFL", score: "100", maxScore: "120" }, { testName: "IELTS", score: "8.0" }] };
    const gated: RequirementGroupMember = { ...IELTS, rawQualifiers: { evaluation_gate: "inverted_recency" } };
    expect(evaluateRequirementGroup([gated, TOEFL], facts).status).toBe("met");

    const excluded: RequirementGroupMember = { ...IELTS, isExclusion: true };
    expect(evaluateRequirementGroup([excluded, TOEFL], facts).status).toBe("needs_manual_review");
  });

  test("a group member carrying both an exclusion flag and its own qualifiers keeps both", () => {
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    const member: RequirementGroupMember = { ...IELTS, isExclusion: true, rawQualifiers: { test_scale: "IELTS_0_9" } };
    const result = evaluateRequirementGroup([member], facts);
    expect(result.status).toBe("needs_manual_review");
    expect(result.memberResults.get("ielts")!.reviewReason).toBe("eligibility_restriction");
  });

  test("a group member whose qualifiers are unreadable fails closed rather than being merged away", () => {
    // Folding `isExclusion` into `rawQualifiers` must not quietly discard an unreadable value.
    const facts: RequirementFacts = { ...EMPTY_FACTS, testScores: [{ testName: "IELTS", score: "8.0" }] };
    const member: RequirementGroupMember = { ...IELTS, isExclusion: false, rawQualifiers: "not-an-object" };
    expect(evaluateRequirementGroup([member], facts).memberResults.get("ielts")!.reviewReason).toBe("unreadable_qualifiers");
  });
});
