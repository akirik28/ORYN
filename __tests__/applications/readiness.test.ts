import { describe, expect, test } from "vitest";
import { computeReadiness } from "@/lib/applications/readiness";
import type { ApplicationStatus, RequirementStatus } from "@/types/database";

/**
 * Application readiness (Phase 70): completed share of applicable requirements, while an
 * application is still being assembled. A discriminated union rather than a bare
 * percentage — see lib/applications/readiness.ts's own doc comment for why a raw number
 * cannot say what it is in two real cases this suite covers: an empty denominator (every
 * requirement not_applicable, or none at all) and an application that has moved past
 * not_started/in_progress, where the checklist is a historical record rather than a live
 * completion signal.
 */

function requirement(status: RequirementStatus) {
  return { status };
}

describe("computeReadiness — while assembling (not_started / in_progress)", () => {
  test("no requirements at all is unmeasured, not 0%", () => {
    expect(computeReadiness("not_started", [])).toEqual({ kind: "unmeasured" });
  });

  test("every requirement not_applicable is unmeasured — an absent denominator is not a zero numerator", () => {
    expect(computeReadiness("not_started", [requirement("not_applicable"), requirement("not_applicable")])).toEqual({ kind: "unmeasured" });
  });

  test("all applicable requirements completed is 100%", () => {
    expect(computeReadiness("in_progress", [requirement("completed"), requirement("completed"), requirement("completed")])).toEqual({
      kind: "measured",
      percent: 100,
    });
  });

  test("none started is 0% — a genuine, known fact, not an absent one", () => {
    expect(computeReadiness("not_started", [requirement("not_started"), requirement("not_started")])).toEqual({ kind: "measured", percent: 0 });
  });

  test("in_progress does not count as completed", () => {
    expect(computeReadiness("in_progress", [requirement("completed"), requirement("in_progress"), requirement("not_started")])).toEqual({
      kind: "measured",
      percent: 33,
    });
  });

  test("the default 8-item checklist, 1 of 8 completed, matches what the applications tracker actually showed live (0%→13%)", () => {
    // Live-verified in docs/feat2-loop-audit-2026-08-22.md: created a real application, the
    // 8-item default checklist, toggled one item to completed, watched readiness move
    // exactly 0% -> 13% in the browser. Pinning that observed value here.
    const requirements = ["completed", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started"].map(
      (s) => requirement(s as RequirementStatus)
    );
    expect(computeReadiness("in_progress", requirements)).toEqual({ kind: "measured", percent: 13 });
  });

  test("not_applicable requirements are excluded from the denominator, not counted as incomplete", () => {
    // 2 completed out of 3 applicable (one row marked not_applicable and correctly ignored)
    // -> 67%, not 2/4=50%. This is the whole point of computeReadiness existing rather than
    // completed/total: a not_applicable item (e.g. "Financial Aid" for a student not
    // requesting it) must never drag readiness down.
    expect(
      computeReadiness("in_progress", [requirement("completed"), requirement("completed"), requirement("not_started"), requirement("not_applicable")])
    ).toEqual({ kind: "measured", percent: 67 });
  });

  test("rounds to the nearest whole percent rather than truncating (Phase 16's 'never misleading precision' spirit applied here too)", () => {
    // 5/6 = 83.33...% rounds to 83, not floored by luck.
    expect(
      computeReadiness("not_started", [
        requirement("completed"),
        requirement("completed"),
        requirement("completed"),
        requirement("completed"),
        requirement("completed"),
        requirement("not_started"),
      ])
    ).toEqual({ kind: "measured", percent: 83 });
    // 2/3 = 66.66...% rounds to 67, not floored to 66.
    expect(computeReadiness("in_progress", [requirement("completed"), requirement("completed"), requirement("not_started")])).toEqual({
      kind: "measured",
      percent: 67,
    });
  });
});

describe("computeReadiness — after the assembling phase", () => {
  // Live-verified 2026-09-01: a real submitted application sits at 1 of 8 requirements
  // marked complete (docs/handoffs/application-readiness-2026-09-01.md) — submitting does
  // not retroactively tick the checklist, so a raw percentage next to a "Submitted" badge
  // would read as something being wrong with an application that's already sent.
  const nonAssemblingStatuses: ApplicationStatus[] = ["submitted", "under_review", "accepted", "waitlisted", "rejected", "withdrawn"];

  test.each(nonAssemblingStatuses)("%s is not_tracked even with an otherwise-computable checklist", (status) => {
    const requirements = [requirement("completed"), requirement("not_started"), requirement("not_started")];
    expect(computeReadiness(status, requirements)).toEqual({ kind: "not_tracked", applicationStatus: status });
  });

  test("not_tracked takes priority over an empty or fully not_applicable checklist too — the status gate runs first", () => {
    expect(computeReadiness("submitted", [])).toEqual({ kind: "not_tracked", applicationStatus: "submitted" });
    expect(computeReadiness("withdrawn", [requirement("not_applicable")])).toEqual({ kind: "not_tracked", applicationStatus: "withdrawn" });
  });

  test("the applicationStatus carried on not_tracked is the exact status passed in, not a generic flag", () => {
    // A caller (e.g. UI copy distinguishing 'submitted' from 'rejected') must be able to
    // recover which terminal state this is, not just that readiness stopped being tracked.
    expect(computeReadiness("accepted", [requirement("completed")])).toEqual({ kind: "not_tracked", applicationStatus: "accepted" });
    expect(computeReadiness("rejected", [requirement("completed")])).toEqual({ kind: "not_tracked", applicationStatus: "rejected" });
  });
});
