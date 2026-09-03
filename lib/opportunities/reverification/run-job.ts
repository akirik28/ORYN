import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OpportunityVerificationLatestRow } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordProviderFailure } from "@/lib/providers/health";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";
import { rankCandidate, sortByPriorityDescending } from "./priority";
import { effectiveTtlDays } from "./ttl";
import { runFetchLadder } from "./fetch-ladder";
import { checkContentGuards, classifyAgainstStoredState, hasValidExcerpt, isFabricatedPlusOneYear } from "./classify";
import { corroborateUnreadable } from "./corroborate";
import { adjudicateDisagreement } from "./adjudicate";
import { isDemotionEligible, volumeGuardBlocksRun } from "./demotion";
import type { ReverificationCandidate, RealVerificationOutcome, EvidenceClass, FailureClass, FetchAttempt } from "./types";

/**
 * Orchestration for the opportunity re-verification job — design doc §2's invocation
 * contract, §6's retry/failure behaviour, §9's demotion envelope, tied to §4's priority
 * ranking and §3's TTL. Called by app/api/jobs/opportunity-reverification/route.ts; also
 * callable directly (e.g. from a future dry-run script, design doc §10.2) since nothing here
 * depends on being reached through an HTTP request.
 */

const LEASE_DURATION_MS = 15 * 60 * 1000; // §2.2
const RETIREMENT_THRESHOLD = 4; // §6.4 — 1+2+4+8 days of backoff
const CIRCUIT_BREAKER_MIN_SAMPLE = 5; // §6.5
const CIRCUIT_BREAKER_TRANSPORT_RATIO = 0.5; // §6.5
export const DEFAULT_MAX_ROWS = 25; // §5.2's offered default
export const DEFAULT_BUDGET_MS = 45_000; // §5.2's ~49s worst-case default batch
const ONE_ROW_RESERVE_MS = 8_000; // §2.3 — conservative until a dry run measures real p95
const PER_DOMAIN_CAP = 2; // §5.2

function envAllowDemotion(): boolean {
  // §9.6: "Ships off. REVERIFY_ALLOW_DEMOTION=false until the §10 dry run is reviewed."
  // Deliberately read fresh (not cached at module load) so a deploy-time env change takes
  // effect on the next invocation without a redeploy of this module specifically — matching
  // every other env-gated flag in this codebase (e.g. lib/ai/limits/job-budget.ts's own
  // envBudgetUsd).
  return (process.env.REVERIFY_ALLOW_DEMOTION ?? "").trim().toLowerCase() === "true";
}

