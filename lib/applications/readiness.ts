import type { ApplicationStatus, RequirementStatus } from "@/types/database";

/**
 * Application readiness (Phase 70): share of applicable requirements completed.
 * Deliberately NOT an admissions-probability signal — see lib/admissions/outlook.ts for
 * that, which is a separate concept computed from a separate model.
 *
 * A discriminated union rather than a bare percentage, because a bare number cannot say
 * what it is. Two cases where a raw completed/total figure would be dishonest, not just
 * imprecise:
 *
 * - `unmeasured`: no requirement on the checklist is currently applicable (every row is
 *   `not_applicable`, or the list is empty). "0%" here reads as "nothing done" when the
 *   honest fact is "nothing to measure" — an absent denominator is not a zero numerator.
 * - `not_tracked`: the application has moved past `not_started`/`in_progress` — submitted,
 *   under review, decided, or withdrawn. The checklist is self-reported and submitting an
 *   application does not retroactively tick its boxes (confirmed live: a real submitted
 *   application sits at 1 of 8 items marked complete), so a stale completion percentage
 *   next to a "Submitted" badge reads as "you did something wrong" on an application that
 *   is already sent and cannot be un-sent. Once status leaves the assembling phase, the
 *   percentage stops being the relevant fact and is not shown — the checklist itself
 *   remains visible so a student can still use it as a personal record.
 */
export type ApplicationReadiness =
  | { kind: "unmeasured" }
  | { kind: "not_tracked"; applicationStatus: ApplicationStatus }
  | { kind: "measured"; percent: number };

const ASSEMBLING_STATUSES: ReadonlySet<ApplicationStatus> = new Set(["not_started", "in_progress"]);

export function computeReadiness(applicationStatus: ApplicationStatus, requirements: { status: RequirementStatus }[]): ApplicationReadiness {
  if (!ASSEMBLING_STATUSES.has(applicationStatus)) {
    return { kind: "not_tracked", applicationStatus };
  }

  const applicable = requirements.filter((r) => r.status !== "not_applicable");
  if (applicable.length === 0) return { kind: "unmeasured" };

  const completed = applicable.filter((r) => r.status === "completed").length;
  return { kind: "measured", percent: Math.round((completed / applicable.length) * 100) };
}
