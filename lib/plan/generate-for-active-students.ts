import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWeeklyPlan, getOrCreateWeeklyPlan } from "./persist";

export interface WeeklyPlanJobResult {
  userId: string;
  status: "generated" | "already_current" | "error";
  detail?: string;
}

/**
 * One student's turn in the batch (Phase 30, Job D). Checks for an existing plan first
 * rather than calling getOrCreateWeeklyPlan(userId) unconditionally: getOrCreateWeeklyPlan
 * already does this same check internally without force, so the read here is redundant
 * for correctness, but it lets this job report which students actually triggered a fresh
 * AI call versus which were already covered (e.g. by an earlier dashboard visit that
 * same ISO week) -- the distinction the cost projection in this package's report depends
 * on, and that runWithTracking's itemsProcessed should reflect (real work done, not rows
 * merely looked at, matching every other Phase 30 job's convention).
 *
 * Never calls getOrCreateWeeklyPlan with force: true -- see docs/scheduled-jobs-phase30-
 * mapping-2026-09-01.md §4 for why that path (which can delete a student's completed
 * actions) must stay reserved for the manual Regenerate button.
 *
 * One student's failure (a malformed profile, a transient AI/DB error) must never abort
 * the run for everyone after them -- same discipline as sync-us-universities.ts's syncOne,
 * caught and recorded per item rather than thrown.
 */
async function generateForStudent(userId: string): Promise<WeeklyPlanJobResult> {
  try {
    const existing = await getCurrentWeeklyPlan(userId);
    if (existing) {
      return { userId, status: "already_current" };
    }
    await getOrCreateWeeklyPlan(userId);
    return { userId, status: "generated" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[jobs/generate-weekly-plans] failed to generate plan for student", { userId, error });
    return { userId, status: "error", detail };
  }
}

/**
 * Scheduled job (Phase 30, Job D / Phase 9): proactively generates this week's plan for
 * every onboarded student, instead of waiting for each one to visit the dashboard.
 * `onboarding_completed` is the same gate app/(app)/layout.tsx already uses to decide
 * whether a profile is real enough to act on -- there's no separate "active" flag on
 * `profiles` (no last-login/last-active column exists), so this is the one real signal
 * available, not a narrower one invented for this job.
 */
export async function generateWeeklyPlansForActiveStudents(): Promise<WeeklyPlanJobResult[]> {
  const supabase = createAdminClient();
  const { data: students, error } = await supabase.from("profiles").select("id").eq("onboarding_completed", true);
  if (error) {
    throw new Error(`Failed to load active students: ${error.message}`);
  }

  const results: WeeklyPlanJobResult[] = [];
  for (const student of students ?? []) {
    results.push(await generateForStudent(student.id));
  }
  return results;
}
