import type { ProviderHealth } from "@/types/database";
import { isNotConfiguredLastError } from "@/lib/providers/health";

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
 *  `PROVIDER_NAME`/`recordProviderSuccess` call site — re-verified 2026-09-03, which is how
 *  `internet_archive` (lib/opportunities/reverification/corroborate.ts, added since the
 *  original 2026-09-02 grep) was found live-reporting real, healthy data that this list —
 *  and therefore the panel, which only ever iterates this list — had no entry for and so
 *  never rendered at all. Not a hypothetical: confirmed against the live `provider_health`
 *  table the same session this was found, alongside the tavily gap this file's other
 *  2026-09-03 changes exist to close). */
export const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  { provider: "anthropic", label: "Anthropic" },
  { provider: "tavily", label: "Tavily" },
  { provider: "college_scorecard", label: "College Scorecard" },
  { provider: "openalex", label: "OpenAlex" },
  { provider: "internet_archive", label: "Internet Archive" },
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
  /**
   * The raw stored `provider_health.status`, or one of two synthetic values this module
   * derives rather than reads off a row — mirrors job_health.ts's own `never_run`/`stale`,
   * neither of which is a real `sync_job_status` enum value either:
   *
   * - `"never_attempted"` — no row at all. Renamed from a bare "unknown" 2026-09-03: a
   *   provider that's simply never been called is a calmer, more specific fact than
   *   "unknown" suggests, and conflating it with the case below is exactly what let a whole
   *   night of Tavily calls go unnoticed.
   * - `"not_configured"` — a row exists, but its `last_error` carries the
   *   isNotConfiguredLastError marker (lib/providers/health.ts): the call was attempted and
   *   skipped before ever reaching the provider, because no credential was configured. Kept
   *   distinct from the raw stored `"degraded"` value on purpose — `"degraded"` should mean
   *   "we tried and the provider itself failed", not "we never tried because nobody set the
   *   key", and collapsing those two into one badge is the specific defect this exists to
   *   fix (TAVILY_API_KEY sat empty all night; the panel had no way to say so).
   *
   * Never invented as `"down"` for either case — a provider that's uncalled or unconfigured
   * is a different, calmer fact than one that's actively failing.
   */
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
      status: "never_attempted",
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
    status: isNotConfiguredLastError(row.last_error) ? "not_configured" : row.status,
    freshness: classifyFreshness(sinceLastSuccessMs),
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    lastError: row.last_error,
    sinceLastSuccessMs,
  };
}
