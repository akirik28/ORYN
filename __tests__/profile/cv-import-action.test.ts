import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * Phase 50 asks for an integration test on the CV import workflow; the only coverage was of
 * flattening an extraction result (`__tests__/onboarding/import-step-flatten.test.ts`). This
 * covers the step where data actually reaches a student's profile.
 *
 * The behaviour most worth locking is not the happy path. It is that a *partial* import is
 * reported as one: the action's own comment insists on this — "Reported honestly rather than
 * as a flat success: a partial import is a real outcome, and the student should be told which
 * parts didn't land." A silent partial success is how a student ends up believing their
 * awards are on their profile when they are not.
 */

const insertCvImportItems = vi.hoisted(() => vi.fn());
const insertCvImportSkills = vi.hoisted(() => vi.fn());
const insertCvImportLanguages = vi.hoisted(() => vi.fn());
const recomputeCareerProfile = vi.hoisted(() => vi.fn());
const logEvent = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn(async () => ({ userId: "user-1" })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/scoring/persist", () => ({ recomputeCareerProfile }));
vi.mock("@/lib/profile/cv-import", () => ({ insertCvImportItems, insertCvImportSkills, insertCvImportLanguages }));
vi.mock("@/lib/analytics/log", () => ({ logEvent }));
// A real translator (next-intl's own createTranslator, the same engine getTranslations
// wraps for a request scope this test has none of) against the real English catalog --
// not the identity-mock convention __tests__/admin/update-product-settings.test.ts uses,
// because this file's own assertions below (added 2026-09-03) check real prose
// ("saved 2 items", "2 skills skipped (15 max)", real category names), not which key was
// selected. Real content is the more valuable thing to lock here.
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const en = (await import("@/messages/en.json")).default;
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: en, namespace: namespace as never }) };
});

import { importReviewedCvItems } from "@/app/(app)/profile/import/actions";
import type { CvImportItem, CvImportSkillCandidate, CvImportLanguageCandidate } from "@/lib/profile/cv-import";

const item = { category: "awards", title: "Regional Science Fair" } as unknown as CvImportItem;
const skill = { name: "Python", category: "technical", proficiency: null } satisfies CvImportSkillCandidate;
const language = { name: "French", proficiency: null } satisfies CvImportLanguageCandidate;

beforeEach(() => {
  vi.clearAllMocks();
  recomputeCareerProfile.mockResolvedValue(undefined);
  // 2026-09-02: skills/languages now insert alongside achievements on every call — a
  // no-op default here keeps every pre-existing achievement-only test's math unchanged
  // (0 contributed to the combined total) without every one of them having to know that.
  insertCvImportSkills.mockResolvedValue({ inserted: 0, skippedDuplicate: 0, skippedCap: 0 });
  insertCvImportLanguages.mockResolvedValue({ inserted: 0, skippedDuplicate: 0 });
});

describe("importReviewedCvItems", () => {
  test("an empty selection writes nothing and says so", async () => {
    const result = await importReviewedCvItems([]);

    expect(result.error).toMatch(/nothing was selected/i);
    expect(insertCvImportItems).not.toHaveBeenCalled();
  });

  test("a successful import reports how many landed", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 3, failedCategories: [] });

    const result = await importReviewedCvItems([item, item, item]);

    expect(result).toEqual({ inserted: 3 });
    expect(logEvent).toHaveBeenCalledWith("user-1", "cv_imported", { itemCount: 3, source: "post_onboarding" });
  });

  test("a partial import names what did NOT save, rather than reporting a flat success", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 2, failedCategories: ["awards", "projects"] });

    const result = await importReviewedCvItems([item, item, item]);

    expect(result.inserted).toBe(2);
    // Real category labels (profile.page.sections.*.title), not the raw internal codes
    // ("awards"/"projects") the pre-2026-09-03 version showed a student directly.
    expect(result.error).toContain("Awards");
    expect(result.error).toContain("Projects");
    // The count that did land is still reported — this is not an all-or-nothing failure.
    expect(result.error).toMatch(/saved 2 items/i);
  });

  test("saving nothing at all is an error, not a quiet zero", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 0, failedCategories: ["awards"] });

    const result = await importReviewedCvItems([item]);

    expect(result.inserted).toBeUndefined();
    expect(result.error).toMatch(/couldn't save anything/i);
    expect(logEvent).not.toHaveBeenCalled();
  });

  test("a scoring failure does not turn a successful import into a failed one", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 4, failedCategories: [] });
    recomputeCareerProfile.mockRejectedValue(new Error("scoring unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await importReviewedCvItems([item]);

    // The rows are in the profile; a stale score is a smaller problem than telling a student
    // their import failed when it did not.
    expect(result).toEqual({ inserted: 4 });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("one item reads as one item, not '1 items'", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 1, failedCategories: ["projects"] });

    const result = await importReviewedCvItems([item]);

    expect(result.error).toMatch(/saved 1 item,/i);
  });
});

