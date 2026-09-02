import type { ProviderHealth } from "@/types/database";

/**
 * Mirrors lib/jobs/job-health.ts's shape deliberately — same "definition + latest recorded
 * state -> derived summary" pattern, pure and DB-free so status derivation is unit-testable
 * without a database. Exists because `getProviderHealth`'s old `.select("*")` only ever
 * returned rows that exist, and lib/providers/health.ts's own comment records that this
 * table has, in this product's real history, sat at a single row (openalex) despite other
 * providers being called constantly — a provider that has never once reported in is
 * currently invisible rather than shown as unknown. `PROVIDER_DEFINITIONS` fixes that the
 * same way `JOB_DEFINITIONS` already does for jobs: iterate the expected set, not
 * whatever rows happen to exist.
 */

export interface ProviderDefinition {
  readonly provider: string;
  readonly label: string;
}

/** Exact strings each provider module registers under (grepped from each provider's own
 *  `PROVIDER_NAME`/`recordProviderSuccess` call site, 2026-09-02 — not guessed). */
export const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  { provider: "anthropic", label: "Anthropic" },
  { provider: "tavily", label: "Tavily" },
  { provider: "college_scorecard", label: "College Scorecard" },
  { provider: "openalex", label: "OpenAlex" },
];

/**
 * How long since `last_success_at` before a provider's *recency* — distinct from its raw
 * `status` column — reads as something other than fresh. Deliberately uniform across all
 * four providers rather than individually calibrated the way `JobDefinition.expectedIntervalMs`
 * is per job: jobs have a real, known schedule to compare against (vercel.json's own cron
 * cadence); providers don't have an equivalent per-provider call-frequency this module can
 * derive with any confidence (Anthropic is called on nearly every AI feature; Tavily/College
 * Scorecard depend on jobs that today never run at all; OpenAlex's cadence depends on how
 * often students trigger research-project generation). A single, clearly-labeled set of
 * tiers is more honest than a per-provider number this module has no real basis for.
 */
const FRESH_MS = 60 * 60 * 1000; // 1 hour
const RECENT_MS = 24 * 60 * 60 * 1000; // 1 day
const AGING_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type ProviderFreshness = "fresh" | "recent" | "aging" | "stale" | "never_called";

function classifyFreshness(sinceLastSuccessMs: number | null): ProviderFreshness {
  if (sinceLastSuccessMs === null) return "never_called";
  if (sinceLastSuccessMs <= FRESH_MS) return "fresh";
  if (sinceLastSuccessMs <= RECENT_MS) return "recent";
  if (sinceLastSuccessMs <= AGING_MS) return "aging";
  return "stale";
}

export interface ProviderHealthSummary {
  readonly provider: string;
  readonly label: string;
  /** The raw stored `provider_health.status`, or "unknown" (an existing, real member of
   *  `ProviderStatus`) for a provider with no row at all — never invented as "down", since
   *  a provider that's simply never been called (no API key configured, feature unused) is
   *  a different, calmer fact than one that's actively failing. */
  readonly status: string;
  /**
   * Deliberately kept separate from `status`, not folded into one overridden verdict the
   * way job health's `stale` overrides a merely-old "succeeded" — see this file's own note
   * on FRESH_MS/RECENT_MS/AGING_MS for why. A caller wanting one combined signal (e.g. to
   * dim a "healthy" badge whose freshness is "stale") can derive that from both fields;
   * this module doesn't pre-decide it.
   */
  readonly freshness: ProviderFreshness;
  readonly lastSuccessAt: string | null;
  readonly lastFailureAt: string | null;
  readonly lastError: string | null;
  /** Null when never called — distinct from 0, which would claim a success just happened. */
  readonly sinceLastSuccessMs: number | null;
}

export function summarizeProviderHealth(def: ProviderDefinition, row: ProviderHealth | null, now: Date = new Date()): ProviderHealthSummary {
  if (row === null) {
    return {
      provider: def.provider,
      label: def.label,
      status: "unknown",
      freshness: "never_called",
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      sinceLastSuccessMs: null,
    };
  }

  const sinceLastSuccessMs = row.last_success_at ? now.getTime() - new Date(row.last_success_at).getTime() : null;
  return {
    provider: def.provider,
    label: def.label,
    status: row.status,
    freshness: classifyFreshness(sinceLastSuccessMs),
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    lastError: row.last_error,
    sinceLastSuccessMs,
  };
}
