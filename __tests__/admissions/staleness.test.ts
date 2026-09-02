import { describe, expect, test } from "vitest";
import { isOutlookStale } from "@/lib/admissions/staleness";

/**
 * CEO, 2026-09-02: outlook_model_version is written per row but was never read back by
 * either refresh path (read-time or the weekly backstop) — both compared timestamps only.
 * Harmless today because ADMISSION_MODEL_VERSION has never been bumped in this project's
 * live history; this is what makes the day it does bump self-healing instead of silent.
 */
describe("isOutlookStale", () => {
  const now = new Date("2026-09-02T00:00:00.000Z").getTime();

  test("never computed (calculated_at null) is stale regardless of version", () => {
    expect(isOutlookStale({ outlook_calculated_at: null, outlook_model_version: null }, now)).toBe(true);
  });

  test("fresh timestamp, matching version: not stale", () => {
    expect(
      isOutlookStale({ outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: "admission_model_v1" }, new Date("2026-08-20T00:00:00.000Z").getTime())
    ).toBe(false);
  });

  test("timestamp predates the profile update: stale (the pre-existing rule, unchanged)", () => {
    expect(
      isOutlookStale({ outlook_calculated_at: "2026-08-01T00:00:00.000Z", outlook_model_version: "admission_model_v1" }, now)
    ).toBe(true);
  });

  test("fresh timestamp but a different model version: stale — the gap this function closes", () => {
    expect(
      isOutlookStale({ outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: "admission_model_v0_hypothetical" }, new Date("2026-08-20T00:00:00.000Z").getTime())
    ).toBe(true);
  });

  test("a null model version on an otherwise-fresh row is stale, not treated as a wildcard match", () => {
    expect(
      isOutlookStale({ outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: null }, new Date("2026-08-20T00:00:00.000Z").getTime())
    ).toBe(true);
  });
});
