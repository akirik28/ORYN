import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight provider health tracking (Phase 33). Every external provider call reports
 * success/failure here so the admin panel can see what's degraded without digging through
 * logs. Best-effort: a health-tracking failure must never break the actual feature, so
 * errors here are swallowed after a console warning.
 */
export async function recordProviderSuccess(provider: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("provider_health")
      .upsert({ provider, status: "healthy", last_success_at: new Date().toISOString() }, { onConflict: "provider" });
  } catch (error) {
    console.warn(`[provider_health] failed to record success for ${provider}`, error);
  }
}

export async function recordProviderFailure(provider: string, errorMessage: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("provider_health").upsert(
      { provider, status: "degraded", last_failure_at: new Date().toISOString(), last_error: errorMessage.slice(0, 500) },
      { onConflict: "provider" }
    );
  } catch (error) {
    console.warn(`[provider_health] failed to record failure for ${provider}`, error);
  }
}
