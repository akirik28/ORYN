import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isUndefinedFunctionError, isUndefinedTableError } from "@/lib/supabase/errors";

/**
 * Enforces docs/ozellesme-spec-2026-09-03.md's "one concurrent generation, both tiers" rule --
 * migration 0110's two Postgres functions are the actual mutex; this file is a thin,
 * degrade-safe wrapper that callers (app/(app)/advisor/actions.ts) hold around a
 * `generateAdvisorReply` call.
 *
 * Fails open, not closed: if 0110 isn't applied yet, `acquire` returns a synthetic receipt
 * instead of blocking every advisor reply on an unrelated, unapplied migration -- the same
 * "unapplied migration must degrade" posture as every other mechanism in this codebase (see
 * lib/supabase/errors.ts's own header). The synthetic receipt is a real ISO timestamp, not a
 * sentinel string, so `release` can pass it straight back through the same code path without a
 * special case -- `release` is a best-effort no-op either way once the table doesn't exist, but
 * needs *a* value to call it with.
 *
 * A rejection (a fresh lock genuinely held by another in-flight request) is the one outcome
 * that must never be swallowed -- that is the entire point of this mechanism -- so it is the
 * only branch that returns `null` rather than degrading past the caller.
 */
export async function acquireAdvisorGenerationLock(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data, error } = await supabase.rpc("acquire_advisor_generation_lock");

  if (error) {
    if (isUndefinedFunctionError(error, "acquire_advisor_generation_lock") || isUndefinedTableError(error, "advisor_generation_locks")) {
      return new Date().toISOString(); // 0110 not applied yet — proceed, don't block.
    }
    console.error("[advisor] failed to acquire generation lock", { code: error.code, message: error.message });
    return new Date().toISOString(); // A genuinely unexpected DB error degrades the same way — a
    // lock this codebase can't evaluate must never be the reason a student's message goes
    // unanswered; the actual generation call downstream still has its own quota/rate-limit
    // guards regardless of this one failing open.
  }

  return data; // null means a fresh lock is already held — the caller must reject the request.
}

/**
 * Best-effort. A failed release leaves a lock that self-heals via `p_stale_after_seconds` on
 * the next acquire attempt (120s default) rather than wedging the student permanently, so this
 * never throws into a caller's `finally` block over a release that didn't land.
 */
export async function releaseAdvisorGenerationLock(supabase: SupabaseClient<Database>, startedAt: string): Promise<void> {
  const { error } = await supabase.rpc("release_advisor_generation_lock", { p_started_at: startedAt });
  if (error && !isUndefinedFunctionError(error, "release_advisor_generation_lock") && !isUndefinedTableError(error, "advisor_generation_locks")) {
    console.warn("[advisor] failed to release generation lock", { code: error.code, message: error.message });
  }
}
