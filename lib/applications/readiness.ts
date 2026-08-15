import type { RequirementStatus } from "@/types/database";

/**
 * Application readiness (Phase 70): share of applicable requirements completed.
 * Deliberately NOT an admissions-probability signal — see lib/admissions/outlook.ts for
 * that, which is a separate concept computed from a separate model.
 */
export function computeReadiness(requirements: { status: RequirementStatus }[]): number {
  const applicable = requirements.filter((r) => r.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const completed = applicable.filter((r) => r.status === "completed").length;
  return Math.round((completed / applicable.length) * 100);
}
