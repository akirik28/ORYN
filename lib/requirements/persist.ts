import "server-only";

import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { assembleRequirementFacts } from "./facts";
import { evaluateRequirement } from "./evaluate";
import { INFORMATIONAL_CATEGORIES } from "./types";
import { NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES } from "./ingest";

/**
 * Recomputes and caches this student's evaluation for every requirement attached to a
 * university (optionally narrowed to one program plus that university's program-agnostic
 * requirements). Cheap and deterministic (no AI/network call) — same "recompute on every
 * view" convention as lib/admissions/persist.ts's refreshAdmissionOutlook.
 *
 * EDITED 2026-08-22 (BUG-1, migration 0063): this comment previously said the
 * request-scoped client needed no admin client for either the read or the write. The read
 * side is still correct and unchanged (`university_requirements`'s own "authenticated
 * read" policy). The write side was wrong: `student_requirement_evaluations`' "owner-only
 * policy" is exactly what let a student overwrite their own `status` directly, bypassing
 * `evaluateRequirement` entirely (see docs/research/verification/rls-live-verification-2026-08-22.md).
 * The final upsert now uses `admin`, paired with a guard trigger on `status` -- the value
 * is fully computed above before either client is touched, so this changes which
 * connection carries it, not what the student can see.
 *
 * FIXED 2026-08-22 (regression the change above introduced, caught by ORYN-CEO before it
 * reached any real user): `createAdminClient()` throws synchronously when
 * `SUPABASE_SECRET_KEY` is unset, and this function is `await`ed, unguarded, from
 * /universities/[id]'s own page render. Now uses `tryCreateAdminClient()` and returns
 * before the (now-pointless) read if the admin client isn't configured, with a loud
 * server-side log rather than a thrown error — same fix and same reasoning as
 * lib/opportunities/persist-matches.ts's `refreshOpportunityMatches`; see that file's
 * comment for the full account, including why `provider_health` isn't the right log
 * target here (it needs the same admin client to record anything).
 */
export async function refreshRequirementEvaluations(universityId: string, userId: string, programId?: string | null): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[requirement-evaluations] SUPABASE_SECRET_KEY not configured — skipping evaluation refresh, page will render with existing (possibly stale) evaluations");
    return;
  }
  const supabase = await createClient();

  const { data: requirements } = await supabase.from("university_requirements").select("*").eq("university_id", universityId);
  if (!requirements || requirements.length === 0) return;

  // A row a research pass has since confirmed closed (verified_historical) or unresolved
  // (conflicting) is real, correctly-sourced data worth keeping in the table — never worth
  // evaluating a student against as though it still applies. Mirrors
  // lib/deadlines/upcoming.ts's own filter for the identical reason.
  const current = requirements.filter((r) => !NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has(r.verification_state));
  const applicable = current.filter((r) => r.program_id === null || r.program_id === programId);
  const evaluable = applicable.filter((r) => !INFORMATIONAL_CATEGORIES.includes(r.requirement_type));
  if (evaluable.length === 0) return;

  const facts = await assembleRequirementFacts(supabase, userId);
  const now = new Date().toISOString();

  const rows = evaluable.map((requirement) => {
    // The row itself is the qualifier source: RequirementQualifiersSchema reads migration
    // 0056's columns off it by name — plus migration 0052's applied `is_exclusion` — and
    // strips the rest, so this is correct both before 0056 is applied (those qualifiers
    // absent, exclusions still honoured) and after.
    const result = evaluateRequirement(requirement.requirement_type, requirement.structured_rule, facts, requirement);
    return {
      user_id: userId,
      requirement_id: requirement.id,
      status: result.status,
      reasoning: result.reasoning,
      evaluated_at: now,
    };
  });

  await admin.from("student_requirement_evaluations").upsert(rows, { onConflict: "user_id,requirement_id" });
}
