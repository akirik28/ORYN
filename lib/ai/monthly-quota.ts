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
 * Sized so a student using the counselor seriously through a normal month never notices
 * it, while an automated loop does.
 */
export const MONTHLY_AI_QUOTAS = {
  advisor_chat: 300,
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
}

/** First instant of the current UTC calendar month. */
function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Reads this calendar month's usage for one feature. Never throws: a counting failure
 * must not take down the surface that displays it, so an unreadable count reports zero
 * used — the separate sliding-window limiter still guards the actual call.
 */
export async function getMonthlyQuota(userId: string, feature: MonthlyQuotaFeature): Promise<MonthlyQuota> {
  const limit = MONTHLY_AI_QUOTAS[feature];
  const resetsAt = startOfNextMonthUTC().toISOString();

  let used = 0;
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
    console.error("[monthly-quota] failed to read usage", error instanceof Error ? error.stack : error);
  }

  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    fraction: Math.min(1, Math.max(0, used / limit)),
    resetsAt,
  };
}

/** True when the caller has already spent this month's allowance. */
export async function isMonthlyQuotaExhausted(userId: string, feature: MonthlyQuotaFeature): Promise<boolean> {
  const quota = await getMonthlyQuota(userId, feature);
  return quota.remaining <= 0;
}
