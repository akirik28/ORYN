import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

/**
 * Per-feature monthly AI spend budget for background/catalog jobs — opportunity_extraction
 * and requirement_extraction, the two features that call selectModelForUser(null) because
 * there is no student to attribute the spend to (see that function's own "no_user" branch,
 * ./budget.ts). That branch is correct for its stated purpose — there is no student to
 * protect from a hard wall — but it also means these two features have had no budget of any
 * kind at all.
 *
 * That gap was theoretical until now. ORYN has never been deployed, so
 * discoverOpportunitiesForQuery/discoverRequirementsForUniversity have never actually run —
 * confirmed 2026-09-02, `ai_usage` has zero rows for either feature. Once deployed,
 * vercel.json schedules both nightly (discover-opportunities 02:00 UTC, discover-requirements
 * 04:00 UTC) forever, at catalog scale. The per-student cap in ./budget.ts cannot see any of
 * this spend — a healthy-looking per-student number says nothing about the actual bill once
 * these jobs are live, which is exactly the risk worth closing before that first deploy
 * rather than after.
 *
 * DIFFERENT POLICY FROM THE STUDENT CASE, DELIBERATELY: ./budget.ts's "never a hard wall"
 * exists because a student mid-conversation who hits a wall doesn't come back — a real, felt
 * harm. A background job that stops early has no such harm: nothing is "hit" by a wall, a
 * candidate URL just waits for the next scheduled run instead of being processed tonight. So
 * this file does the opposite of budget.ts at the limit: STOP, don't degrade to a cheaper
 * model. Two reasons that's the right call specifically for extraction jobs, not a generic
 * "jobs need less nuance" shortcut:
 *   (1) These calls write directly into `opportunities`/`university_requirements` — tables
 *       students read as fact. A degraded model producing a subtly wrong structured
 *       extraction risks bad data quietly entering the catalog; a job that does less work
 *       this run risks nothing worse than doing that same work tomorrow instead.
 *   (2) AGENTS.md's own rule for this exact shape of uncertainty ("never silently manufacture
 *       a value... show data temporarily unavailable") is stopping applied to a job's own
 *       spend, not a new invention for this file.
 */

export type JobBudgetFeature = "opportunity_extraction" | "requirement_extraction" | "opportunity_reverification" | "advisor_conversation_retention";

function envBudgetUsd(envVar: string, defaultUsd: number): number {
  const raw = process.env[envVar];
  if (raw === undefined || raw.trim() === "") return defaultUsd;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultUsd;
}

