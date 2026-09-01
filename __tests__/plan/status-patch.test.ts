import { describe, test, expect } from "vitest";
import { buildActionStatusPatch, shouldLogCompletion } from "@/lib/plan/status-patch";

/**
 * Regression coverage for the 2026-08-29 audit finding: features/dashboard/weekly-focus.tsx
 * fires two independent Server Action calls for one "mark complete, then pick a reflection
 * reason" click — toggle() first (no reflection data), saveReflection() moments later (the
 * real outcome). Both hit `updateActionStatus` -> this patch. Building it unconditionally
 * with `reflection_outcome: params.reflectionOutcome ?? null` meant whichever call resolved
 * last won the row: the reflection-less first call could silently overwrite a reflection
 * that had already landed.
 */
describe("buildActionStatusPatch", () => {
  test("a plain status update with no reflection data touches neither reflection column", () => {
    const patch = buildActionStatusPatch({ status: "not_started" });
    expect(patch).not.toHaveProperty("reflection_outcome");
    expect(patch).not.toHaveProperty("reflection_note");
  });

  test("marking complete with no reflection yet (toggle()'s call) does not touch either reflection column", () => {
    const patch = buildActionStatusPatch({ status: "completed" });
    expect(patch.status).toBe("completed");
    expect(patch.completed_at).not.toBeNull();
    expect(patch).not.toHaveProperty("reflection_outcome");
    expect(patch).not.toHaveProperty("reflection_note");
  });

  test("a reflection call sets exactly the outcome (and note) it was given", () => {
    const patch = buildActionStatusPatch({ status: "completed", reflectionOutcome: "completed_successfully", reflectionNote: "Went well" });
    expect(patch.reflection_outcome).toBe("completed_successfully");
    expect(patch.reflection_note).toBe("Went well");
  });

  test("the pinned regression: a reflection-less call built after a reflection call cannot describe overwriting it", () => {
    // Not a race simulation (that needs the DB) — this proves the *shape* of the fix: the
    // reflection-less patch object itself contains no key that could ever clobber the
    // other's write, regardless of which one the database applies last.
    const reflectionPatch = buildActionStatusPatch({ status: "completed", reflectionOutcome: "partially_completed" });
    const reflectionlessPatch = buildActionStatusPatch({ status: "completed" });

    expect(reflectionPatch.reflection_outcome).toBe("partially_completed");
    expect(Object.keys(reflectionlessPatch)).not.toContain("reflection_outcome");
  });

  test("not_started clears completed_at", () => {
    expect(buildActionStatusPatch({ status: "not_started" }).completed_at).toBeNull();
  });
});

describe("shouldLogCompletion", () => {
  // Measured live 2026-09-02: product_events held 8 weekly_action_completed rows across 4
  // distinct actionIds — exactly 2.00 per action — because both Server Action calls from a
  // single click carry status "completed".
  test("logs on the toggle that actually completes the action", () => {
    expect(shouldLogCompletion("not_started", "completed")).toBe(true);
    expect(shouldLogCompletion("in_progress", "completed")).toBe(true);
  });

  test("does NOT log again on the reflection call that follows it — the doubling", () => {
    expect(shouldLogCompletion("completed", "completed")).toBe(false);
  });

  test("does not log for any non-completing update", () => {
    expect(shouldLogCompletion("not_started", "in_progress")).toBe(false);
    expect(shouldLogCompletion("completed", "not_started")).toBe(false);
  });

  test("treats an unreadable previous status as a completion rather than swallowing the event", () => {
    // If the pre-read fails or the row is missing, under-counting a real completion is the
    // worse error than a rare double — the event is how anyone knows the loop works at all.
    expect(shouldLogCompletion(null, "completed")).toBe(true);
    expect(shouldLogCompletion(undefined, "completed")).toBe(true);
  });
});
