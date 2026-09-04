import { describe, test, expect } from "vitest";
import { resolveParentEffectiveTier } from "@/lib/tier/parent-tier";

const STANDARD = { plan_tier: "standard" as const, ultra_gift_expires_at: null, paid_ultra_expires_at: null };
const ULTRA = { plan_tier: "ultra" as const, ultra_gift_expires_at: null, paid_ultra_expires_at: null };
const ACTIVE_GIFT = { plan_tier: "standard" as const, ultra_gift_expires_at: new Date(Date.now() + 86_400_000).toISOString(), paid_ultra_expires_at: null };
const EXPIRED_GIFT = { plan_tier: "standard" as const, ultra_gift_expires_at: new Date(Date.now() - 86_400_000).toISOString(), paid_ultra_expires_at: null };
const ACTIVE_PAID_SUBSCRIPTION = { plan_tier: "standard" as const, ultra_gift_expires_at: null, paid_ultra_expires_at: new Date(Date.now() + 86_400_000).toISOString() };
const LAPSED_PAID_SUBSCRIPTION = { plan_tier: "standard" as const, ultra_gift_expires_at: null, paid_ultra_expires_at: new Date(Date.now() - 86_400_000).toISOString() };

describe("resolveParentEffectiveTier", () => {
  test("active link, standard student -> standard", () => {
    expect(resolveParentEffectiveTier("active", STANDARD)).toBe("standard");
  });

  test("active link, ultra (permanent) student -> ultra", () => {
    expect(resolveParentEffectiveTier("active", ULTRA)).toBe("ultra");
  });

  test("active link, student with an active Ultra gift -> ultra", () => {
    expect(resolveParentEffectiveTier("active", ACTIVE_GIFT)).toBe("ultra");
  });

  test("active link, student's Ultra gift has expired -> standard", () => {
    expect(resolveParentEffectiveTier("active", EXPIRED_GIFT)).toBe("standard");
  });

  test("pending link inherits nothing, even from an Ultra student -- G1's boundary applies before confirmation too", () => {
    expect(resolveParentEffectiveTier("pending", ULTRA)).toBe("standard");
  });

  test("revoked link inherits nothing, even from an Ultra student", () => {
    expect(resolveParentEffectiveTier("revoked", ULTRA)).toBe("standard");
  });

  test("revoked link on a student with an active gift still inherits nothing -- status gates before tier is even looked at", () => {
    expect(resolveParentEffectiveTier("revoked", ACTIVE_GIFT)).toBe("standard");
  });

  /** 2026-09-04, payment-provider seam: a parent inherits a paid subscription the identical
   *  way they inherit a gift -- same expiry mechanism, one column over (lib/tier/plan-
   *  tier.ts's own resolvePlanTier is what's actually being exercised here in both cases). */
  test("active link, student with an active paid subscription -> ultra", () => {
    expect(resolveParentEffectiveTier("active", ACTIVE_PAID_SUBSCRIPTION)).toBe("ultra");
  });

  test("active link, student's paid subscription has lapsed (canceled or a failed renewal) -> standard", () => {
    expect(resolveParentEffectiveTier("active", LAPSED_PAID_SUBSCRIPTION)).toBe("standard");
  });

  test("revoked link on a student with an active paid subscription still inherits nothing", () => {
    expect(resolveParentEffectiveTier("revoked", ACTIVE_PAID_SUBSCRIPTION)).toBe("standard");
  });
});
