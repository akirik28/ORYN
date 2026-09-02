import type { MonthlyQuota } from "./monthly-quota";

/**
 * The single source of truth for "what state is this student's AI usage in," shared by
 * every surface that shows it — features/advisor/monthly-usage-meter.tsx (the full panel)
 * and features/app-shell/usage-indicator.tsx (the always-visible compact one, 2026-09-02).
 * Deliberately NOT in lib/ai/monthly-quota.ts: that file is `server-only` (reads
 * `ai_usage` directly), and this needs to run inside client components at render time to
 * pick a colour — a plain type-only import of `MonthlyQuota` stays safe either way, but a
 * runtime import of a `server-only`-tagged module from client code is not.
 *
 * Order matters and is not arbitrary: `unknown` (we cannot read the count at all) and
 * `exhausted` (a real zero) both say more than `degraded`, and `degraded` says more than
 * `low` — a student several degraded replies deep needs that fact before a generic
 * "running low" nudge, even if the shared token allowance (236,150 across seven features,
 * lib/ai/monthly-quota.ts) still shows headroom (lib/ai/limits/budget.ts's $0.50 target is
 * crossed around 79,000 tokens in — well under the full allowance, not "nowhere near" it).
 */
export type UsageState = "unknown" | "exhausted" | "degraded" | "low" | "normal";

export function usageState(quota: MonthlyQuota, budgetDegraded: boolean): UsageState {
  if (!quota.usedIsKnown) return "unknown";
  if (quota.remaining <= 0) return "exhausted";
  if (budgetDegraded) return "degraded";
  if (quota.remaining <= quota.limit * 0.1) return "low";
  return "normal";
}
