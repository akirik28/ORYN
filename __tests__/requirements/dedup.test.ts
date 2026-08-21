import { describe, expect, test } from "vitest";
import { isDuplicateRequirement, statesTheSameFact } from "@/lib/requirements/dedup";

describe("isDuplicateRequirement", () => {
  test("flags near-identical titles in the same category and program scope as duplicates", () => {
    const a = { category: "minimum_grade" as const, title: "Minimum GPA", programId: null };
    const b = { category: "minimum_grade" as const, title: "Minimum GPA requirement", programId: null };
    expect(isDuplicateRequirement(a, b)).toBe(true);
  });

  test("does not flag the same title in a different category as a duplicate", () => {
    const a = { category: "minimum_grade" as const, title: "3.5 or higher", programId: null };
    const b = { category: "standardized_test" as const, title: "3.5 or higher", programId: null };
    expect(isDuplicateRequirement(a, b)).toBe(false);
  });

  test("does not flag the same requirement text as a duplicate when scoped to different programs", () => {
    const a = { category: "required_subject" as const, title: "Calculus required", programId: "program-a" };
    const b = { category: "required_subject" as const, title: "Calculus required", programId: "program-b" };
    expect(isDuplicateRequirement(a, b)).toBe(false);
  });

  test("does not flag unrelated titles in the same category as duplicates", () => {
    const a = { category: "required_subject" as const, title: "Calculus required", programId: null };
    const b = { category: "required_subject" as const, title: "Studio art portfolio", programId: null };
    expect(isDuplicateRequirement(a, b)).toBe(false);
  });

  test("does not merge two thresholds that read alike but state different numbers", () => {
    const a = { category: "english_proficiency" as const, title: "TOEFL-iBT (including Home Edition) from 21 January 2026: total 4.5 with at least 4.0 in each component.", programId: null };
    const b = { category: "english_proficiency" as const, title: "TOEFL-iBT (including Home Edition) before 21 January 2026: total 92 with at least 20 in each component.", programId: null };
    expect(isDuplicateRequirement(a, b)).toBe(false);
  });
});

describe("statesTheSameFact — similarity is necessary but not sufficient", () => {
  // Edinburgh REQ-2026-08-21-4004 vs REQ-2026-08-21-4010: two TOEFL thresholds on two
  // different score scales, split by ETS's 21 January 2026 rescale. Jaccard similarity puts
  // them well over the 0.6 threshold, so word overlap alone merges them and destroys the
  // route a student with a pre-2026 certificate qualifies under.
  const TOEFL_NEW = "TOEFL-iBT (including Home Edition) from 21 January 2026: total 4.5 with at least 4.0 in each component.";
  const TOEFL_LEGACY = "TOEFL-iBT (including Home Edition) before 21 January 2026: total 92 with at least 20 in each component.";

  test("two titles carrying different numbers are different facts however alike they read", () => {
    expect(statesTheSameFact(TOEFL_NEW, TOEFL_LEGACY)).toBe(false);
  });

  test("an exact re-ingest of the same fact is still caught", () => {
    expect(statesTheSameFact(TOEFL_NEW, TOEFL_NEW)).toBe(true);
  });

  test("a reworded title carrying the same numbers is still caught", () => {
    expect(statesTheSameFact("IELTS Academic: total 6.5 with at least 5.5 in each component", "IELTS Academic total of 6.5, with at least 5.5 in each component!")).toBe(true);
  });

  test("titles with no numbers are unaffected — the case the Jaccard match was introduced for", () => {
    expect(statesTheSameFact("Minimum GPA", "Minimum GPA requirement")).toBe(true);
  });

  test("differing numbers do not rescue titles that were never similar in the first place", () => {
    expect(statesTheSameFact("IELTS Academic total 6.5", "Studio art portfolio")).toBe(false);
  });

  test("decimal separators are compared by value, not by punctuation", () => {
    expect(statesTheSameFact("Minimum overall band score of 6,5 on the test", "Minimum overall band score of 6.5 on the test")).toBe(true);
  });
});
