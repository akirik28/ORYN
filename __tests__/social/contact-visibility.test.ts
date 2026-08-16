import { describe, expect, test } from "vitest";
import { canViewContactField, isPhoneVisibilityAllowed } from "@/lib/social/contact-visibility";
import { isLikelyAdult } from "@/lib/social/age";

describe("canViewContactField", () => {
  test("owner always sees every field, regardless of visibility", () => {
    expect(canViewContactField("private", true, false)).toBe(true);
    expect(canViewContactField("connections", true, false)).toBe(true);
    expect(canViewContactField("public", true, false)).toBe(true);
  });

  // Spec: stranger, pending, disconnected, and blocked all collapse to the same
  // "public only" tier — there is no intermediate tier for any of them.
  test.each([
    ["stranger", false],
    ["pending/disconnected/blocked (same non-accepted tier)", false],
  ])("%s: public field visible, connections/private are not", (_label, hasAcceptedConnection) => {
    expect(canViewContactField("public", false, hasAcceptedConnection)).toBe(true);
    expect(canViewContactField("connections", false, hasAcceptedConnection)).toBe(false);
    expect(canViewContactField("private", false, hasAcceptedConnection)).toBe(false);
  });

  test("accepted connection sees public AND connections, never private", () => {
    expect(canViewContactField("public", false, true)).toBe(true);
    expect(canViewContactField("connections", false, true)).toBe(true);
    expect(canViewContactField("private", false, true)).toBe(false);
  });
});

describe("isPhoneVisibilityAllowed — minor safety", () => {
  test("private and connections are always allowed, any age", () => {
    expect(isPhoneVisibilityAllowed("private", false)).toBe(true);
    expect(isPhoneVisibilityAllowed("connections", false)).toBe(true);
    expect(isPhoneVisibilityAllowed("private", true)).toBe(true);
    expect(isPhoneVisibilityAllowed("connections", true)).toBe(true);
  });

  test("public is rejected for a minor", () => {
    expect(isPhoneVisibilityAllowed("public", false)).toBe(false);
  });

  test("public is allowed for a confirmed adult", () => {
    expect(isPhoneVisibilityAllowed("public", true)).toBe(true);
  });
});

describe("isLikelyAdult", () => {
  test("unknown birth year (null) is never treated as adult — the safe default", () => {
    expect(isLikelyAdult(null)).toBe(false);
  });

  test("exactly 18 by year arithmetic counts as adult", () => {
    expect(isLikelyAdult(2008, 2026)).toBe(true);
  });

  test("17 by year arithmetic does not", () => {
    expect(isLikelyAdult(2009, 2026)).toBe(false);
  });

  test("well over 18 counts as adult", () => {
    expect(isLikelyAdult(1990, 2026)).toBe(true);
  });
});
