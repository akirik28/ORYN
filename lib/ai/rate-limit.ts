import "server-only";

import { createClient } from "@/lib/supabase/server";

export class RateLimitExceededError extends Error {
  constructor(message = "You're doing that a lot — please wait a bit and try again.") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Simple sliding-window rate limit for AI-backed actions, sourced from `ai_usage` (every
 * AI call already logs there — see lib/ai/usage.ts) rather than a dedicated counter
 * table. Not distributed-systems-grade (a burst of concurrent requests could all read the
 * same count before any of them writes it), but this is a single-user abuse guard, not a
 * billing-critical limiter — good enough, and avoids a schema migration + a second
 * codepath to keep in sync with actual usage. See SECURITY.md's "Known gaps" for the
 * bigger rate-limiting gap this doesn't cover (Route Handlers / non-AI actions).
 */
export async function assertWithinAIRateLimit(userId: string, feature: string, opts: { maxCalls: number; windowMinutes: number }): Promise<void> {
  const supabase = await createClient();
  const since = new Date(Date.now() - opts.windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", since);

  if ((count ?? 0) >= opts.maxCalls) {
    throw new RateLimitExceededError();
  }
}
