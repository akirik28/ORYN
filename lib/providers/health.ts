import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight provider health tracking (Phase 33) — the storage half. These three functions
 * write status; nothing here calls them automatically, so a provider is only tracked if
 * its own code path calls one of them.
 *
 * NOT every external provider call actually reports here, despite an earlier version of
 * this comment claiming so. Tavily, College Scorecard, and OpenAlex do, via the shared
 * lib/providers/fetch-json.ts wrapper every one of their HTTP calls goes through. Anthropic
 * — the one provider the whole product depends on — did not, until this pass wired
 * recordProviderSuccess/recordProviderFailure directly into lib/ai/anthropic-provider.ts's
 * two methods (it can't use fetch-json.ts: the Anthropic SDK doesn't make its own HTTP
 * calls through that wrapper, and its own failure shapes — an SDK-thrown error, or a
 * response with no usable text/tool-use block — don't map onto fetch-json's HTTP-status
 * classification). Confirmed live, 2026-09-01: before this pass, `provider_health` held
 * exactly one row (openalex) despite Anthropic being called constantly. Whoever adds a
 * fifth external provider should verify it actually calls one of these two functions
 * on every real code path, not just trust this comment's word for it — that's the
 * mistake this correction exists to not repeat.
 *
 * Third function added 2026-09-03: TAVILY_API_KEY sat as an empty string all night (not
 * missing — present, empty), every `if (!apiKey)` short-circuit correctly skipped calling
 * fetch-json.ts, and skipping meant NEITHER function below ever ran — so `provider_health`
 * held zero tavily rows and the panel read "Never succeeded · Never failed · Unknown",
 * indistinguishable from a provider that has simply never been exercised. b9 found the real
 * state by hand-checking records, not from any instrument. recordProviderNotConfigured
 * closes that: every `not_configured` short-circuit (lib/providers/tavily.ts,
 * college-scorecard.ts, lib/ai/anthropic-provider.ts's getClient()) now calls it, so a row
 * always exists once a call has been attempted at all.
 *
 * Best-effort: a health-tracking failure must never break the actual feature, so errors
 * here are swallowed after a console warning.
 */
export async function recordProviderSuccess(provider: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    // supabase-js never throws on a Postgres-level error (a bad column, a constraint) — it
    // resolves normally with `{ error }` set. The try/catch above only ever caught a
    // network-level exception; this destructure is what actually delivers the "swallowed
    // after a console warning" promise the docstring above already makes.
    const { error } = await supabase
      .from("provider_health")
      .upsert({ provider, status: "healthy", last_success_at: new Date().toISOString() }, { onConflict: "provider" });
    if (error) console.warn(`[provider_health] failed to record success for ${provider}`, error);
  } catch (error) {
    console.warn(`[provider_health] failed to record success for ${provider}`, error);
  }
}

export async function recordProviderFailure(provider: string, errorMessage: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("provider_health").upsert(
      { provider, status: "degraded", last_failure_at: new Date().toISOString(), last_error: errorMessage.slice(0, 500) },
      { onConflict: "provider" }
    );
    if (error) console.warn(`[provider_health] failed to record failure for ${provider}`, error);
  } catch (error) {
    console.warn(`[provider_health] failed to record failure for ${provider}`, error);
  }
}

/**
 * A fixed, code-owned marker on `last_error` — not a new `provider_status` enum value.
 * `provider_status` is `healthy | degraded | down | unknown` (migration 0013) and adding a
 * fifth value is a schema change; this instead mirrors lib/jobs/job-health.ts's own
 * `never_run`/`stale`, both derived entirely from existing stored data rather than a new
 * column. `isNotConfiguredLastError` is the one place that derivation is defined — the
 * writer (below) and the reader (lib/admin/provider-health.ts's summarizeProviderHealth)
 * both go through it so the two can't drift apart on what the marker actually is.
 */
const NOT_CONFIGURED_LAST_ERROR_PREFIX = "Not configured — ";

export function isNotConfiguredLastError(lastError: string | null): boolean {
  return lastError !== null && lastError.startsWith(NOT_CONFIGURED_LAST_ERROR_PREFIX);
}

/**
 * Call this at every `if (!apiKey)` short-circuit that currently returns before ever
 * reaching fetch-json.ts (or, for Anthropic, before constructing a client) — see this
 * file's own header for why that short-circuit is exactly where a row previously never got
 * written. Stored as `status: "degraded"` (the real enum value closest to true — the call
 * did not succeed) with `last_error` carrying the marker above, so the row exists and
 * `summarizeProviderHealth` can read it back as its own distinct synthetic status rather
 * than an indistinguishable "degraded", which would read as "actively failing" when the
 * honest statement is "never configured".
 */
export async function recordProviderNotConfigured(provider: string, message: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("provider_health").upsert(
      { provider, status: "degraded", last_failure_at: new Date().toISOString(), last_error: `${NOT_CONFIGURED_LAST_ERROR_PREFIX}${message}`.slice(0, 500) },
      { onConflict: "provider" }
    );
    if (error) console.warn(`[provider_health] failed to record not-configured for ${provider}`, error);
  } catch (error) {
    console.warn(`[provider_health] failed to record not-configured for ${provider}`, error);
  }
}
