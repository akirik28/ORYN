import type { PlanTier } from "@/types/database";

/**
 * Pure, tier-keyed token-allowance constants — no I/O, no `"server-only"` (unlike
 * lib/ai/monthly-quota.ts, which re-exports these for its own existing callers but is
 * itself gated behind `"server-only"` for the real Supabase reads it also does).
 *
 * Split out 2026-09-03 (the Ultra tier-economics build): app/(dev-preview)/design-preview/
 * preview-shell.tsx is a `"use client"` component that needs the real per-tier limit
 * (so its fixture quota shows Ultra's real 472,300 under an Ultra-styled preview, not a
 * second hardcoded copy of the number). Importing any VALUE from monthly-quota.ts pulls its
 * `import "server-only"` into the client bundle regardless of which export is actually
 * used — that directive poisons the whole module, not just the DB-reading functions in it.
 * These three constants have no such dependency, so they live here instead, where a client
 * component can read the real, single source of truth without pulling in Supabase.
 */

/**
 * **Tier-keyed, 2026-09-03: Ultra is Standard's own derivation at exactly 2x, not a second
 * number.** Standard's 50 is unchanged from before this build; Ultra's 100 is that same 50
 * doubled, matching `lib/ai/limits/budget.ts`'s target/ceiling doubling exactly — the two
 * files scale together by construction, not by two people picking "reasonable-looking"
 * numbers that happened to agree. See that file's own comment for the margin arithmetic
 * this produces at both tiers (16.67% under either ceiling, algebraically identical).
 */
const HISTORICAL_USE_LIMIT: Record<PlanTier, number> = { standard: 50, ultra: 100 };

/**
 * Tokens per unit of `HISTORICAL_USE_LIMIT` — 3,628 input + 1,095 output, the exact real
 * advisor_chat average this whole session has anchored on (queried 2026-09-02). Reused here
 * rather than re-derived from a volume-weighted blend across features, for the same reason
 * $0.03 (lib/ai/monthly-quota.ts's `REFERENCE_COST_PER_USE_USD`) was: traceable to the one
 * figure both the founder and the fleet have already reasoned about, not marginally more
 * accurate and unexplainable.
 *
 * `MONTHLY_AI_TOKEN_LIMIT` below (236,150 for Standard) lands within 0.06% of the
 * founder-approved response-mode prototype's own ceiling figure (236,000,
 * `oryn-bar-motion.html`'s `TOK` array) — arrived at independently, from real per-message
 * token averages, not read off the prototype. The number the founder already looked at and
 * approved is, to within rounding, the same one this produces.
 */
export const TOKENS_PER_USE_REFERENCE = 4_723;

/**
 * The shared monthly allowance, in tokens — what actually reaches the screen. `used`,
 * `limit` and `remaining` on `MonthlyQuota` (lib/ai/monthly-quota.ts) are denominated in
 * this unit throughout, not just at the final display step: scaling every field by the same
 * positive constant preserves every sign and ratio comparison exactly (`remaining <= 0`,
 * `remaining <= limit * 0.1` in lib/ai/usage-state.ts), so there is no separate "uses"
 * representation to keep in sync with this one. See `usesConsumed` there for the piecewise
 * dollar-to-token conversion this constant is built from.
 *
 * Tier-keyed, 2026-09-03, same derivation per tier: `HISTORICAL_USE_LIMIT[tier] *
 * TOKENS_PER_USE_REFERENCE` — Standard still lands on 236,150 (the 0.06%-of-the-founder-
 * approved-prototype figure the comment above describes, unchanged); Ultra is exactly
 * double, 472,300, because `HISTORICAL_USE_LIMIT.ultra` is exactly double and
 * `TOKENS_PER_USE_REFERENCE` (a tokens-per-use conversion factor, not a dollar figure) is
 * deliberately the same constant for both tiers — a Sonnet call costs the same regardless
 * of which tier bought it.
 */
export const MONTHLY_AI_TOKEN_LIMIT: Record<PlanTier, number> = {
  standard: HISTORICAL_USE_LIMIT.standard * TOKENS_PER_USE_REFERENCE,
  ultra: HISTORICAL_USE_LIMIT.ultra * TOKENS_PER_USE_REFERENCE,
};
