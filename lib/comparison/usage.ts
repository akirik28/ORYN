import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/analytics/log";
import { startOfMonthUTC } from "@/lib/date/month-boundary";
import { canonicalComparisonKey, MONTHLY_COMPARISON_LIMIT, type ComparisonItemType } from "./limits";

/**
 * The async half of comparison gating — reading and writing the monthly usage count. See
 * ./limits.ts for why this is a separate file (server-only/Supabase must never taint a
 * module a Client Component might import) and for the pure decision functions this reads
 * feed into.
 *
 * Reads via the ADMIN client, not the regular per-request client `getMonthlyQuota` uses to
 * read `ai_usage` — deliberately, not by oversight. `product_events` only gained a
 * student-facing "select own" RLS policy in migration 0073, and this codebase's own house
 * pattern (every recent migration's comments) is "written, not applied" until proven
 * otherwise; on an environment where 0073 hasn't landed yet, a regular-client SELECT
 * against an RLS-enabled table with no matching policy resolves as an EMPTY result, not an
 * error (0073's own migration comment states this explicitly) — which this function's
 * try/catch could never distinguish from "genuinely zero comparisons this month," silently
 * making the frequency cap permanently inert with nothing to catch it. The admin client
 * sidesteps that whole dependency: it works whether or not 0073 is applied, still scoped
 * correctly by the explicit `.eq("user_id", userId)` below (not by RLS), matching
 * lib/analytics/log.ts's own logEvent, which already writes to this exact table the same
 * way for the same reason.
 */

const COMPARISON_EVENT_NAME = "comparison_viewed";

export interface ComparisonUsage {
  used: number;
  limit: number;
  remaining: number;
  /** False when the count could not be read at all — see isComparisonQuotaExhausted
   *  (./limits.ts) for what callers must do with that: permit, never silently block. */
  usedIsKnown: boolean;
}

/**
 * Reads this calendar month's distinct comparison sets — counting DISTINCT
 * canonicalComparisonKey values logged via logComparisonViewed below, not row count, so a
 * refresh or revisit of the same comparison is free. Never throws, matching
 * getMonthlyQuota's own "a counting failure must not take down the surface that displays
 * it" posture.
 */
export async function getMonthlyComparisonUsage(userId: string): Promise<ComparisonUsage> {
  const limit = MONTHLY_COMPARISON_LIMIT;
  let used = 0;
  let usedIsKnown = true;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("event_name", COMPARISON_EVENT_NAME)
      .gte("created_at", startOfMonthUTC().toISOString());
    if (error) throw error;

    const keys = new Set<string>();
    for (const row of data ?? []) {
      const key = (row.metadata as Record<string, unknown> | null)?.key;
      if (typeof key === "string") keys.add(key);
    }
    used = keys.size;
  } catch (error) {
    usedIsKnown = false;
    console.error("[comparison] failed to read monthly usage", error instanceof Error ? error.stack : error);
  }

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    usedIsKnown,
  };
}

/**
 * Records one comparison view — called by both compare pages at the exact point a real
 * (≥2-item) table is about to render, for every plan tier, not just Standard. Logged
 * unconditionally (not just when it would count against a limit) so the event stream stays
 * a complete, honest record of comparison activity — a future admin/growth section reading
 * `comparison_viewed` shouldn't have to wonder why Ultra usage is invisible.
 *
 * Fire-and-forget at the logEvent layer (it already swallows its own errors) but awaited
 * here, matching sendAdvisorMessage's own `await logEvent(...)` — keeps this call properly
 * ordered before the render it's describing, at the cost of one small insert's latency.
 */
export async function logComparisonViewed(userId: string, itemType: ComparisonItemType, ids: string[]): Promise<void> {
  await logEvent(userId, COMPARISON_EVENT_NAME, { itemType, key: canonicalComparisonKey(itemType, ids) });
}
