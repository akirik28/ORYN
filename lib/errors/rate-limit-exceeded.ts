/**
 * Shared between lib/ai/rate-limit.ts and lib/security/rate-limit-core.ts (the AI-usage-
 * backed and rate_limit_events-backed limiters) so both surface the same error shape to
 * their callers. Kept in its own pure module — no `server-only` — specifically so
 * lib/security/rate-limit-core.ts stays importable from a test without pulling in
 * lib/ai/rate-limit.ts's Supabase dependency.
 */
export class RateLimitExceededError extends Error {
  constructor(message = "You're doing that a lot — please wait a bit and try again.") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
