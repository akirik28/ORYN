import type { PlanTier, Profile } from "@/types/database";

/**
 * The tier-aware character limit for a student's standing advisor instruction
 * (docs/ozellesme-spec-2026-09-03.md §1). 500 Standard / 2,000 Ultra, derived there from
 * token share of a typical advisor_chat call (~3,600 input tokens): 500 chars ≈ 125 tokens
 * (3.5%), 2,000 chars ≈ 500 tokens (14%) — Ultra's call budget is roughly double Standard's,
 * so it can carry the larger share. This is the one place both the write-side enforcement
 * (app/(app)/settings/actions.ts's updateAdvisorInstructions) and the UI's displayed limit
 * (features/advisor/advisor-instructions-field.tsx) read the number from, so the two can
 * never disagree.
 */
export function advisorInstructionsMaxLength(tier: PlanTier): number {
  return tier === "ultra" ? 2000 : 500;
}

/**
 * Mirrors lib/tier/response-mode.ts's resolveResponseMode exactly, for the same reason:
 * migration 0109 (profiles.advisor_instructions) is written, not applied — house pattern.
 * `select("*")` on `profiles` omits an unknown-to-cache column rather than erroring, so on an
 * environment where the column doesn't exist yet `profile.advisor_instructions` is
 * `undefined`, not `null` — this is the one place that gap gets closed, defaulting to "no
 * instruction set" the same way every pre-migration row does once the column exists.
 *
 * Read-only, like resolveResponseMode: no insert/update path here, so no need for
 * lib/supabase/errors.ts's isUndefinedColumnError — that's for a write naming a column
 * PostgREST's schema cache doesn't know yet (or a read that names the column explicitly
 * rather than `select("*")`), neither of which applies to this function. The write side
 * (a student actually setting this) does use it — see updateAdvisorInstructions.
 */
export function resolveAdvisorInstructions(profile: Pick<Profile, "advisor_instructions">): string | null {
  return profile.advisor_instructions ?? null;
}
