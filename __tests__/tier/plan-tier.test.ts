import { describe, expect, test } from "vitest";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import type { Profile } from "@/types/database";

describe("resolvePlanTier", () => {
  test("returns the real value when the column exists and is set", () => {
    expect(resolvePlanTier({ plan_tier: "ultra" })).toBe("ultra");
    expect(resolvePlanTier({ plan_tier: "standard" })).toBe("standard");
  });

  test("defaults to standard when the column is absent (migration 0089 unapplied)", () => {
    // The type claims plan_tier is always present; a real row from an environment where
    // 0089 hasn't run yet doesn't have it — this cast simulates exactly that gap.
    expect(resolvePlanTier({} as Pick<Profile, "plan_tier">)).toBe("standard");
  });
});
