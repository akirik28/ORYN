/**
 * Shared vocabulary for the opportunity re-verification job — implements
 * docs/opportunity-reverification-job-design-2026-08-23.md verbatim. One place these unions
 * are spelled out; supabase/migrations/0103_opportunity_verification_runs.sql's own `check`
 * constraints enforce the same values at the database layer, and types/database.ts's
 * `OpportunityVerificationRun` deliberately leaves them as `string` rather than duplicate
 * the union in two places that could drift.
 */

/** Design doc §6.1. `lease_claimed` is this implementation's own addition for §2.2's
 * concurrency lease (an "equivalent conditional update" to `FOR UPDATE SKIP LOCKED`, which
 * this app's PostgREST-only access pattern cannot express) — see the migration's own
 * comment. It is never a real attempt outcome and must be excluded from any aggregation
 * that reports on completed attempts. */
export type VerificationOutcome =
  | "p1_confirmed"
  | "p1_changed"
  | "p2_unreadable"
  | "p3_secondary_only"
  | "p4_contradicted"
  | "transport_error"
  | "lease_claimed";

/** The six real (non-lease) outcomes — the type reporting/orchestration code should
 * actually reason over. */
export type RealVerificationOutcome = Exclude<VerificationOutcome, "lease_claimed">;

export type EvidenceClass = "P1" | "P2" | "P3" | "P4";

/** Design doc §7.5 — "could not read it" collapses several different facts with different
 * retry policies; this is the discriminator. */
export type FailureClass = "blocked" | "transport" | "dns" | "reached_unusable";

/** Design doc §7.3 — the escalation ladder's rungs, recorded per attempt in
 * `fetch_attempts` so "unreadable" is always auditable as what was tried, not asserted. */
export type FetchRung = 1 | 2 | 3;

export interface FetchAttempt {
  rung: FetchRung;
  method: string;
  httpStatus: number | null;
  bytes: number | null;
  error: string | null;
}

/** One candidate opportunity as the priority/scheduling layer needs to see it — deliberately
 * narrower than the full `Opportunity` row (design doc §4.1's ranking function reads exactly
 * these fields, nothing else). */
export interface ReverificationCandidate {
  id: string;
  title: string;
  organization: string | null;
  officialUrl: string | null;
  sourceUrl: string | null;
  deadline: string | null;
  cycleStatus: "open" | "upcoming" | "closed" | "date_not_announced" | "historical" | "discontinued" | "unverified";
  /** Highest opportunity_matches.match_score across every student matched to this row, or
   * null when zero students are matched (§4.1's exposure_norm numerator). */
  maxMatchScore: number | null;
  /** Distinct students matched to this row — the numerator of exposure_norm's second term
   * is this divided by the corpus-wide distinct-matched-user count (§4.1, "exposure_norm"). */
  matchedUserCount: number;
  /** saved_opportunities rows for this opportunity (§4.1's saved_norm). */
  savedCount: number;
  sourceVerifiedAt: string | null;
}

/** Scheduling state for one opportunity, derived from its LATEST verification run — never a
 * column on `opportunities` itself (design doc §8.4). `null` fields mean "no real run yet." */
export interface VerificationSchedulingState {
  nextCheckAt: string | null;
  consecutiveFailures: number;
  lastOutcome: RealVerificationOutcome | null;
}

export interface PriorityBreakdown {
  exposureNorm: number;
  riskWeight: number;
  overdueNorm: number;
  savedNorm: number;
  priority: number;
}
