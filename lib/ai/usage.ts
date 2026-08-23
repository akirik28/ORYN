import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { AIResponseIncompleteError, type AIUsage } from "./provider";
import { estimateCostUsd } from "./pricing";

/**
 * Records token usage for cost tracking and per-feature monitoring (Phase 27). Best-effort
 * — a logging failure must never break the feature that generated the AI response, so
 * errors are swallowed after a console warning rather than thrown.
 *
 * Writes via the admin client, not the RLS-scoped request client — ai_usage's RLS policy
 * (0014_row_level_security.sql) is deliberately select-only ("user can view their own
 * usage, never write directly"), and some callers (e.g. opportunity extraction) log usage
 * from a background-job context with no authenticated user at all. Bug found in this
 * session: this previously used the RLS-scoped client, so every insert silently failed
 * (caught below, only ever logged a console warning) — ai_usage was never actually
 * populated, which also meant lib/ai/rate-limit.ts's sliding window (sourced from this
 * table) never had anything to count and so never actually throttled anyone.
 */
export async function logAIUsage(params: {
  userId: string | null;
  feature: string;
  usage: AIUsage;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage").insert({
      user_id: params.userId,
      feature: params.feature,
      provider: "anthropic",
      model: env.anthropic.model,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      estimated_cost: estimateCostUsd(env.anthropic.model, params.usage.inputTokens, params.usage.outputTokens),
    });
  } catch (error) {
    console.warn("[ai_usage] failed to log usage", { feature: params.feature, error });
  }
}

/**
 * Runs an AI call and records its token usage exactly once, whether it succeeds or fails
 * with tokens already spent.
 *
 * Why this exists (SEV-1, 2026-08-23): callers used to `await provider.generateX(...)` and
 * then `await logAIUsage(...)` on the next line. When the provider threw, the log line was
 * never reached — so the *most* expensive failure mode (budget fully consumed by thinking,
 * no answer produced, ~$0.021 a turn) was the one case that never appeared in `ai_usage`.
 * The founder's $5 soft / $10 hard spend gates read that table, so those turns were
 * spending real money off the books.
 *
 * Exactly-once by construction: the success and failure branches are mutually exclusive,
 * and only failures that actually carry usage (AIResponseIncompleteError) are recorded —
 * a connection error that never reached the model has no tokens to account for.
 */
export async function withUsageLogging<T extends { usage: AIUsage }>(
  meta: { userId: string | null; feature: string },
  run: () => Promise<T>,
): Promise<T> {
  let result: T;
  try {
    result = await run();
  } catch (error) {
    if (error instanceof AIResponseIncompleteError) {
      await logAIUsage({ ...meta, usage: error.usage });
    }
    throw error;
  }
  await logAIUsage({ ...meta, usage: result.usage });
  return result;
}
