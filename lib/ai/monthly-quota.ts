import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Calendar-month quotas for AI-backed features, enforced server-side and surfaced in the
 * UI as a real remaining balance.
 *
 * Distinct from lib/ai/rate-limit.ts, which is a short sliding-window abuse guard (bursts
 * over ten minutes). This one is the monthly allowance a student is actually budgeting
 * against, so it is the number worth showing them. Both read the same `ai_usage` log —
 * every AI call already writes a row there (lib/ai/usage.ts) — so no second counter can
 * drift out of sync with reality.
 *
 * 50, not the original 300: derived from the founder's own $0.50 target / $1.00 ceiling
 * (lib/ai/limits/budget.ts) against measured real advisor-chat token usage (2026-09-02:
 * ~3,628 input / ~1,095 output tokens/message on average), not the round number 300 was —
 * that number was never derived from anything. At real costs the $1.00 ceiling alone
 * covers roughly 70 messages before the degrade-then-backstop sequence would cross it,
 * with headroom even at the expensive end of the observed per-message range; 50 lands
 * comfortably inside that with margin to spare, rather than at the edge of it.
 *
 * Unlike 300, a genuinely active student can reach 50 in a real month — the point of this
 * change is that the backstop becomes a real ceiling instead of a number nobody reaches
 * (docs/opportunity's degrade-copy and premium-decision work, 2026-09-02: at 300 the
 * $1 ceiling had no code-enforced backstop at all).
 */
export const MONTHLY_AI_QUOTAS = {
  advisor_chat: 50,
} as const;

export type MonthlyQuotaFeature = keyof typeof MONTHLY_AI_QUOTAS;

export interface MonthlyQuota {
  used: number;
  limit: number;
  remaining: number;
  /** 0–1. Clamped, so a legacy over-quota account renders a full bar rather than overflow. */
  fraction: number;
  /** ISO date the allowance resets — the first instant of next calendar month, UTC. */
  resetsAt: string;
  /**
   * False when the usage count could not be read at all. `used` is then 0 and `remaining`
   * is the full limit — not because nothing has been spent, but because we do not know.
   * Callers that display the allowance must say so rather than showing a confident full
   * bar; callers that enforce it must decide deliberately what an unknown means.
   */
  usedIsKnown: boolean;
}

/** First instant of the current UTC calendar month. */
function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Reads this calendar month's usage for one feature. Never throws: a counting failure must
 * not take down the surface that displays it.
 *
 * An earlier version of this comment justified the fail-open by saying "the separate
 * sliding-window limiter still guards the actual call." That is not true for the failure
 * mode that matters. `assertWithinAIRateLimit` (lib/ai/rate-limit.ts) reads the *same*
 * `ai_usage` table through the *same* Supabase client and also treats an unreadable count
 * as zero, so anything that makes this read fail — an RLS change, a connection problem, the
 * table itself — opens both guards at once. They are two layers over one dependency, not
 * defence in depth.
 *
 * So the unknown is now representable (`usedIsKnown`) instead of being silently identical
 * to "nothing spent." Behaviour is unchanged: an unreadable count still permits the call.
 * That is a deliberate availability choice — failing closed would block every AI feature on
 * a transient database error — and it is one the founder should be able to revisit, which
 * requires it being visible rather than accidental.
 */
export async function getMonthlyQuota(userId: string, feature: MonthlyQuotaFeature): Promise<MonthlyQuota> {
  const limit = MONTHLY_AI_QUOTAS[feature];
  const resetsAt = startOfNextMonthUTC().toISOString();

  let used = 0;
  let usedIsKnown = true;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", startOfMonthUTC().toISOString());
    used = count ?? 0;
  } catch (error) {
    usedIsKnown = false;
    console.error("[monthly-quota] failed to read usage", error instanceof Error ? error.stack : error);
  }

  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    fraction: Math.min(1, Math.max(0, used / limit)),
    resetsAt,
    usedIsKnown,
  };
}

/**
 * True when the caller has already spent this month's allowance.
 *
 * An unreadable count returns false — the call is permitted. Written as an explicit branch
 * rather than falling out of `used = 0` so that the choice is visible at the point it is
 * made: this permits spend we cannot account for, and the reason is availability, not
 * confidence. See getMonthlyQuota's note on why the burst limiter is not a second guard here.
 */
export async function isMonthlyQuotaExhausted(userId: string, feature: MonthlyQuotaFeature): Promise<boolean> {
  const quota = await getMonthlyQuota(userId, feature);
  if (!quota.usedIsKnown) return false;
  return quota.remaining <= 0;
}