/**
 * Defaults are ESTIMATES, not measured figures — there is no live `ai_usage` data for
 * either feature to measure from yet (see this file's header). Derived from the actual call
 * shape at today's configured volume, not picked at random:
 *
 * opportunity_extraction: up to 5 queries x 6 Tavily results = 30 calls/night
 * (DEFAULT_DISCOVERY_QUERIES, lib/opportunities/discover.ts). ~3.5k input tokens (system
 * prompt + a 12k-char content slice) + ~400 output tokens (one structured record, well under
 * the 1536-token cap) at Sonnet 5 pricing ($3/$15 per M, lib/ai/pricing.ts) is roughly
 * $0.017/call — ~$15/month unbounded at today's query count. $25 leaves headroom for the
 * query set to grow without moving this number for every small addition, while still
 * catching a genuine runaway (a bug, or `maxResults` raised without anyone touching this
 * file).
 *
 * requirement_extraction: up to 5 universities x 3 Tavily results = 15 calls/night, but
 * self-limiting — getUniversitiesNeedingRequirementDiscovery only ever targets universities
 * with zero requirement rows, so once the backlog clears this drops toward zero on its own
 * (no freshness re-check exists yet, see docs/known-issues.md). ~3.4k input + ~1k output
 * tokens (an array of up to 20 requirements per page) is roughly $0.025/call — up to
 * ~$11/month while the backlog is being worked through. $15 covers that with modest headroom.
 *
 * Both configurable without a code change (AI_JOB_BUDGET_<FEATURE>_USD) since these are
 * estimates pending real data, not founder-specified figures the way ./budget.ts's
 * $0.50/$1.00 are — once either job has actually run, check the real
 * `ai_usage.estimated_cost` sum against these before assuming they're still the right
 * number.
 *
 * opportunity_reverification: a deliberate third tag, not a share of opportunity_extraction's
 * $25 — docs/opportunity-reverification-job-design-2026-08-23.md §5.4 argues this at length
 * (that bucket is already ~60% claimed by Job A's discovery pipeline; sharing it would make
 * per-feature spend attribution unanswerable for either job, and would couple
 * re-verification's availability to an unrelated job's spend or growth). The LLM side of
 * this job only ever adjudicates a *disagreement* between the deterministic fetch-ladder
 * result and stored data (§5.1) — never the common path — so its usage is genuinely smaller
 * by design than either existing feature: ~$0.0105/adjudication call (2K in + 300 out,
 * Sonnet 5 pricing) × an assumed ~55 calls/full corpus pass (20% disagreement rate,
 * unmeasured — Assumption A2) ≈ $0.58/pass, ≈$1.30–1.50/month at the offered non-binding
 * daily cadence, ≤$3.50/month even doubling every input. $5 is ~3–4× that estimate — the
 * same "headroom for the number to be wrong without moving the ceiling" reasoning already
 * used for the other two, sized down to match this job's genuinely smaller usage.
 *
 * advisor_conversation_retention: docs/ozellesme-spec-2026-09-03.md §3's own explicit ask
 * ("if summarising should be cheaper than the advisor itself, pick accordingly and say so")
 * — this uses claude-haiku-4-5 deliberately, not the student advisor's default model
 * (see lib/advisor/retention.ts). A realistic conversation reaching 24h-idle (not the
 * MAX_HISTORY_TURNS=40 ceiling, which almost nothing hits) — call it ~15 messages,
 * ~300 chars each — is roughly 1,300 input tokens (content + a short system prompt) and a
 * concise ~200-token summary output. At Haiku pricing ($1/$5 per M, lib/ai/pricing.ts) that's
 * ≈$0.0023/call, under a sixth of opportunity_reverification's own per-call adjudication
 * cost. Real volume is NOT measured — this feature has never run — and today's live
 * `advisor_conversations` count is 5 rows total across 3 students (queried 2026-09-03), too
 * small to extrapolate a monthly rate from honestly. $3 buys roughly 1,300 calls/month at
 * this rate — headroom against a real runaway, not a projection from real usage that doesn't
 * exist yet. Revisit once this job has actually run and ai_usage has real rows to check
 * against, same discipline the other two estimates above already ask for.
 */
export const JOB_BUDGET_USD: Record<JobBudgetFeature, number> = {
  opportunity_extraction: envBudgetUsd("AI_JOB_BUDGET_OPPORTUNITY_EXTRACTION_USD", 25),
  requirement_extraction: envBudgetUsd("AI_JOB_BUDGET_REQUIREMENT_EXTRACTION_USD", 15),
  opportunity_reverification: envBudgetUsd("AI_JOB_BUDGET_OPPORTUNITY_REVERIFICATION_USD", 5),
  advisor_conversation_retention: envBudgetUsd("AI_JOB_BUDGET_ADVISOR_CONVERSATION_RETENTION_USD", 3),
};

export type JobBudgetReason = "under_budget" | "over_budget" | "unknown_cost_this_month" | "usage_unavailable";

export interface JobBudgetCheck {
  allowed: boolean;
  reason: JobBudgetReason;
  /** Null only when usage_unavailable — never a fabricated 0, same "absent is not zero"
   *  rule as ./budget.ts's ModelSelection.monthToDateSpendUsd. */
  monthToDateSpendUsd: number | null;
  budgetUsd: number;
}

/**
 * Thrown by assertWithinJobBudget. Callers catch this specifically to stop a run cleanly —
 * it is an expected stopping condition, the job doing correctly less work this month, not a
 * failure — so it must never be allowed to propagate into lib/jobs/run-with-tracking.ts's
 * generic catch, which marks a job "failed" and records `error`. See
 * lib/opportunities/discover.ts / lib/requirements/discover.ts for where it's caught.
 */
export class JobBudgetExceededError extends Error {
  readonly feature: JobBudgetFeature;
  readonly reason: JobBudgetReason;
  readonly monthToDateSpendUsd: number | null;
  readonly budgetUsd: number;

  constructor(check: JobBudgetCheck & { feature: JobBudgetFeature }) {
    super(`[job-budget] ${check.feature} is over its monthly budget ($${check.monthToDateSpendUsd ?? "?"} / $${check.budgetUsd}, reason: ${check.reason})`);
    this.name = "JobBudgetExceededError";
    this.feature = check.feature;
    this.reason = check.reason;
    this.monthToDateSpendUsd = check.monthToDateSpendUsd;
    this.budgetUsd = check.budgetUsd;
  }
}

function currentUtcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Live override for one feature's monthly budget (migration 0099, job_budget_overrides) —
 * admin-adjustable without a deploy, unlike JOB_BUDGET_USD's own AI_JOB_BUDGET_*_USD env-var
 * default. A missing row, or a failed read, both fall back to JOB_BUDGET_USD[feature] — never
 * to zero or "no budget" (oryn-a7, 2026-09-02): this gates a real, already-loose spend
 * control (jobs stop, they don't degrade — see this file's own header), and failing toward
 * "unbudgeted" would be exactly the silent-hole shape the rest of tonight has spent closing
 * elsewhere. Takes an already-constructed admin client rather than making its own —
 * checkJobBudget, its only caller, already has one in scope for the ai_usage read alongside
 * it, and constructing a second serves no purpose.
 */
async function resolveJobBudgetUsd(admin: SupabaseClient<Database>, feature: JobBudgetFeature): Promise<number> {
  const { data, error } = await admin.from("job_budget_overrides").select("budget_usd").eq("feature", feature).maybeSingle();
  if (error || !data) return JOB_BUDGET_USD[feature];
  return data.budget_usd;
}

/**
 * Reads this calendar month's `ai_usage` for `feature` and decides whether another call is
 * allowed. Checked fresh every call, same reasoning as ./budget.ts's selectModelForUser:
 * these jobs run in small batches (up to 30 calls/night), so a single indexed
 * (feature, created_at) query is cheap enough to run before every one, and caching risks the
 * same silent-staleness failure mode that file's own comment warns about. The budget figure
 * itself is now resolved the same way, fresh per call, for the same reason.
 */
export async function checkJobBudget(feature: JobBudgetFeature): Promise<JobBudgetCheck> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error(`[job-budget] SUPABASE_SECRET_KEY not configured — skipping the ${feature} budget check, allowing the call`);
    return { allowed: true, reason: "usage_unavailable", monthToDateSpendUsd: null, budgetUsd: JOB_BUDGET_USD[feature] };
  }

  const [budgetUsd, { data, error }] = await Promise.all([
    resolveJobBudgetUsd(admin, feature),
    admin.from("ai_usage").select("estimated_cost").eq("feature", feature).gte("created_at", currentUtcMonthStartIso()),
  ]);
  if (error || !data) {
    console.error(`[job-budget] failed to read ai_usage for the ${feature} budget check — allowing the call`, error);
    return { allowed: true, reason: "usage_unavailable", monthToDateSpendUsd: null, budgetUsd };
  }

  // Same reasoning as ./budget.ts's identical check, scoped to a feature instead of a user:
  // an unpriced row means true spend is unknown, not zero. A job stops rather than guesses —
  // see this file's header for why "stop" is the safe default here, unlike the student case.
  const hasUnknownCostRows = data.some((row) => row.estimated_cost === null);
  const knownSpendUsd = data.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);

  if (hasUnknownCostRows) {
    return { allowed: false, reason: "unknown_cost_this_month", monthToDateSpendUsd: knownSpendUsd, budgetUsd };
  }
  if (knownSpendUsd >= budgetUsd) {
    return { allowed: false, reason: "over_budget", monthToDateSpendUsd: knownSpendUsd, budgetUsd };
  }
  return { allowed: true, reason: "under_budget", monthToDateSpendUsd: knownSpendUsd, budgetUsd };
}

/**
 * Throws JobBudgetExceededError when `feature` is over budget; resolves silently otherwise —
 * the ergonomics a call site wants right before its provider call. Named to mirror
 * assertWithinAIRateLimit (lib/ai/rate-limit.ts), the same "assert or throw" shape already
 * established for a per-call gate in this codebase.
 */
export async function assertWithinJobBudget(feature: JobBudgetFeature): Promise<void> {
  const check = await checkJobBudget(feature);
  if (!check.allowed) {
    // Visible in server logs today, not only once oryn-d0's admin surface reads ai_usage
    // for it — same reasoning as ./usage.ts's own console.log on a degraded call.
    console.log(`[job-budget] ${feature} stopped — ${check.reason}, $${check.monthToDateSpendUsd ?? "?"} / $${check.budgetUsd} this month`);
    throw new JobBudgetExceededError({ ...check, feature });
  }
}
