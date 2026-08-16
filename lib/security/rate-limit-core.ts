import { RateLimitExceededError } from "@/lib/errors/rate-limit-exceeded";

/**
 * Storage abstraction behind assertWithinRateLimit (lib/security/rate-limit.ts), pulled
 * out into its own pure module so the actual decision logic — window math, the
 * exceeded-vs-allowed boundary, and the fail-open behavior on a storage failure — is
 * unit-testable without a live database. The production implementation
 * (lib/security/rate-limit.ts's supabaseRateLimitStore) is the only place this
 * interface is backed by Supabase; every existing call site is unaffected, since
 * assertWithinRateLimit's own public signature didn't change.
 */
export interface RateLimitStore {
  /** Count of this user+action's events at or after `sinceIso`. `null` means the count
   * couldn't be determined (e.g. a query error) — treated as 0 (allow), matching the
   * production store's actual behavior: Supabase-js resolves query errors rather than
   * rejecting, so `count` there is already `null` on failure, not a thrown error. */
  countSince(userId: string, action: string, sinceIso: string): Promise<number | null>;
  /** Records one event for this user+action, now. */
  record(userId: string, action: string): Promise<void>;
}

export interface RateLimitOptions {
  maxCalls: number;
  windowMinutes: number;
}

/**
 * Fail-open by design on both sides: a storage failure while counting is treated as "no
 * recent calls" (never blocks a legitimate action because the limiter itself is
 * unhealthy), and a storage failure while recording this call is swallowed entirely —
 * this is a single-user abuse guard, not a billing-critical limiter, and a failed record
 * of *this* call must never block the action it's guarding.
 */
export async function checkRateLimit(store: RateLimitStore, userId: string, action: string, opts: RateLimitOptions): Promise<void> {
  const since = new Date(Date.now() - opts.windowMinutes * 60 * 1000).toISOString();
  const count = await store.countSince(userId, action, since);

  if ((count ?? 0) >= opts.maxCalls) {
    throw new RateLimitExceededError();
  }

  try {
    await store.record(userId, action);
  } catch {
    // Best-effort — see the fail-open note above.
  }
}
