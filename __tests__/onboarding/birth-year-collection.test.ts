import { describe, test, expect } from "vitest";
import { CompleteOnboardingSchema } from "@/lib/validation/onboarding";

/**
 * `birth_year` was readable in four places and writable in none: not onboarding, not the
 * profile, not settings. Measured on the live project 2026-08-31, 6 of 11 accounts had it
 * null and 5 of those had completed onboarding — while 139 of the 276 active opportunities
 * carry an age limit that `lib/counselor/eligibility.ts` will not guess at, so those
 * accounts saw "this has an age requirement Oryn can't check" on every one of them.
 *
 * These lock the collection contract, which is the part that was missing. The eligibility
 * logic downstream already worked and has its own coverage.
 */

const currentYear = new Date().getFullYear();

const VALID_INPUT = {
  goals: [],
  country: "Turkey",
  schoolName: "Some School",
  graduationYear: currentYear + 1,
  birthYear: currentYear - 16,
  curriculum: "ib" as const,
  interests: [],
  targetGeographies: [],
};

describe("onboarding collects birth year", () => {
  test("a birth year in range is accepted and preserved", () => {
    const parsed = CompleteOnboardingSchema.safeParse(VALID_INPUT);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.birthYear).toBe(currentYear - 16);
  });

  test("omitting it fails — an optional field here reproduces the null-profile bug", () => {
    const withoutBirthYear: Record<string, unknown> = { ...VALID_INPUT };
    delete withoutBirthYear.birthYear;
    expect(CompleteOnboardingSchema.safeParse(withoutBirthYear).success).toBe(false);
  });

  test("implausible years are rejected at both ends", () => {
    // A four-digit typo that would otherwise make the student 3 years old.
    expect(CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: currentYear - 3 }).success).toBe(false);
    expect(CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: currentYear - 101 }).success).toBe(false);
  });

  test("the bounds are wide enough not to reject unusual-but-real students", () => {
    // The audience is 14-18, but the schema must not be the thing that decides that —
    // adult accounts exist (lib/social/age.ts's isLikelyAdult) and the spec anticipates
    // older cohorts later.
    expect(CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: currentYear - 10 }).success).toBe(true);
    expect(CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: currentYear - 100 }).success).toBe(true);
    expect(CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: currentYear - 45 }).success).toBe(true);
  });

  test("a year arriving as a string from a number input still parses", () => {
    // The wizard's <Input type="number"> hands over `e.target.value`, a string.
    const parsed = CompleteOnboardingSchema.safeParse({ ...VALID_INPUT, birthYear: String(currentYear - 17) });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.birthYear).toBe(currentYear - 17);
  });
});
