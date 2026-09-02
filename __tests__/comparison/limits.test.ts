import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STANDARD_COMPARE_MAX,
  MONTHLY_COMPARISON_LIMIT,
  resolveComparisonWidthCeiling,
  canonicalComparisonKey,
  isComparisonQuotaExhausted,
} from "@/lib/comparison/limits";
import { COMPARE_MAX } from "@/lib/universities/compare-constants";

describe("resolveComparisonWidthCeiling", () => {
  test("ultra keeps today's unchanged ceiling (COMPARE_MAX)", () => {
    expect(resolveComparisonWidthCeiling("ultra")).toBe(COMPARE_MAX);
  });

  test("standard is capped at 2, the founder's own number", () => {
    expect(resolveComparisonWidthCeiling("standard")).toBe(STANDARD_COMPARE_MAX);
    expect(STANDARD_COMPARE_MAX).toBe(2);
  });

  test("standard's ceiling is strictly narrower than ultra's", () => {
    expect(resolveComparisonWidthCeiling("standard")).toBeLessThan(resolveComparisonWidthCeiling("ultra"));
  });
});

describe("canonicalComparisonKey", () => {
  test("is order-independent — {A,B} and {B,A} are the same comparison", () => {
    expect(canonicalComparisonKey("university", ["b", "a"])).toBe(canonicalComparisonKey("university", ["a", "b"]));
  });

  test("a different item type never collides, even with identical ids", () => {
    expect(canonicalComparisonKey("university", ["a", "b"])).not.toBe(canonicalComparisonKey("opportunity", ["a", "b"]));
  });

  test("a genuinely different set of ids produces a different key", () => {
    expect(canonicalComparisonKey("university", ["a", "b"])).not.toBe(canonicalComparisonKey("university", ["a", "c"]));
  });

  test("does not mutate the caller's array (sorts a copy)", () => {
    const ids = ["b", "a"];
    canonicalComparisonKey("university", ids);
    expect(ids).toEqual(["b", "a"]);
  });
});

describe("isComparisonQuotaExhausted", () => {
  test("ultra is never exhausted, regardless of usage", () => {
    expect(isComparisonQuotaExhausted("ultra", { remaining: 0, usedIsKnown: true })).toBe(false);
  });

  test("standard is exhausted once remaining reaches zero", () => {
    expect(isComparisonQuotaExhausted("standard", { remaining: 0, usedIsKnown: true })).toBe(true);
  });

  test("standard is not exhausted a moment before zero", () => {
    expect(isComparisonQuotaExhausted("standard", { remaining: 1, usedIsKnown: true })).toBe(false);
  });

  test("an unreadable count permits the comparison — fail-open, not fail-closed", () => {
    expect(isComparisonQuotaExhausted("standard", { remaining: 0, usedIsKnown: false })).toBe(false);
  });

  test("the shared monthly limit is 5, one pool across universities and opportunities", () => {
    expect(MONTHLY_COMPARISON_LIMIT).toBe(5);
  });
});

/**
 * Same guard as __tests__/universities/compare-constants.test.ts, for the same reason:
 * this module is meant to be safely importable from the client-side picker
 * (useCompare/useOpportunityCompare) as well as server pages. A "use client"/"use server"
 * directive here would turn every export into a client-reference proxy for a server
 * importer (or vice versa) rather than the real value — see that file's own header for the
 * live bug this class of mistake already caused once in this exact feature area.
 */
describe("lib/comparison/limits.ts stays a plain, client/server-safe module", () => {
  test("carries no client/server directive", () => {
    const source = readFileSync(join(__dirname, "..", "..", "lib/comparison/limits.ts"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(/^\s*["']use server["']/m);
  });

  test("does not import server-only or Supabase — must stay safe for a future client importer", () => {
    const source = readFileSync(join(__dirname, "..", "..", "lib/comparison/limits.ts"), "utf8");
    expect(source).not.toContain('"server-only"');
    expect(source).not.toContain("@/lib/supabase/");
  });
});
