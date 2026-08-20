import { describe, expect, test } from "vitest";
import { currentGradeLevel, gradeMatchesEligibility } from "@/lib/profile/grade-level";

describe("currentGradeLevel", () => {
  test("no graduation year on file -> null, never guessed", () => {
    expect(currentGradeLevel(null)).toBeNull();
  });

  test("a rising senior in August (new academic year just started) is grade 12", () => {
    expect(currentGradeLevel(2027, new Date("2026-08-20T00:00:00Z"))).toBe(12);
  });

  test("the same student is still grade 12 in the spring before graduating, not yet rolled over", () => {
    expect(currentGradeLevel(2027, new Date("2027-03-15T00:00:00Z"))).toBe(12);
  });

  test("a junior (one year further from graduation) is grade 11", () => {
    expect(currentGradeLevel(2028, new Date("2026-08-20T00:00:00Z"))).toBe(11);
  });

  test("a freshman (three years out) is grade 9", () => {
    expect(currentGradeLevel(2030, new Date("2026-08-20T00:00:00Z"))).toBe(9);
  });

  test("too many years out (not high-school age yet) -> null, not extrapolated to grade 8/7/...", () => {
    expect(currentGradeLevel(2031, new Date("2026-08-20T00:00:00Z"))).toBeNull();
  });

  test("already graduated (graduation year in the past, past the summer rollover) -> null", () => {
    expect(currentGradeLevel(2026, new Date("2026-08-20T00:00:00Z"))).toBeNull();
  });
});

describe("gradeMatchesEligibility", () => {
  test("numeric string match", () => {
    expect(gradeMatchesEligibility(11, ["9", "10", "11", "12"])).toBe(true);
  });

  test("no match", () => {
    expect(gradeMatchesEligibility(9, ["11", "12"])).toBe(false);
  });

  test("non-numeric entries never match, never throw", () => {
    expect(gradeMatchesEligibility(12, ["rising seniors"])).toBe(false);
  });

  test("empty eligibility list never matches (caller's responsibility to skip the check entirely when there's no restriction)", () => {
    expect(gradeMatchesEligibility(11, [])).toBe(false);
  });
});
