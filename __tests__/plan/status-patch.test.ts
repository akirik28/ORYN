import { describe, test, expect } from "vitest";
import { buildActionStatusPatch } from "@/lib/plan/status-patch";

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
