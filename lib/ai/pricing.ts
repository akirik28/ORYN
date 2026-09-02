import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";

/**
 * Per-token pricing for cost estimation (Phase 27's `ai_usage.estimated_cost`, previously
 * unpopulated — see F6 in docs/handoffs/gate1-first-counselor-artifact-2026-08-23.md).
 * Standard (non-introductory) per-token USD rates, per million tokens. Deliberately not
 * the temporary intro discount some models carry at launch: a cost *gate* should round up,
 * not silently under-report once an introductory window ends and nobody remembers to
 * bump this file.
 */
const PRICE_PER_MILLION_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "claude-fable-5": { input: 10, output: 50 },
  "claude-mythos-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/**
 * Returns the estimated cost in USD, or null when the model isn't in the pricing table
 * (an unrecognized/future model string) -- callers should store null rather than a
 * fabricated number in that case, matching `estimated_cost`'s nullable column.
 *
 * Pure and synchronous, deliberately unchanged by resolveModelCostUsd below (2026-09-03) --
 * lib/ai/eval/cost-estimate.ts's offline eval-cost estimates use this directly and stay
 * that way: an eval estimate is "what would this cost under known, stable rates," and
 * reaching into a live, admin-editable table mid-calculation would make two runs of the
 * same eval disagree depending on when they ran, which is the wrong kind of live for a
 * reproducible estimate. This function is also what resolveModelCostUsd itself falls back
 * to once no live override exists.
 */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const rates = PRICE_PER_MILLION_TOKENS_USD[model];
  if (!rates) return null;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

interface ModelRates {
  input: number;
  output: number;
}

let overrideCache: { rates: Map<string, ModelRates>; fetchedAt: number } | null = null;
const OVERRIDE_CACHE_TTL_MS = 60_000;

/**
 * Admin-entered rates (migration 0100, ai_model_pricing), refreshed at most once per
 * OVERRIDE_CACHE_TTL_MS. This is called on every single AI response in production
 * (logAIUsage, the hottest path in the whole AI system) -- a per-call DB round trip here
 * would be a real, avoidable cost and latency tax, so a short TTL cache is load-bearing,
 * not a nicety.
 *
 * Fails toward the last known-good cache, never toward an empty table: a transient DB
 * error or a cold start (admin client unconfigured, or the table not yet migrated) must
 * not make a real override silently disappear and understate spend for the length of one
 * outage -- it should keep using whatever was last successfully fetched. Only a process
 * that has NEVER successfully fetched (fresh cold start, `overrideCache` still null) falls
 * through to an empty map, which is exactly equivalent to "no overrides configured yet" --
 * a true, not a fabricated, state.
 */
async function getLiveRateOverrides(): Promise<Map<string, ModelRates>> {
  if (overrideCache && Date.now() - overrideCache.fetchedAt < OVERRIDE_CACHE_TTL_MS) return overrideCache.rates;

  const admin = tryCreateAdminClient();
  if (!admin) return overrideCache?.rates ?? new Map();

  const { data, error } = await admin.from("ai_model_pricing").select("model, input_rate_per_million, output_rate_per_million");
  if (error || !data) return overrideCache?.rates ?? new Map();

  const rates = new Map(data.map((row) => [row.model, { input: row.input_rate_per_million, output: row.output_rate_per_million }]));
  overrideCache = { rates, fetchedAt: Date.now() };
  return rates;
}

/**
 * The live-aware cost estimate for the production hot path (lib/ai/usage.ts's logAIUsage
 * — the only real caller; see estimateCostUsd's own comment on why the eval harness
 * deliberately does not use this). Checks admin-entered overrides BEFORE
 * PRICE_PER_MILLION_TOKENS_USD's own hardcoded table falls back — an admin only ever needs
 * to enter a model that's new or wrong, never re-enter every model already correct in code.
 *
 * There is exactly one place `ai_usage.estimated_cost` gets computed (here, at write time)
 * and every spend screen only ever sums that already-written column — never a second,
 * independently-derived cost at display time — so the admin-entered rate and what the
 * spend screens show can't drift apart the way two separately-computed numbers could
 * (oryn-a7, 2026-09-03: "two places that can disagree about what a model costs is how a
 * cost model quietly stops matching the invoice").
 */
export async function resolveModelCostUsd(model: string, inputTokens: number, outputTokens: number): Promise<number | null> {
  const overrides = await getLiveRateOverrides();
  const override = overrides.get(model);
  if (override) return (inputTokens * override.input + outputTokens * override.output) / 1_000_000;
  return estimateCostUsd(model, inputTokens, outputTokens);
}
