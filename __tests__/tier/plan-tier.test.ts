import { describe, expect, test } from "vitest";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import type { Profile } from "@/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoInDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

describe("resolvePlanTier", () => {
  test("returns the real value when the column exists and is set", () => {
    expect(resolvePlanTier({ plan_tier: "ultra", ultra_gift_expires_at: null })).toBe("ultra");
    expect(resolvePlanTier({ plan_tier: "standard", ultra_gift_expires_at: null })).toBe("standard");
  });

  test("defaults to standard when the column is absent (migration 0089 unapplied)", () => {
    // The type claims plan_tier is always present; a real row from an environment where
    // 0089 hasn't run yet doesn't have it — this cast simulates exactly that gap.
    expect(resolvePlanTier({} as Pick<Profile, "plan_tier" | "ultra_gift_expires_at">)).toBe("standard");
  });

  test("a future expiry makes a standard-tier profile read as ultra", () => {
    expect(resolvePlanTier({ plan_tier: "standard", ultra_gift_expires_at: isoInDays(6) })).toBe("ultra");
    expect(resolvePlanTier({ plan_tier: "standard", ultra_gift_expires_at: isoInDays(0.001) })).toBe("ultra");
  });

  test("a past expiry does not make a standard-tier profile read as ultra", () => {
    expect(resolvePlanTier({ plan_tier: "standard", ultra_gift_expires_at: isoInDays(-0.001) })).toBe("standard");
    expect(resolvePlanTier({ plan_tier: "standard", ultra_gift_expires_at: isoInDays(-30) })).toBe("standard");
  });

  test("a permanent ultra tier is unaffected by gift state either way", () => {
    expect(resolvePlanTier({ plan_tier: "ultra", ultra_gift_expires_at: isoInDays(-30) })).toBe("ultra");
    expect(resolvePlanTier({ plan_tier: "ultra", ultra_gift_expires_at: null })).toBe("ultra");
  });
});
