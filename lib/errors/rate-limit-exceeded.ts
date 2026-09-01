import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Shared between lib/ai/rate-limit.ts and lib/security/rate-limit-core.ts (the AI-usage-
 * backed and rate_limit_events-backed limiters) so both surface the same error shape to
 * their callers. Kept in its own pure module — no `server-only` — specifically so
 * lib/security/rate-limit-core.ts stays importable from a test without pulling in
 * lib/ai/rate-limit.ts's Supabase dependency. lib/i18n/config is safe to import here for
 * the same reason (see that file's own header): no `next/headers`, no database.
 *
 * `locale` bakes the translated message in at construction, matching how every existing
 * throw site already works (`new RateLimitExceededError()`, no args) — every one of the
 * 15+ `catch { if (error instanceof RateLimitExceededError) return { error: error.message } }`
 * sites across the app keeps working unchanged; only the throw sites need to start passing
 * their resolved locale.
 */
export class RateLimitExceededError extends Error {
  constructor(locale: Locale = DEFAULT_LOCALE) {
    super(locale === "tr" ? "Bunu çok sık yapıyorsun — lütfen biraz bekleyip tekrar dene." : "You're doing that a lot — please wait a bit and try again.");
    this.name = "RateLimitExceededError";
  }
}
