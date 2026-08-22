import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Source-text pin, not a behavioral test, and that's a deliberate, stated gap rather than
 * a silent one: recomputeCareerProfile() reads real data (assembleScoringFacts, profiles,
 * skills, featured_items, contact_info) via the RLS-scoped client BEFORE reaching its own
 * admin-client check, unlike refreshOpportunityMatches/refreshRequirementEvaluations
 * (see __tests__/opportunities/refresh-matches-admin-degradation.test.ts, which IS
 * empirical -- those two check admin availability before touching any client at all).
 * Testing recomputeCareerProfile's admin-unavailable path for real would need a live,
 * authenticated Supabase session this environment doesn't have. Lower priority anyway
 * (ORYN-CEO, 2026-08-22): all four of its call sites are Server Actions that already
 * wrap it in try/catch, so this function was never actually crashing a page the way its
 * two siblings were -- fixed for consistency, not because it was broken.
 */

const SRC = readFileSync(join(import.meta.dirname, "..", "..", "lib", "scoring", "persist.ts"), "utf8");

describe("recomputeCareerProfile degrades instead of throwing when the admin client is unavailable", () => {
  test("uses tryCreateAdminClient, not the throwing createAdminClient", () => {
    expect(SRC).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(SRC).not.toMatch(/import \{ createAdminClient \} from "@\/lib\/supabase\/admin";/);
    expect(SRC).toContain("const admin = tryCreateAdminClient();");
  });

  test("checks admin before any of the three writes, and returns the computed (unpersisted) result instead of throwing", () => {
    const checkIndex = SRC.indexOf("if (!admin) {");
    const firstWriteIndex = SRC.indexOf('admin.from("profile_scores")');
    expect(checkIndex).toBeGreaterThan(0);
    expect(firstWriteIndex).toBeGreaterThan(checkIndex);
    const guardBlock = SRC.slice(checkIndex, firstWriteIndex);
    expect(guardBlock).toContain("console.error(");
    expect(guardBlock).toContain("return { careerProfile, completeness };");
  });

  test("every one of its four call sites already wraps it in try/catch (why this is lower priority, not why it's unfixed)", () => {
    const callSites = [
      join(import.meta.dirname, "..", "..", "app", "(app)", "profile", "actions.ts"),
      join(import.meta.dirname, "..", "..", "app", "(app)", "profile", "professional-actions.ts"),
      join(import.meta.dirname, "..", "..", "app", "(app)", "profile", "skills-actions.ts"),
      join(import.meta.dirname, "..", "..", "app", "(onboarding)", "onboarding", "actions.ts"),
    ];
    for (const path of callSites) {
      const content = readFileSync(path, "utf8");
      const callIndex = content.indexOf("recomputeCareerProfile(");
      expect(callIndex, `${path} should call recomputeCareerProfile`).toBeGreaterThan(0);
      const before = content.slice(0, callIndex);
      const lastTry = before.lastIndexOf("try {");
      const lastCatchBeforeCall = before.lastIndexOf("} catch");
      expect(lastTry, `${path}: expected a try block before the call`).toBeGreaterThan(0);
      // A try opened after the last catch closed means we're still inside it at the call site.
      expect(lastTry).toBeGreaterThan(lastCatchBeforeCall);
    }
  });
});
