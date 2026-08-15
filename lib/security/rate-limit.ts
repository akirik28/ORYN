import "server-only";

import { createClient } from "@/lib/supabase/server";
import { RateLimitExceededError } from "@/lib/ai/rate-limit";

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
 */
export async function assertWithinRateLimit(userId: string, action: string, opts: { maxCalls: number; windowMinutes: number }): Promise<void> {
  const supabase = await createClient();
  const since = new Date(Date.now() - opts.windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", since);

  if ((count ?? 0) >= opts.maxCalls) {
    throw new RateLimitExceededError();
  }

  await supabase.from("rate_limit_events").insert({ user_id: userId, action });
}

export { RateLimitExceededError };
