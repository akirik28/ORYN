import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AIResponseIncompleteError, AIStructuredResponseFailedError, type AIUsage } from "./provider";
import { resolveModelCostUsd } from "./pricing";
import { selectModelForUser, type ModelSelection, type ModelSelectionReason } from "./limits/budget";

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
    // Destructured, not discarded: a PostgREST-level rejection (bad column, constraint,
    // type mismatch) resolves this promise normally with an `error` field — it does not
    // throw — so the try/catch below, on its own, only ever caught a client-construction or
    // network-level failure. This function's own doc comment already promised "errors are
    // swallowed after a console warning"; this line is what makes that true for the
    // failure class most likely to actually occur (found while auditing why
    // `essay_story_bank` had never appeared here — see docs/story-bank-audit-2026-09-02.md;
    // no evidence that failure explains it specifically, but the gap was real regardless).
    const { error } = await admin.from("ai_usage").insert({
      user_id: params.userId,
      feature: params.feature,
      provider: "anthropic",
      model: params.model,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      estimated_cost: await resolveModelCostUsd(params.model, params.usage.inputTokens, params.usage.outputTokens),
      // supabase/migrations/0076_ai_usage_degrade_columns.sql is live (confirmed against
      // the real DB, 2026-09-02) — these two were previously omitted here with a comment
      // saying the migration hadn't been applied yet, which stopped being true well before
      // anyone updated the code to match. Every row written in between silently carries
      // `degraded = false` (the column's own default), regardless of what selection.degraded
      // actually was — not missing data, data asserting the opposite of the truth (caught
      // by oryn-31's migration audit, not by this file). Fixed here, not with a defensive
      // fallback-and-retry like app/(app)/advisor/actions.ts uses for the *different*,
      // still-unapplied advisor_messages.degraded (migration 0088) — that pattern exists
      // because that migration is genuinely unconfirmed; this one is confirmed live, so a
      // plain, unconditional write is the correct fix, not extra defensiveness for a gap
      // that no longer exists.
      degraded: params.degraded ?? false,
      degrade_reason: params.degradeReason ?? null,
    });
    if (error) {
      console.warn("[ai_usage] insert rejected", { feature: params.feature, error: error.message });
      return;
    }
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
 * and only failures that actually carry usage — AIResponseIncompleteError
 * (generateText) or AIStructuredResponseFailedError (generateStructured, added
 * 2026-09-02 once the same off-the-books-spend shape turned up there too: cv_extraction
 * and achievement_refinement both called generateStructured directly and only ever logged
 * usage on the success path, so a retry-exhausted failure was invisible to ai_usage the
 * identical way the original SEV-1 was) — are recorded. A connection error that never
 * reached the model has no tokens to account for either way.
 *
 * Also the per-user spend cap's integration point (2026-09-02): resolves
 * lib/ai/limits/budget.ts's model selection *before* `run`, and hands the chosen model to
 * `run` rather than letting the caller assume the ceiling model — the whole point of the
 * cap is that the model actually used can vary per call. The model recorded to `ai_usage`
 * always comes back from the result itself (`AITextResult.model` / `AIStructuredResult.model`,
 * or the billed-but-failed error's own `.model`) rather than from the selection this
 * function made — the provider is the one place that knows for certain what it actually
 * called, and a caller that ignored the suggested model (there's no reason one would, but
 * nothing prevents it) must never have its real spend mis-priced as a result.
 *
 * `selectModel` (2026-09-03, the weekly_plan aggregate budget package) defaults to
 * `selectModelForUser` — every existing caller is unaffected. Overriding it is for a
 * feature that needs a consideration *beyond* the per-student check, layered on top of it
 * rather than replacing it — see lib/ai/limits/weekly-plan-budget.ts's own
 * `selectModelForWeeklyPlan` for the one caller that does. Kept as an injectable function
 * here, not a feature-name branch inside this file: this module stays feature-agnostic,
 * and the recorded `degraded`/`degradeReason` in `ai_usage` still comes from whatever
 * `selectModel` actually decided, so the audit trail never drifts from what really ran —
 * the exact class of bug (a logged reason that doesn't match the model actually used)
 * this file's own SEV-1 history already exists to prevent.
 */
export async function withUsageLogging<T extends { usage: AIUsage; model: string }>(
  meta: { userId: string | null; feature: string; selectModel?: (userId: string | null) => Promise<ModelSelection> },
  run: (model: string) => Promise<T>,
): Promise<T> {
  const selectModel = meta.selectModel ?? selectModelForUser;
  const selection = await selectModel(meta.userId);
  let result: T;
  try {
    result = await run(selection.model);
  } catch (error) {
    if (error instanceof AIResponseIncompleteError || error instanceof AIStructuredResponseFailedError) {
      await logAIUsage({ ...meta, usage: error.usage, model: error.model, degraded: selection.degraded, degradeReason: selection.degraded ? selection.reason : null });
    }
    throw error;
  }
  await logAIUsage({ ...meta, usage: result.usage, model: result.model, degraded: selection.degraded, degradeReason: selection.degraded ? selection.reason : null });
  return result;
}
