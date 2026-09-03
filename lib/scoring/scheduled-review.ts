import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeCareerProfile } from "./persist";

export interface ScheduledReviewResult {
  userId: string;
  status: "snapshot_written" | "no_meaningful_change" | "error";
  detail?: string;
}

/**
 * One student's turn in the batch (2026-09-02, Phase 41's "or scheduled review" half —
 * see docs/scheduled-review-audit-2026-09-02.md for why this needs to exist at all).
 *
 * `admin` is threaded through as BOTH `supabaseClient` and `adminClient` — this job has no
 * session, so there is no RLS-scoped client to read with the way a real Server Action call
 * has. See lib/scoring/persist.ts's own comment on `recomputeCareerProfile`'s opts for the
 * identical fix lib/plan/generate-for-active-students.ts already needed for the same
 * reason. `snapshotReason: "scheduled_review"` is a distinct string from every edit-
 * triggered reason (onboarding_completed, cv_import, or the profile_updated default) so a
 * snapshot this job wrote is distinguishable later from one a student's own action caused
 * -- purely for observability; it plays no special role in whether a snapshot gets
 * written at all, which is (correctly, since 2026-09-02's persist.ts fix) governed only by
 * `changedMeaningfully` regardless of which reason string is passed.
 *
 * One student's failure must never abort the run for everyone after them -- same
 * discipline as generateForStudent in the weekly-plan job.
 */
async function reviewOneStudent(userId: string, admin: ReturnType<typeof createAdminClient>): Promise<ScheduledReviewResult> {
  try {
    const { snapshotWritten } = await recomputeCareerProfile(userId, {
      snapshotReason: "scheduled_review",
      supabaseClient: admin,
      adminClient: admin,
    });
    return { userId, status: snapshotWritten ? "snapshot_written" : "no_meaningful_change" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[jobs/scheduled-review] failed to review student", { userId, error });
    return { userId, status: "error", detail };
  }
}

/**
 * Scheduled job (Phase 41's "or scheduled review"): recomputes every onboarded student's
 * career profile on a monthly cadence, regardless of whether they've made any edit.
 *
 * Exists because scores CAN move without an edit: 5 of 9 dimensions
 * (leadership/research/entrepreneurship/execution/community_impact -- see
 * lib/scoring/math.ts's monthsBetween) give an ongoing commitment (`end_date: null`) a
 * duration bonus measured against "now," so the same underlying rows genuinely score
 * higher today than they did last month. Nothing before this job ever re-triggered that
 * recompute for a student who wasn't actively editing their profile -- confirmed via grep,
 * every one of the 26 live profile_score_snapshots rows before this job existed was
 * edit-triggered. A dormant student's *displayed* score, and the 30-day baseline
 * getMonthlyReview compares against, were both silently going stale -- exactly the
 * students Phase 40's monthly review exists for.
 *
 * `onboarding_completed` is the same "real enough profile to act on" gate
 * generateWeeklyPlansForActiveStudents already uses -- there is still no separate
 * "active"/last-login signal on `profiles` to use instead.
 *
 * changedMeaningfully (lib/scoring/persist.ts) is what keeps this from recreating the
 * exact snapshot-spam bug fixed earlier the same day: this job calls
 * recomputeCareerProfile for literally every onboarded student every run, but a snapshot
 * (and a profile_update notification, unchanged from the existing gate) is only ever
 * written for the ones whose score actually moved. Running it for everyone rather than
 * pre-filtering to "students with an ongoing commitment" is deliberate simplicity: the
 * guard already makes a no-op both cheap and correct, so a pre-filter would only add
 * complexity for zero behavioral difference.
 *
 * No AI call anywhere in this path (Phase 27: scoring is pure arithmetic, confirmed via
 * lib/scoring/monthly-review.ts's own header comment) -- a materially different cost
 * profile from Job D (generate_weekly_plans), which is real, per-student billed spend and
 * is why THAT job stays deliberately unarmed for cost reasons specifically. This job is
 * left equally unarmed (NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS, NOT in
 * vercel.json) per this repo's standing rule that anything changing production behavior on
 * deploy is founder-gated -- not because of its own cost, which is negligible (bounded
 * DB read/write volume, no external calls), but because the rule itself doesn't carve out
 * an exception for a cheap job. (Briefly armed anyway on 2026-09-03 without that check
 * happening first, caught the same day, pulled back out -- see
 * docs/job-dry-run-audit-2026-09-03.md.)
 */
export async function runScheduledReview(): Promise<ScheduledReviewResult[]> {
  const admin = createAdminClient();
  const { data: students, error } = await admin.from("profiles").select("id").eq("onboarding_completed", true);
  if (error) {
    throw new Error(`Failed to load onboarded students: ${error.message}`);
  }

  const results: ScheduledReviewResult[] = [];
  for (const student of students ?? []) {
    results.push(await reviewOneStudent(student.id, admin));
  }
  return results;
}
