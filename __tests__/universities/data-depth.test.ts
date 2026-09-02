import { describe, expect, test } from "vitest";
import { lacksResearchDepth } from "@/lib/universities/data-depth";

/**
 * CEO finding, 2026-09-02: 734 of 1,019 universities came from one bulk import with real
 * identity fields but nothing downstream — the detail page rendered this as silently
 * empty sections plus a stat grid of "Unavailable" cards, indistinguishable from an
 * ordinary university missing one or two unpublished figures. This predicate is the
 * gate for the new EmptyState notice on app/(app)/universities/[id]/page.tsx.
 */
describe("lacksResearchDepth", () => {
  const FULL = { hasStatistics: true, programCount: 3, requirementCount: 2, sourceCount: 1 };
  const EMPTY = { hasStatistics: false, programCount: 0, requirementCount: 0, sourceCount: 0 };

  test("true when all four signals are empty — the 734's actual shape", () => {
    expect(lacksResearchDepth(EMPTY)).toBe(true);
  });

  test("false when every signal has something", () => {
    expect(lacksResearchDepth(FULL)).toBe(false);
  });

  test("false when only statistics exist — one real signal is enough to skip the notice", () => {
    expect(lacksResearchDepth({ ...EMPTY, hasStatistics: true })).toBe(false);
  });

  test("false when only programs exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, programCount: 1 })).toBe(false);
  });

  test("false when only requirements exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, requirementCount: 1 })).toBe(false);
  });

  test("false when only sources exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, sourceCount: 1 })).toBe(false);
  });
});