function backoffNextCheckAt(attemptNumber: number, referenceDate: Date = new Date()): string {
  // §6.3: next_check_at = now + min(2^(attempt-1) days, 30 days) → 1, 2, 4, 8, 16, 30, 30, …
  const days = Math.min(2 ** (attemptNumber - 1), 30);
  return new Date(referenceDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isDue(latest: OpportunityVerificationLatestRow | undefined, referenceDate: Date): boolean {
  if (!latest) return true; // never attempted — due by definition
  if (latest.consecutive_failures >= RETIREMENT_THRESHOLD) return false; // §6.4 retirement
  if (!latest.next_check_at) return true;
  return Date.parse(latest.next_check_at) <= referenceDate.getTime();
}

interface CandidatePool {
  candidates: ReverificationCandidate[];
  latestByOpportunity: Map<string, OpportunityVerificationLatestRow>;
  totalDistinctMatchedUsers: number;
}

/**
 * Loads everything §4's ranking and the due-set filter need, in a small fixed number of
 * flat queries — matching lib/opportunities/discover.ts's own established "load in full at
 * corpus scale" precedent for opportunity_matches/saved_opportunities (small, roughly
 * proportional to active students × opportunities today). opportunity_verification_latest
 * is the one exception (see that view's own migration comment for why it's a real query,
 * not a JS reduction — the underlying runs table is NOT bounded by corpus size).
 *
 * Scoped to `status = 'active'` opportunities only — matching the population the design
 * doc measures throughout (271→283 active rows) and its own §10.1(a) dry-run query.
 * Non-active rows (disabled/under_review/expired) never reach a student regardless of
 * verification state, so spending re-verification budget on them buys nothing.
 */
async function loadCandidatePool(admin: SupabaseClient<Database>): Promise<CandidatePool> {
  const [{ data: opportunities }, { data: matches }, { data: saves }, { data: latest }] = await Promise.all([
    admin.from("opportunities").select("id, title, organization, official_url, source_url, deadline, cycle_status, source_verified_at").eq("status", "active"),
    admin.from("opportunity_matches").select("opportunity_id, user_id, match_score"),
    admin.from("saved_opportunities").select("opportunity_id"),
    admin.from("opportunity_verification_latest").select("*"),
  ]);

  const matchesByOpportunity = new Map<string, { maxScore: number; users: Set<string> }>();
  const allMatchedUsers = new Set<string>();
  for (const match of matches ?? []) {
    allMatchedUsers.add(match.user_id);
    const entry = matchesByOpportunity.get(match.opportunity_id) ?? { maxScore: 0, users: new Set<string>() };
    entry.maxScore = Math.max(entry.maxScore, match.match_score);
    entry.users.add(match.user_id);
    matchesByOpportunity.set(match.opportunity_id, entry);
  }

  const savedByOpportunity = new Map<string, number>();
  for (const saved of saves ?? []) savedByOpportunity.set(saved.opportunity_id, (savedByOpportunity.get(saved.opportunity_id) ?? 0) + 1);

  const latestByOpportunity = new Map((latest ?? []).map((row) => [row.opportunity_id, row]));

  const candidates: ReverificationCandidate[] = (opportunities ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    organization: o.organization,
    officialUrl: o.official_url,
    sourceUrl: o.source_url,
    deadline: o.deadline,
    cycleStatus: o.cycle_status,
    maxMatchScore: matchesByOpportunity.get(o.id)?.maxScore ?? null,
    matchedUserCount: matchesByOpportunity.get(o.id)?.users.size ?? 0,
    savedCount: savedByOpportunity.get(o.id) ?? 0,
    sourceVerifiedAt: o.source_verified_at,
  }));

  return { candidates, latestByOpportunity, totalDistinctMatchedUsers: allMatchedUsers.size };
}

interface WriteRunParams {
  opportunityId: string;
  runId: string | null;
  attemptedUrl: string;
  finalUrl: string | null;
  fetchMethod: string | null;
  fetchAttempts: FetchAttempt[];
  outcome: RealVerificationOutcome;
  evidenceClass: EvidenceClass | null;
  failureClass: FailureClass | null;
  matchedExcerpt: string | null;
  detectedDeadline: string | null;
  detectedCycleSignal: string | null;
  proposedChange: Record<string, unknown> | null;
  consecutiveFailures: number;
  nextCheckAt: string | null;
  error: string | null;
}

