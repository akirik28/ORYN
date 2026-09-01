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
const recomputeCareerProfile = vi.hoisted(() => vi.fn());
const logEvent = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn(async () => ({ userId: "user-1" })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/scoring/persist", () => ({ recomputeCareerProfile }));
vi.mock("@/lib/profile/cv-import", () => ({ insertCvImportItems }));
vi.mock("@/lib/analytics/log", () => ({ logEvent }));

import { importReviewedCvItems } from "@/app/(app)/profile/import/actions";
import type { CvImportItem } from "@/lib/profile/cv-import";

const item = { category: "awards", title: "Regional Science Fair" } as unknown as CvImportItem;

beforeEach(() => {
  vi.clearAllMocks();
  recomputeCareerProfile.mockResolvedValue(undefined);
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
    expect(result.error).toContain("awards");
    expect(result.error).toContain("projects");
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
