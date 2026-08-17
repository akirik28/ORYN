/**
 * Single source of truth for non-AI rate limits (lib/security/rate-limit.ts's
 * `action` keys and thresholds), so the same feature can't accidentally end up with two
 * different limits at two call sites, or two different features sharing one action key
 * and silently throttling each other. The AI-backed path has its own limiter and
 * thresholds (lib/ai/rate-limit.ts, sourced from ai_usage) — not included here.
 */
export const RATE_LIMITS = {
  export_data: { maxCalls: 5, windowMinutes: 60 },
  /** Generous for a real back-and-forth conversation (~1 message/10s sustained). */
  send_message: { maxCalls: 60, windowMinutes: 10 },
  /** A real student exploring and connecting with several people in one sitting stays
   * well under this; guards against mass-requesting. */
  send_connection_request: { maxCalls: 20, windowMinutes: 60 },
  /** Reporting is rare under normal use; bounds report-spam (including using false
   * reports themselves as a harassment vector) without limiting a genuine run of reports. */
  report_message: { maxCalls: 20, windowMinutes: 60 },
  /** A student genuinely endorsing several connections' skills in one sitting stays well
   * under this; guards against scripted mass-endorsement. */
  endorse_skill: { maxCalls: 40, windowMinutes: 60 },
  /** Same shape as endorse_skill — a genuine batch of recommendations for people you
   * actually know is rare and slow to write by hand; this only bounds abuse. */
  write_recommendation: { maxCalls: 15, windowMinutes: 60 },
  /** Canonical Entity Autocomplete System custom fallback. A student adding their own
   * school plus a handful of employers/clubs in one sitting stays well under this. This
   * is the only abuse control on that path: the underlying RPC is SECURITY DEFINER
   * (migration 0039) precisely so no broad INSERT grant exists on the shared registry,
   * and the row it writes deliberately records no submitting user. */
  create_custom_entity: { maxCalls: 20, windowMinutes: 60 },
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;
