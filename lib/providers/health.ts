import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight provider health tracking (Phase 33) — the storage half. These two functions
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