async function writeRun(admin: SupabaseClient<Database>, params: WriteRunParams): Promise<string | null> {
  const { data, error } = await admin
    .from("opportunity_verification_runs")
    .insert({
      opportunity_id: params.opportunityId,
      run_id: params.runId,
      attempted_url: params.attemptedUrl,
      final_url: params.finalUrl,
      fetch_method: params.fetchMethod,
      fetch_attempts: params.fetchAttempts,
      outcome: params.outcome,
      evidence_class: params.evidenceClass,
      failure_class: params.failureClass,
      matched_excerpt: params.matchedExcerpt,
      detected_deadline: params.detectedDeadline,
      detected_cycle_signal: params.detectedCycleSignal,
      proposed_change: params.proposedChange,
      consecutive_failures: params.consecutiveFailures,
      next_check_at: params.nextCheckAt,
      error: params.error,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[opportunity-reverification] failed to write run record", { opportunityId: params.opportunityId, error: error.message });
    return null;
  }
  return data?.id ?? null;
}

/** §2.2's lease — see the migration's own comment for why this is a transient run row
 * rather than a lock this app's PostgREST-only access pattern cannot express. Claimed with
 * the URL about to be attempted (informative, and satisfies the column's NOT NULL). */
async function claimLease(admin: SupabaseClient<Database>, opportunityId: string, url: string, jobId: string | null): Promise<void> {
  const { error } = await admin.from("opportunity_verification_runs").insert({
    opportunity_id: opportunityId,
    run_id: jobId,
    attempted_url: url,
    outcome: "lease_claimed",
    fetch_attempts: [],
    next_check_at: new Date(Date.now() + LEASE_DURATION_MS).toISOString(),
  });
  if (error) console.error("[opportunity-reverification] failed to claim lease", { opportunityId, error: error.message });
}

/** §7.5's failure-class discriminator, from the ladder's own per-rung attempts. DNS
 * resolution failures surface from Node's fetch (undici) as an error mentioning
 * getaddrinfo/ENOTFOUND — matched defensively by substring since the exact error shape can
 * vary by runtime. */
function classifyFailureClass(attempts: FetchAttempt[]): FailureClass {
  if (attempts.some((a) => a.error && /getaddrinfo|enotfound|could not resolve/i.test(a.error))) return "dns";
  if (attempts.some((a) => a.httpStatus === 403 || a.httpStatus === 429)) return "blocked";
  return "transport";
}

interface RowOutcome {
  outcome: RealVerificationOutcome;
  proposedDemotion: { opportunityId: string; runId: string } | null;
}

/**
 * The full per-row pipeline: fetch ladder → (corroborate if unreadable) → content guards →
 * deterministic classification → (adjudicate if disagreement) → write the run record →
 * (write source_verified_at, P1 only — §7.2a's hard rule, enforced structurally: only the
 * two branches below that reach `outcome: "p1_confirmed" | "p1_changed"` ever call the
 * opportunities update; every other branch returns before it).
 */
async function processOneRow(admin: SupabaseClient<Database>, candidate: ReverificationCandidate, url: string, jobId: string | null, allowDemotion: boolean, priorConsecutiveFailures: number): Promise<RowOutcome> {
  const ladder = await runFetchLadder(url);

  if (!ladder.content) {
    // Every rung failed. §7.3: exhausting our own ladder is necessary but not sufficient —
    // corroborate with an independent fetcher before finalizing as unreadable.
    const corroboration = await corroborateUnreadable(url, ladder.tavilyFailedResults);

    if (corroboration.falsified) {
      // The Internet Archive proves the page IS readable — our own failure was a transport
      // problem, not evidence the source is gone. §7.3: "Outcome is a transport failure to
      // retry, not an unreadable source."
      const newConsecutiveFailures = priorConsecutiveFailures + 1;
      const retired = newConsecutiveFailures >= RETIREMENT_THRESHOLD;
      await writeRun(admin, {
        opportunityId: candidate.id,
        runId: jobId,
        attemptedUrl: url,
        finalUrl: null,
        fetchMethod: null,
        fetchAttempts: ladder.attempts,
        outcome: "transport_error",
        evidenceClass: null,
        failureClass: "transport",
        matchedExcerpt: null,
        detectedDeadline: null,
        detectedCycleSignal: null,
        proposedChange: null,
        consecutiveFailures: newConsecutiveFailures,
        nextCheckAt: retired ? null : backoffNextCheckAt(newConsecutiveFailures),
        error: "corroboration falsified our own fetch failure — the Internet Archive has a recent, readable capture",
      });
      return { outcome: "transport_error", proposedDemotion: null };
    }

    const newConsecutiveFailures = priorConsecutiveFailures + 1;
    const retired = newConsecutiveFailures >= RETIREMENT_THRESHOLD;
    await writeRun(admin, {
      opportunityId: candidate.id,
      runId: jobId,
      attemptedUrl: url,
      finalUrl: null,
      fetchMethod: null,
      fetchAttempts: ladder.attempts,
      outcome: "p2_unreadable",
      evidenceClass: "P2",
      failureClass: classifyFailureClass(ladder.attempts),
      matchedExcerpt: null,
      detectedDeadline: null,
      detectedCycleSignal: null,
      proposedChange: null,
      consecutiveFailures: newConsecutiveFailures,
      nextCheckAt: retired ? null : backoffNextCheckAt(newConsecutiveFailures),
      error: corroboration.corroborated ? "corroborated unreadable (independent fetcher also failed)" : "ladder exhausted, uncorroborated (assumption A11)",
    });
    return { outcome: "p2_unreadable", proposedDemotion: null };
  }

  // Content fetched. §7.2: "A 200 response is not a successful read" — three guards before
  // any phrase matching, each encoding a specific failure the design doc observed directly.
  const guardFailure = checkContentGuards(ladder.content, candidate, candidate.organization);
  if (guardFailure) {
    const newConsecutiveFailures = priorConsecutiveFailures + 1;
    const retired = newConsecutiveFailures >= RETIREMENT_THRESHOLD;
    await writeRun(admin, {
      opportunityId: candidate.id,
      runId: jobId,
      attemptedUrl: url,
      finalUrl: ladder.finalUrl,
      fetchMethod: `rung${ladder.succeededAtRung}`,
      fetchAttempts: ladder.attempts,
      outcome: "p2_unreadable",
      evidenceClass: "P2",
      failureClass: "reached_unusable",
      matchedExcerpt: null,
      detectedDeadline: null,
      detectedCycleSignal: null,
      proposedChange: null,
      consecutiveFailures: newConsecutiveFailures,
      nextCheckAt: retired ? null : backoffNextCheckAt(newConsecutiveFailures),
      error: `content guard failed: ${guardFailure}`,
    });
    return { outcome: "p2_unreadable", proposedDemotion: null };
  }

  const verdict = classifyAgainstStoredState(ladder.content, candidate);

  if (verdict.kind === "liveness_silent") {
    // §7.6: readable, passed every content guard, but says nothing bearing on whether the
    // cycle is running — ISSYP's exact shape. P2, never P1, however clean the page read.
    const newConsecutiveFailures = priorConsecutiveFailures + 1;
    const retired = newConsecutiveFailures >= RETIREMENT_THRESHOLD;
    await writeRun(admin, {
      opportunityId: candidate.id,
      runId: jobId,
      attemptedUrl: url,
      finalUrl: ladder.finalUrl,
      fetchMethod: `rung${ladder.succeededAtRung}`,
      fetchAttempts: ladder.attempts,
      outcome: "p2_unreadable",
      evidenceClass: "P2",
      failureClass: "reached_unusable",
      matchedExcerpt: null,
      detectedDeadline: null,
      detectedCycleSignal: null,
      proposedChange: null,
      consecutiveFailures: newConsecutiveFailures,
      nextCheckAt: retired ? null : backoffNextCheckAt(newConsecutiveFailures),
      error: "liveness-silent content (§7.6) — readable but no signal bearing on cycle status",
    });
    return { outcome: "p2_unreadable", proposedDemotion: null };
  }

  if (verdict.kind === "agrees") {
    // §8.3's excerpt-or-nothing, re-checked here rather than trusted from classify.ts — the
    // excerpt is extracted FROM content by construction, so this should never fail, but the
    // precondition is cheap to re-verify and this is the one place a P1 verdict is finalized.
    if (!hasValidExcerpt(verdict.excerpt, ladder.content)) {
      return { outcome: "p2_unreadable", proposedDemotion: null };
    }
    const fabricated = isFabricatedPlusOneYear(candidate.deadline, verdict.detectedDeadline, ladder.content);
    const detectedDeadline = fabricated ? null : verdict.detectedDeadline;
    const ttl = effectiveTtlDays(candidate);

    const runId = await writeRun(admin, {
      opportunityId: candidate.id,
      runId: jobId,
      attemptedUrl: url,
      finalUrl: ladder.finalUrl,
      fetchMethod: `rung${ladder.succeededAtRung}`,
      fetchAttempts: ladder.attempts,
      outcome: "p1_confirmed",
      evidenceClass: "P1",
      failureClass: null,
      matchedExcerpt: verdict.excerpt,
      detectedDeadline,
      detectedCycleSignal: candidate.cycleStatus,
      proposedChange: null,
      consecutiveFailures: 0,
      nextCheckAt: new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString(),
      error: null,
    });
    // Precondition 6 (§8.5): only write source_verified_at once the runs row is CONFIRMED
    // committed — writeRun already logs its own failure; a null id here means the insert
    // itself failed, and writing the claim without the evidence behind it would be exactly
    // what precondition 6 exists to forbid. The fetch and classification still happened for
    // real, so the next pass simply tries again rather than losing the work silently.
    if (runId) await writeSourceVerifiedAt(admin, candidate.id);
    return { outcome: "p1_confirmed", proposedDemotion: null };
  }

  // verdict.kind === "disagreement" — the one path §5.1 reserves for the model: "adjudicating
  // disagreement only... never asked 'when is the deadline for X', which is precisely the
  // shape that fabricates."
  const adjudication = await adjudicateDisagreement({
    storedCycleStatus: candidate.cycleStatus,
    storedDeadline: candidate.deadline,
    excerpt: verdict.excerpt,
    opportunityTitle: candidate.title,
  });

  if (!adjudication.verdict.cycleStateConfirmedChanged) {
    // Not confirmed — p4_contradicted (an answer, just an ambiguous one; §6.1). Routes
    // toward the human queue via the normal backoff/retirement path, same as P2/P3. Never P1,
    // never writes source_verified_at, never a candidate for demotion.
    const newConsecutiveFailures = priorConsecutiveFailures + 1;
    const retired = newConsecutiveFailures >= RETIREMENT_THRESHOLD;
    await writeRun(admin, {
      opportunityId: candidate.id,
      runId: jobId,
      attemptedUrl: url,
      finalUrl: ladder.finalUrl,
      fetchMethod: `rung${ladder.succeededAtRung}`,
      fetchAttempts: ladder.attempts,
      outcome: "p4_contradicted",
      evidenceClass: "P4",
      failureClass: null,
      matchedExcerpt: verdict.excerpt,
      detectedDeadline: null,
      detectedCycleSignal: null,
      proposedChange: null,
      consecutiveFailures: newConsecutiveFailures,
      nextCheckAt: retired ? null : backoffNextCheckAt(newConsecutiveFailures),
      error: adjudication.verdict.reasoning,
    });
    return { outcome: "p4_contradicted", proposedDemotion: null };
  }

  // Confirmed changed — p1_changed. Still P1: the model classified an already-fetched,
  // already-located excerpt, it did not source a new fact (§5.1).
  const fabricated = isFabricatedPlusOneYear(candidate.deadline, verdict.detectedDeadline, ladder.content);
  const detectedDeadline = fabricated ? null : verdict.detectedDeadline;
  const ttl = effectiveTtlDays(candidate);
  const proposedCycleStatus = verdict.closureFound ? "closed" : verdict.openingFound ? "open" : null;

  const runId = await writeRun(admin, {
    opportunityId: candidate.id,
    runId: jobId,
    attemptedUrl: url,
    finalUrl: ladder.finalUrl,
    fetchMethod: `rung${ladder.succeededAtRung}`,
    fetchAttempts: ladder.attempts,
    outcome: "p1_changed",
    evidenceClass: "P1",
    failureClass: null,
    matchedExcerpt: verdict.excerpt,
    detectedDeadline,
    detectedCycleSignal: proposedCycleStatus,
    // snake_case keys, matching the actual opportunities columns this describes (cycle_status,
    // deadline) -- a jsonb audit blob, not consumed programmatically by anything in this
    // codebase, but a human reading it later should see the real column names.
    proposedChange: { cycle_status: proposedCycleStatus, deadline: detectedDeadline },
    consecutiveFailures: 0,
    nextCheckAt: new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString(),
    error: null,
  });
  // Same precondition-6 guard as the p1_confirmed branch above — see its comment.
  if (runId) await writeSourceVerifiedAt(admin, candidate.id);

  // §9(2): promotion to open is NEVER automatic, unconditionally — only a closure signal is
  // ever a demotion candidate. §9(1)'s three preconditions, checked via ./demotion.ts.
  let proposedDemotion: RowOutcome["proposedDemotion"] = null;
  if (verdict.closureFound && runId) {
    const eligibility = isDemotionEligible({
      evidenceClass: "P1",
      explicitClosurePhraseMatched: true,
      futureDatedApplicationSignalFound: verdict.openingFound,
    });
    if (eligibility.eligible && allowDemotion) {
      proposedDemotion = { opportunityId: candidate.id, runId };
    }
  }

  return { outcome: "p1_changed", proposedDemotion };
}

/** Precondition 6 (§8.5): the runs row is always committed first (writeRun, above); this
 * write only ever follows it, and only for a P1 outcome — the one path that reaches this
 * function. Best-effort logged, not thrown: a failure here must not undo the fact that a
 * real fetch and classification already happened and is durably recorded in the runs table;
 * the next pass will simply try again. */
async function writeSourceVerifiedAt(admin: SupabaseClient<Database>, opportunityId: string): Promise<void> {
  const { error } = await admin.from("opportunities").update({ source_verified_at: new Date().toISOString() }).eq("id", opportunityId);
  if (error) console.error("[opportunity-reverification] failed to write source_verified_at", { opportunityId, error: error.message });
}

/** §9(1)+(4): only cycle_status may ever be written by an applied demotion, never
 * verification_state or status — those are moderation/taxonomy judgments for a human. Marks
 * the originating run `applied: true` so the audit trail shows which proposals were acted
 * on, not just what was proposed. */
async function applyDemotion(admin: SupabaseClient<Database>, demotion: { opportunityId: string; runId: string }): Promise<void> {
  const { error: opportunityError } = await admin.from("opportunities").update({ cycle_status: "closed" }).eq("id", demotion.opportunityId);
  if (opportunityError) {
    console.error("[opportunity-reverification] failed to apply demotion", { opportunityId: demotion.opportunityId, error: opportunityError.message });
    return;
  }
  const { error: runError } = await admin.from("opportunity_verification_runs").update({ applied: true }).eq("id", demotion.runId);
  if (runError) console.error("[opportunity-reverification] demotion applied but failed to mark run as applied", { runId: demotion.runId, error: runError.message });
}

export interface RunOptions {
  maxRows?: number;
  budgetMs?: number;
  /** Per-call override — can only NARROW REVERIFY_ALLOW_DEMOTION (true→false), never widen
   * it (false→true). §9.6 frames "ships off" as a deploy-wide safety property; a request
   * body alone must never be able to flip it on for whoever holds CRON_SECRET. */
  allowDemotion?: boolean;
  jobId?: string | null;
}

export interface RunResult {
  attempted: number;
  committed: number;
  stoppedBy: "max_rows" | "budget" | "exhausted";
  dueRemaining: number;
  hasMore: boolean;
  degraded: boolean;
}

/**
 * The entry point — design doc §2.3's contract made real: two independent stopping
 * conditions, both caller-supplied, checked between rows never inside one (every row is
 * either fully attempted and committed, or not started — §2.1's resumability guarantee).
 */
export async function runReverificationPass(options: RunOptions = {}): Promise<RunResult> {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const allowDemotion = envAllowDemotion() && (options.allowDemotion ?? true);
  const jobId = options.jobId ?? null;

  const admin = createAdminClient();
  const startedAt = Date.now();
  const referenceDate = new Date();

  const pool = await loadCandidatePool(admin);
  const dueCandidates = pool.candidates.filter((c) => isDue(pool.latestByOpportunity.get(c.id), referenceDate));
  const ranked = sortByPriorityDescending(
    dueCandidates.map((c) => rankCandidate(c, { totalDistinctMatchedUsers: pool.totalDistinctMatchedUsers, effectiveTtlDays: effectiveTtlDays(c, referenceDate), referenceDate }))
  );

  let attempted = 0;
  let committed = 0;
  let transportErrors = 0;
  let degraded = false;
  let stoppedBy: RunResult["stoppedBy"] = "exhausted";
  const proposedDemotions: { opportunityId: string; runId: string }[] = [];
  const domainAttemptCounts = new Map<string, number>();

  for (const { candidate } of ranked) {
    if (attempted >= maxRows) {
      stoppedBy = "max_rows";
      break;
    }
    if (Date.now() - startedAt + ONE_ROW_RESERVE_MS > budgetMs) {
      stoppedBy = "budget";
      break;
    }
    // §6.5's circuit breaker: minimum sample of 5 before the ratio is consulted at all — a
    // 50% rate over 2 attempts is noise, not a signal.
    if (attempted >= CIRCUIT_BREAKER_MIN_SAMPLE && transportErrors / attempted > CIRCUIT_BREAKER_TRANSPORT_RATIO) {
      degraded = true;
      await recordProviderFailure("tavily", `opportunity_reverification degraded: ${transportErrors}/${attempted} transport errors this run`);
      break;
    }

    const url = candidate.officialUrl ?? candidate.sourceUrl;
    if (!url) continue; // nothing to fetch — a data problem, not this pass's to fix

    // §5.2's per-domain cap: prevents hammering one host if the corpus grows lopsided, and
    // — per §7.3 — because repeatedly hitting one host is the fastest way to turn a readable
    // domain into a 403 one.
    const domain = safeHostname(url);
    if (domain) {
      const count = domainAttemptCounts.get(domain) ?? 0;
      if (count >= PER_DOMAIN_CAP) continue;
      domainAttemptCounts.set(domain, count + 1);
    }

    attempted += 1;
    await claimLease(admin, candidate.id, url, jobId);

    try {
      const priorFailures = pool.latestByOpportunity.get(candidate.id)?.consecutive_failures ?? 0;
      const result = await processOneRow(admin, candidate, url, jobId, allowDemotion, priorFailures);
      committed += 1;
      if (result.outcome === "transport_error") transportErrors += 1;
      if (result.proposedDemotion) proposedDemotions.push(result.proposedDemotion);
    } catch (error) {
      if (error instanceof JobBudgetExceededError) {
        // A clean stop, not a failure — this feature's own monthly AI budget (adjudication
        // calls only, §5.4) ran out mid-batch. The row this happened on has no run record
        // (the throw happens before any write) and stays due for the next invocation.
        stoppedBy = "budget";
        break;
      }
      console.error("[opportunity-reverification] unexpected error processing row", { opportunityId: candidate.id, error });
    }
  }

  // §9(5): the volume guard applies to the WHOLE run's proposed demotions, decided only
  // after every row in the batch has been attempted — a run that would demote too much
  // applies none of its demotions, not "all but the excess".
  if (proposedDemotions.length > 0) {
    if (volumeGuardBlocksRun(proposedDemotions.length, attempted)) {
      console.log("[opportunity-reverification] volume guard blocked demotions this run", { proposed: proposedDemotions.length, attempted });
    } else {
      for (const demotion of proposedDemotions) await applyDemotion(admin, demotion);
    }
  }

  const dueRemaining = Math.max(0, ranked.length - attempted);
  return { attempted, committed, stoppedBy, dueRemaining, hasMore: dueRemaining > 0, degraded };
}
