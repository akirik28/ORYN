import { describe, test, expect } from "vitest";
import { MINIMUM_SIGNUP_AGE_YEARS, meetsMinimumSignupAge } from "@/lib/legal/age-policy";

/**
 * This is the one piece of logic every age-gated surface in the product now shares:
 * completeOnboarding() (app/(onboarding)/onboarding/actions.ts), the onboarding
 * wizard's client-side pre-check (features/onboarding/onboarding-wizard.tsx), the
 * confirm-age backfill flow (app/(confirm-age)/confirm-age/actions.ts), and settings'
 * updateBirthYear (app/(app)/settings/actions.ts). A bug here is a bug everywhere at
 * once, so this file tests the function directly and exhaustively rather than relying
 * on each call site's own (thinner) coverage to catch it.
 */

describe("MINIMUM_SIGNUP_AGE_YEARS", () => {
  test("is 14 — see lib/legal/age-policy.ts's own header for the argument", () => {
    // Locks the actual number, not just "some number", so a future change is a
    // deliberate diff to this assertion, never an accidental one to the constant.
    expect(MINIMUM_SIGNUP_AGE_YEARS).toBe(14);
  });
});

describe("meetsMinimumSignupAge", () => {
  const currentYear = new Date().getFullYear();

  test("someone born exactly MINIMUM_SIGNUP_AGE_YEARS years ago meets it", () => {
    expect(meetsMinimumSignupAge(currentYear - MINIMUM_SIGNUP_AGE_YEARS)).toBe(true);
  });

  test("someone born one year later than the minimum does not meet it", () => {
    expect(meetsMinimumSignupAge(currentYear - MINIMUM_SIGNUP_AGE_YEARS + 1)).toBe(false);
  });

  test("someone well above the minimum meets it", () => {
    expect(meetsMinimumSignupAge(currentYear - 30)).toBe(true);
  });

  test("someone well below the minimum does not meet it", () => {
    expect(meetsMinimumSignupAge(currentYear - 5)).toBe(false);
  });

  test("a birth year equal to the current year (age 0) does not meet it", () => {
    expect(meetsMinimumSignupAge(currentYear)).toBe(false);
  });

  test("an explicit currentYear argument is honoured instead of the real clock", () => {
    // Exercises the injectable-clock path directly rather than only ever relying on
    // Date.now() at test-run time, so this assertion is stable regardless of when the
    // suite runs and independently proves the parameter is actually wired through.
    expect(meetsMinimumSignupAge(2000, 2014)).toBe(true); // exactly 14 in 2014
    expect(meetsMinimumSignupAge(2000, 2013)).toBe(false); // only 13 in 2013
  });

  test("the threshold is >=, not >: age exactly at the line passes", () => {
    // Regression guard against an off-by-one — this is the single most consequential
    // boundary in the function, since it's the exact line the whole gate exists to draw.
    expect(meetsMinimumSignupAge(2010, 2024)).toBe(true); // turns 14 in 2024
    expect(meetsMinimumSignupAge(2011, 2024)).toBe(false); // turns 13 in 2024
  });
});
