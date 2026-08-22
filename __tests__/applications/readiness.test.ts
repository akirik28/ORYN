import { describe, expect, test } from "vitest";
import { computeReadiness } from "@/lib/applications/readiness";
import type { RequirementStatus } from "@/types/database";

/**
 * Application readiness (Phase 70): completed share of applicable requirements. Untested
 * until this package despite Phase 50 naming this exact class of arithmetic ("date
 * calculations, normalization" — this is the same family: a percentage that must never
 * mislead the reader by including `not_applicable` items in the denominator, since that
 * would understate readiness for an application with genuinely fewer applicable
 * requirements than the default 8-item checklist).
 */

function requirement(status: RequirementStatus) {
  return { status };
}

describe("computeReadiness", () => {
  test("no requirements at all is 0%, not a division-by-zero NaN", () => {
    expect(computeReadiness([])).toBe(0);
  });

  test("every requirement not_applicable is 0%, not NaN — the empty-denominator case with rows present", () => {
    expect(computeReadiness([requirement("not_applicable"), requirement("not_applicable")])).toBe(0);
  });

  test("all applicable requirements completed is 100%", () => {
    expect(computeReadiness([requirement("completed"), requirement("completed"), requirement("completed")])).toBe(100);
  });

  test("none started is 0%", () => {
    expect(computeReadiness([requirement("not_started"), requirement("not_started")])).toBe(0);
  });

  test("in_progress does not count as completed", () => {
    expect(computeReadiness([requirement("completed"), requirement("in_progress"), requirement("not_started")])).toBe(33);
  });

  test("the default 8-item checklist, 1 of 8 completed, matches what the applications tracker actually showed live (0%→13%)", () => {
    // Live-verified in docs/feat2-loop-audit-2026-08-22.md: created a real application, the
    // 8-item default checklist, toggled one item to completed, watched readiness move
    // exactly 0% -> 13% in the browser. Pinning that observed value here.
    const requirements = ["completed", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started"].map(
      (s) => requirement(s as RequirementStatus)
    );
    expect(computeReadiness(requirements)).toBe(13);
  });

  test("not_applicable requirements are excluded from the denominator, not counted as incomplete", () => {
    // 2 completed out of 3 applicable (one row marked not_applicable and correctly ignored)
    // -> 67%, not 2/4=50%. This is the whole point of computeReadiness existing rather than
    // completed/total: a not_applicable item (e.g. "Financial Aid" for a student not
    // requesting it) must never drag readiness down.
    expect(computeReadiness([requirement("completed"), requirement("completed"), requirement("not_started"), requirement("not_applicable")])).toBe(67);
  });

  test("rounds to the nearest whole percent rather than truncating (Phase 16's 'never misleading precision' spirit applied here too)", () => {
    // 1/3 = 33.33...% -> rounds to 33, not floors to 33 by luck; use a case where round vs.
    // floor/ceil actually diverge: 5/6 = 83.33% rounds to 83.
    expect(computeReadiness([requirement("completed"), requirement("completed"), requirement("completed"), requirement("completed"), requirement("completed"), requirement("not_started")])).toBe(83);
    // 2/3 = 66.66...% rounds to 67, not floors to 66.
    expect(computeReadiness([requirement("completed"), requirement("completed"), requirement("not_started")])).toBe(67);
  });
});
