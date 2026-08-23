import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Bug found live 2026-08-23: `completeOnboarding` (app/(onboarding)/onboarding/actions.ts)
 * had no protection against being invoked more than once for the same account -- a stale
 * tab, a double form submit, or a network retry landing after an earlier call already
 * finished. The profile UPDATE is harmless to repeat (same values overwrite themselves),
 * but the goals/interests/extractedItems INSERTs are not: a second call re-appends rather
 * than replacing, and a QA account accumulated 5 duplicate rows in both `career_goals` and
 * `education_records` this way. Onboarding is a one-time event by product design (the
 * layout already redirects an already-onboarded student away from /onboarding on page
 * load, app/(onboarding)/layout.tsx) -- this closes the same gap for the server action
 * itself, which has no equivalent check today. Re-derive from the profile row actually
 * fetched at the top of the action, never from client-submitted state.
 */
export function shouldRunOnboardingSecondaryWrites(profile: { onboarding_completed: boolean | null }): boolean {
  return profile.onboarding_completed !== true;
}

/**
 * Bug found live 2026-08-23, same session as the idempotency gap above but independent of
 * it: `student_interests` carries a `unique (user_id, label)` constraint. The pre-fix code
 * used a plain multi-row `.insert()` -- if ANY row in that batch already exists for the
 * student (e.g. from an earlier onboarding attempt, or literally any other source that
 * wrote the same label), Postgres rejects the WHOLE batch, not just the conflicting row.
 * That insert lived inside a shared try/catch with the goals insert, the CV-extracted-items
 * insert, and recomputeCareerProfile -- a single duplicate label therefore silently
 * discarded every OTHER interest selected in the same session (confirmed live: selecting
 * "Economics" + "Computer Science" with a pre-existing "Economics" row on file saved
 * neither), and silently skipped the score recomputation that should have followed.
 *
 * `.upsert(..., { onConflict: "user_id,label", ignoreDuplicates: true })` makes a
 * conflicting row a no-op instead of a thrown batch failure -- every non-duplicate interest
 * in the same call still gets written, and execution continues to whatever runs after it.
 */
export async function writeStudentInterests(
  supabase: SupabaseClient<Database>,
  userId: string,
  interests: readonly string[],
  knownInterests: ReadonlySet<string>
): Promise<void> {
  if (interests.length === 0) return;
  const rows = interests.map((label) => ({ user_id: userId, label, is_custom: !knownInterests.has(label) }));
  const { error } = await supabase.from("student_interests").upsert(rows, { onConflict: "user_id,label", ignoreDuplicates: true });
  if (error) throw error;
}
