import "server-only";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, type RateLimitStore, type RateLimitOptions } from "@/lib/security/rate-limit-core";
import { RateLimitExceededError } from "@/lib/errors/rate-limit-exceeded";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * General-purpose sliding-window rate limit for Server Actions / Route Handlers outside
 * the AI path (see lib/ai/rate-limit.ts for that one — it piggybacks on the ai_usage log
 * that already exists for cost tracking; nothing else here has an equivalent log, so this
 * version records its own events in `rate_limit_events`). Same caveat as the AI version:
 * a burst of concurrent requests could all read the same count before any of them writes
 * it, so this is a single-user abuse guard, not a precise distributed limiter.
 *
 * Call this *before* doing the real work, so a rejected call still counts against the
 * window (otherwise a client could retry indefinitely with no cost).
 *
 * The actual window/threshold/fail-open decision lives in
 * lib/security/rate-limit-core.ts's checkRateLimit — this function only wires it to a
 * real `rate_limit_events` table. Every existing call site is unaffected; this file's
 * only export is unchanged.
 */
function supabaseRateLimitStore(): RateLimitStore {
  return {
    async countSince(userId, action, sinceIso) {
      const supabase = await createClient();
      const { count } = await supabase
        .from("rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", action)
        .gte("created_at", sinceIso);
      return count;
    },
    async record(userId, action) {
      const supabase = await createClient();
      await supabase.from("rate_limit_events").insert({ user_id: userId, action });
    },
  };
}

export async function assertWithinRateLimit(userId: string, action: string, opts: RateLimitOptions, locale: Locale = DEFAULT_LOCALE): Promise<void> {
  return checkRateLimit(supabaseRateLimitStore(), userId, action, opts, locale);
}

export { RateLimitExceededError };
