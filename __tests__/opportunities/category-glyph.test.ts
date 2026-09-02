import { describe, test, expect } from "vitest";
import { CATEGORY_GLYPH, categoryGlyph } from "@/lib/opportunities/category-glyph";
import type { OpportunityCategory } from "@/types/database";

/**
 * The generated-placeholder glyph map (oryn-a7's "B" — a category-keyed graphic, built
 * specifically because it needs no licensing sign-off, unlike re-hosting a third-party
 * photo). Two properties actually matter here: every category has one (an exhaustive map,
 * not a fallback that silently blurs a future category into a generic icon), and no two
 * categories share a glyph (the entire point is a competition reading differently from a
 * summer programme at a glance — a collision would defeat that silently).
 */

// Exhaustive by construction (TS itself enforces this via CATEGORY_GLYPH's
// Record<OpportunityCategory, LucideIcon> type — this list exists so a future category
// added to the enum is provably still covered by an actual test run, not just the compiler).
const ALL_CATEGORIES: OpportunityCategory[] = [
  "competition",
  "research",
  "internship",
  "summer_program",
  "fellowship",
  "scholarship",
  "volunteering",
  "entrepreneurship",
  "hackathon",
  "academic_program",
  "online_program",
  "conference",
  "student_program",
];

describe("categoryGlyph", () => {
  test("every OpportunityCategory has an assigned glyph", () => {
    for (const category of ALL_CATEGORIES) {
      expect(categoryGlyph(category)).toBeDefined();
    }
  });

  test("no two categories share the same glyph — the whole point is telling them apart", () => {
    const glyphs = ALL_CATEGORIES.map((c) => CATEGORY_GLYPH[c]);
    expect(new Set(glyphs).size).toBe(ALL_CATEGORIES.length);
  });

  test("CATEGORY_GLYPH's own keys match the full category list exactly (catches a future enum addition missing a mapping)", () => {
    expect(Object.keys(CATEGORY_GLYPH).sort()).toEqual([...ALL_CATEGORIES].sort());
  });
});
