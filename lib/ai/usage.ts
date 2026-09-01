import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AIResponseIncompleteError, type AIUsage } from "./provider";
import { estimateCostUsd } from "./pricing";
import { selectModelForUser, type ModelSelectionReason } from "./limits/budget";

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
 *
 * `model` is now a required parameter, not an implicit `env.anthropic.model` read here —
 * 2026-09-02, the per-user spend cap package. Every real call already threads the model
 * the provider actually used (AITextResult.model / AIStructuredResult.model) back to its
 * own logAIUsage call; defaulting here to the ceiling model would have silently mis-priced
 * (and mis-recorded) every degraded call as the more expensive model it was specifically
 * chosen to avoid, corrupting the exact data the cap itself reads.
 *
 * `degraded`/`degradeReason` are optional and default to "not degraded" — most calls (any
 * caller not yet wired to lib/ai/limits/budget.ts, or lib/ai/limits itself reporting
 * `no_user`/`usage_unavailable`) simply weren't a budget decision at all.
 */
export async function logAIUsage(params: {
  userId: string | null;
  feature: string;
  usage: AIUsage;
  model: string;
  degraded?: boolean;
  degradeReason?: ModelSelectionReason | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage").insert({
      user_id: params.userId,
      feature: params.feature,
      provider: "anthropic",
      model: params.model,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      estimated_cost: estimateCostUsd(params.model, params.usage.inputTokens, params.usage.outputTokens),
      // `degraded`/`degrade_reason` columns: supabase/migrations/0076_ai_usage_degrade_columns.sql
      // (written, NOT applied — founder-gated per this package's own constraints). Until that
      // migration runs, PostgREST rejects unknown columns for the whole insert (confirmed
      // pattern elsewhere in this codebase — see persist-matches.ts's own select("*") comments
      // for the identical failure mode), so these are omitted from the payload rather than sent
      // and silently dropped or erroring the insert. lib/ai/limits/budget.ts's decision is still
      // fully computed and available to the caller (ModelSelection.degraded/.reason) even though
      // it isn't persisted yet — see the same migration file's own header for what changes once
      // it's applied.
    });
    // Visible today, not only after the migration lands: an admin (or oryn-d0's screen,
    // once it can query the real columns) has something to see the moment this ships,
    // rather than the feature silently doing nothing observable until a second, later
    // deploy. Deliberately console.log, not .warn — a degrade is the system working as
    // designed, not a failure.
    if (params.degraded) {
      console.log("[ai_usage] degraded call", { userId: params.userId, feature: params.feature, model: params.model, reason: params.degradeReason });
    }
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
 *
 * Also the per-user spend cap's integration point (2026-09-02): resolves
 * lib/ai/limits/budget.ts's model selection *before* `run`, and hands the chosen model to
 * `run` rather than letting the caller assume the ceiling model — the whole point of the
 * cap is that the model actually used can vary per call. The model recorded to `ai_usage`
 * always comes back from the result itself (`AITextResult.model` / `AIStructuredResult.model`,
 * or `AIResponseIncompleteError.model` on the billed-but-failed path) rather than from the
 * selection this function made — the provider is the one place that knows for certain what
 * it actually called, and a caller that ignored the suggested model (there's no reason one
 * would, but nothing prevents it) must never have its real spend mis-priced as a result.
 */
export async function withUsageLogging<T extends { usage: AIUsage; model: string }>(
  meta: { userId: string | null; feature: string },
  run: (model: string) => Promise<T>,
): Promise<T> {
  const selection = await selectModelForUser(meta.userId);
  let result: T;
  try {
    result = await run(selection.model);
  } catch (error) {
    if (error instanceof AIResponseIncompleteError) {
      await logAIUsage({ ...meta, usage: error.usage, model: error.model, degraded: selection.degraded, degradeReason: selection.degraded ? selection.reason : null });
    }
    throw error;
  }
  await logAIUsage({ ...meta, usage: result.usage, model: result.model, degraded: selection.degraded, degradeReason: selection.degraded ? selection.reason : null });
  return result;
}
