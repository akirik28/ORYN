import { describe, test, expect } from "vitest";
import { ALL_CATEGORIES } from "@/lib/opportunities/browse";
import type { OpportunityCategory } from "@/types/database";

/**
 * Regression test for the 360-vs-366 browse count (2026-09-03): browse.ts's category-facet
 * list used to be a plain `OpportunityCategory[]` maintained by hand, which compiles fine
 * whether it has 12 entries or 20 -- so when "online_program" was added to the union, the
 * array silently fell one short. 6 active rows had no filter chip to reach them by, and the
 * "Tümü" total disagreed with the sum of the category chips on the same screen. Same pattern
 * this codebase already uses in category-glyph.test.ts for the same class of bug: a
 * test-local, independently Record<OpportunityCategory, true>-checked pin, compared against
 * the real exported list at runtime -- so a future category that's missing from browse.ts is
 * caught here even if `npm test` runs without `npm run typecheck` (this project's Vitest
 * config transforms TS via esbuild, which strips types without checking them, so the
 * Record<> type alone does not guarantee a red run without this).
 */
const EXPECTED_CATEGORIES: Record<OpportunityCategory, true> = {
  competition: true,
  research: true,
  internship: true,
  summer_program: true,
  fellowship: true,
  scholarship: true,
  volunteering: true,
  entrepreneurship: true,
  hackathon: true,
  academic_program: true,
  online_program: true,
  conference: true,
  student_program: true,
};

describe("browse.ts ALL_CATEGORIES", () => {
  test("matches every OpportunityCategory value exactly — no fewer, no duplicates", () => {
    expect(new Set(ALL_CATEGORIES)).toEqual(new Set(Object.keys(EXPECTED_CATEGORIES)));
    expect(ALL_CATEGORIES.length).toBe(Object.keys(EXPECTED_CATEGORIES).length);
  });

  test("includes online_program specifically — the exact category that went missing", () => {
    expect(ALL_CATEGORIES).toContain("online_program");
  });
});
