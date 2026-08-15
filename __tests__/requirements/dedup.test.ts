import { describe, expect, test } from "vitest";
import { isDuplicateRequirement } from "@/lib/requirements/dedup";

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
});