describe("importReviewedCvItems — skills and languages (2026-09-02)", () => {
  test("skills and languages selected with zero achievement items still save, not rejected as 'nothing selected'", async () => {
    insertCvImportSkills.mockResolvedValue({ inserted: 1, skippedDuplicate: 0, skippedCap: 0 });
    insertCvImportLanguages.mockResolvedValue({ inserted: 1, skippedDuplicate: 0 });

    const result = await importReviewedCvItems([], [skill], [language]);

    expect(insertCvImportItems).not.toHaveBeenCalled();
    expect(insertCvImportSkills).toHaveBeenCalledWith({}, "user-1", [skill]);
    expect(insertCvImportLanguages).toHaveBeenCalledWith({}, "user-1", [language]);
    expect(result).toEqual({ inserted: 2 });
  });

  test("the combined total spans all three kinds, not just achievements", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 3, failedCategories: [] });
    insertCvImportSkills.mockResolvedValue({ inserted: 2, skippedDuplicate: 0, skippedCap: 0 });
    insertCvImportLanguages.mockResolvedValue({ inserted: 1, skippedDuplicate: 0 });

    const result = await importReviewedCvItems([item, item, item], [skill, skill], [language]);

    expect(result).toEqual({ inserted: 6 });
    expect(logEvent).toHaveBeenCalledWith("user-1", "cv_imported", { itemCount: 6, source: "post_onboarding" });
  });

  test("a skill skipped for the 15-cap is named honestly, not silently dropped", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 0, failedCategories: [] });
    insertCvImportSkills.mockResolvedValue({ inserted: 1, skippedDuplicate: 0, skippedCap: 2 });
    insertCvImportLanguages.mockResolvedValue({ inserted: 0, skippedDuplicate: 0 });

    const result = await importReviewedCvItems([], [skill], []);

    expect(result.inserted).toBe(1);
    expect(result.error).toMatch(/2 skills skipped \(15 max\)/i);
  });

  test("a duplicate name (skill or language) is reported, distinct from a cap skip", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 0, failedCategories: [] });
    insertCvImportSkills.mockResolvedValue({ inserted: 0, skippedDuplicate: 1, skippedCap: 0 });
    insertCvImportLanguages.mockResolvedValue({ inserted: 1, skippedDuplicate: 1 });

    const result = await importReviewedCvItems([], [skill], [language, language]);

    expect(result.inserted).toBe(1);
    expect(result.error).toMatch(/2 already on your profile/i);
    expect(result.error).not.toMatch(/max/i);
  });

  test("a fully successful skills+languages import (no cap/duplicate skips) reports plain success, no notes", async () => {
    insertCvImportItems.mockResolvedValue({ inserted: 0, failedCategories: [] });
    insertCvImportSkills.mockResolvedValue({ inserted: 1, skippedDuplicate: 0, skippedCap: 0 });
    insertCvImportLanguages.mockResolvedValue({ inserted: 1, skippedDuplicate: 0 });

    const result = await importReviewedCvItems([], [skill], [language]);

    expect(result).toEqual({ inserted: 2 });
  });
});
