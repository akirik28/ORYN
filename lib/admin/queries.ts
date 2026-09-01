import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ExternalSyncJob, MessageReportStatus } from "@/types/database";
import { JOB_DEFINITIONS } from "@/lib/jobs/schedule";
import { summarizeJobHealth, EMPTY_STREAK_THRESHOLD, type JobHealthSummary } from "@/lib/jobs/job-health";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";

/**
 * Every admin-panel read, one module (docs/admin-panel-architecture-2026-09-02.md, D1). Each
 * function is called by exactly one self-fetching section component under
 * features/admin/sections/ — moved here from the old single `Promise.all` in page.tsx so a
 * section can be read, changed or deleted without reading the other seven, and so the page
 * itself stays composition-only.
 */

// ---------------------------------------------------------------------------------------------
// System tab: provider health, scheduled jobs
// ---------------------------------------------------------------------------------------------

export async function getProviderHealth(admin: SupabaseClient<Database>) {
  const { data } = await admin.from("provider_health").select("*").order("provider");
  return data ?? [];
}

export async function getJobHealth(admin: SupabaseClient<Database>): Promise<JobHealthSummary[]> {
  // One query per known job, not one shared `limit(N)` across every job name, so an
  // infrequently-run job can't be crowded out of view by another job's activity — the exact
  // silent-failure shape this section exists to catch. Unchanged from the original.
  const jobRunsByDefinition = await Promise.all(
    JOB_DEFINITIONS.map((def) => admin.from("external_sync_jobs").select("*").eq("job_name", def.jobName).order("started_at", { ascending: false }).limit(EMPTY_STREAK_THRESHOLD))
  );
  return JOB_DEFINITIONS.map((def, i) => summarizeJobHealth(def, (jobRunsByDefinition[i].data as ExternalSyncJob[] | null) ?? []));
}

// ---------------------------------------------------------------------------------------------
// People tab: moderation reports, user list
// ---------------------------------------------------------------------------------------------

export interface AdminReportRow {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reporterName: string | null;
  reportedName: string | null;
  reason: string;
  status: MessageReportStatus;
  createdAt: string;
  resolutionNote: string | null;
  messagePreview: string | null;
  recommendationPreview: string | null;
  /** Raw body only (or the repost-placeholder text) — NOT resolved against
   *  REPORTED_POST_MISSING_LABEL here. That constant lives in lib/social/posts-moderation.ts,
   *  which only an exact, test-enforced allowlist of admin-surface files may import
   *  (__tests__/social/posts-hidden.test.ts); features/admin/sections/reports-section.tsx is
   *  on that list, this query module is deliberately not, so the final fallback resolution
   *  happens there, not here. `null` means "postId is set but the post is gone" — the
   *  section applies the real label to exactly that case. */
  postBody: string | null;
  postId: string | null;
  postIsRemoved: boolean;
  postStillExists: boolean;
}

/**
 * Moved verbatim from the old page.tsx, including the "no nested PostgREST embed" reasoning:
 * message_reports has two FKs to profiles, so an embed needs constraint-name disambiguation —
 * fetch-then-zip instead, same convention as lib/universities/queries.ts.
 */
export async function getReports(admin: SupabaseClient<Database>): Promise<AdminReportRow[]> {
  const { data } = await admin.from("message_reports").select("*").order("created_at", { ascending: false }).limit(100);
  const reports = data ?? [];

  const profileIds = Array.from(new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id])));
  // `typeof id === "string"` rather than `!== null`: a report row fetched before its migration
  // is applied has the column *missing* (`undefined`), and `undefined !== null` is true — that
  // would put an undefined into an `.in()` list and produce a malformed query.
  const messageIds = Array.from(new Set(reports.map((r) => r.message_id).filter((id): id is string => typeof id === "string")));
  const recommendationIds = Array.from(new Set(reports.map((r) => r.recommendation_id).filter((id): id is string => typeof id === "string")));
  const postIds = Array.from(new Set(reports.map((r) => r.post_id).filter((id): id is string => typeof id === "string")));

  const [profilesRes, messagesRes, recommendationsRes, postsRes] = await Promise.all([
    profileIds.length > 0 ? admin.from("profiles").select("id, display_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    messageIds.length > 0 ? admin.from("messages").select("id, body").in("id", messageIds) : Promise.resolve({ data: [] }),
    recommendationIds.length > 0 ? admin.from("recommendations").select("id, body").in("id", recommendationIds) : Promise.resolve({ data: [] }),
    postIds.length > 0 ? admin.from("posts").select("id, body, removed_at").in("id", postIds) : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));
  const messageById = new Map((messagesRes.data ?? []).map((m) => [m.id, m.body]));
  const recommendationById = new Map((recommendationsRes.data ?? []).map((r) => [r.id, r.body]));
  // A repost with no commentary has a null body — still reportable content (it rebroadcasts
  // the original), so it needs a preview label rather than the "no longer available" one.
  const postById = new Map((postsRes.data ?? []).map((p) => [p.id, p.body ?? "(repost with no added comment)"]));
  const removedPostIds = new Set((postsRes.data ?? []).filter((p) => p.removed_at !== null).map((p) => p.id));

  return reports.map((r) => ({
    id: r.id,
    reporterId: r.reporter_id,
    reportedUserId: r.reported_user_id,
    reporterName: nameById.get(r.reporter_id) ?? null,
    reportedName: nameById.get(r.reported_user_id) ?? null,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    resolutionNote: r.resolution_note,
    messagePreview: r.message_id ? resolveReportedContentPreview(r.message_id, messageById, "(reported message no longer available)") : null,
    recommendationPreview: r.recommendation_id ? resolveReportedContentPreview(r.recommendation_id, recommendationById, "(reported recommendation no longer available)") : null,
    postBody: r.post_id ? (postById.get(r.post_id) ?? null) : null,
    postId: r.post_id,
    postIsRemoved: r.post_id ? removedPostIds.has(r.post_id) : false,
    postStillExists: r.post_id ? postById.has(r.post_id) : false,
  }));
}

export interface AdminUserRow {
  userId: string;
  displayName: string | null;
  /** Tiers don't exist yet — the minor-payment legal research in flight decides what a tier
   *  even attaches to (student vs. parent-as-payer). Always null until that's settled;
   *  rendered as "—", never invented from another field. */
  tier: null;
  signedUpAt: string;
  lastSeenAt: string | null;
  lifetimeSpendUsd: number;
}

/**
 * The user list: signup date, last seen, lifetime spend. "Last seen" is Supabase Auth's own
 * `last_sign_in_at` (`admin.auth.admin.listUsers`) — deliberately NOT `profiles.updated_at`,
 * which measures the last profile *edit*, a different and often much staler signal than the
 * last time someone actually opened the app.
 */
export async function getAdminUserList(admin: SupabaseClient<Database>): Promise<AdminUserRow[]> {
  const [{ data: profiles }, spendByUser, { data: authUsers }] = await Promise.all([
    admin.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }),
    getLifetimeSpendByUser(admin),
    admin.auth.admin.listUsers(),
  ]);

  const lastSeenById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (profiles ?? []).map((p) => ({
    userId: p.id,
    displayName: p.display_name,
    tier: null,
    signedUpAt: p.created_at,
    lastSeenAt: lastSeenById.get(p.id) ?? null,
    lifetimeSpendUsd: spendByUser.get(p.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------------------------
// Spend tab: summary, per-user, remaining credit, budget warnings
// ---------------------------------------------------------------------------------------------

/**
 * Founder-set budget guardrails (2026-09-02, relayed through oryn-a7): $0.50/student/month is
 * the target, $1.00 is the hard ceiling. The warning threshold is 80% of the CEILING — the
 * harder number, since the target is an aspiration and the ceiling is where real overage risk
 * starts. Kept here, not inline, because these are founder-set business figures that can
 * change independently of the code that reads them.
 */
export const PER_STUDENT_MONTHLY_TARGET_USD = 0.5;
export const PER_STUDENT_MONTHLY_CEILING_USD = 1.0;
export const BUDGET_WARNING_FRACTION = 0.8;
export const BUDGET_WARNING_THRESHOLD_USD = PER_STUDENT_MONTHLY_CEILING_USD * BUDGET_WARNING_FRACTION;

type AiUsageCostRow = Pick<Database["public"]["Tables"]["ai_usage"]["Row"], "estimated_cost">;

function sumCost(rows: readonly AiUsageCostRow[]): number {
  return rows.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);
}

/** Start of the current UTC calendar day, as an ISO string PostgREST's `.gte()` accepts. Every
 *  other window below (7d/30d) is a rolling window instead — see SpendSummary's own doc
 *  comment for why "today" specifically gets a calendar boundary and the others don't. */
function startOfTodayUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** `estimated_cost` summed for every ai_usage row created at or after `sinceIso`, with no
 *  row-count cap — the specific failure D3 exists to close ("last 500 calls" silently
 *  truncating and mislabeling itself as the table grows). PostgREST aggregate functions
 *  (`.select("estimated_cost.sum()")`) aren't available on this project
 *  (`pgrst.db_aggregates_enabled` is unset) without an RPC, which needs a migration this
 *  package isn't authorized to add — so this fetches the exact matching set (bounded by an
 *  explicit, honestly-labeled time window, never by an arbitrary row count) and sums in
 *  memory. Swap for a real `.sum()`/RPC if aggregates are ever enabled; the call sites below
 *  don't need to change. */
async function sumCostSince(admin: SupabaseClient<Database>, sinceIso: string): Promise<number> {
  const { data } = await admin.from("ai_usage").select("estimated_cost").gte("created_at", sinceIso);
  return sumCost(data ?? []);
}

export interface SpendByKey {
  key: string;
  calls: number;
  costUsd: number;
}

export interface SpendSummary {
  /** UTC calendar day — see startOfTodayUtcIso's own comment. */
  todayUsd: number;
  /** Rolling windows, not calendar-aligned — a calendar week/month boundary needs a timezone,
   *  and there is no single correct one here (the founder viewing this and the students
   *  generating the spend are not necessarily in the same one). Rolling is unambiguous and
   *  needs no timezone decision. */
  last7dUsd: number;
  last30dUsd: number;
  allTimeUsd: number;
  allTimeCalls: number;
  byFeature: SpendByKey[];
  byModel: SpendByKey[];
  /**
   * Calls with no user_id. NOT a leak or a coverage gap — oryn-60's audit of every
   * `logAIUsage` call site found nine student-facing features require a non-null `userId`
   * at the type level, and the two that legitimately pass null are background catalog jobs
   * (opportunity/requirement extraction) doing so by design; a deleted account would also
   * land here (ai_usage.user_id is ON DELETE SET NULL), but nothing today has exercised
   * that path. This is real spend the founder is paying for that belongs to no student, not
   * a defect to flag — rendered as a neutral fact (D5), never a warning color, so it doesn't
   * send anyone chasing a bug that isn't there. Always present on the summary, even at zero
   * — a line that disappears when clean is a line nobody notices when it isn't.
   *
   * The 3 rows live today are actually test fixtures (`model="test-model"`, identical-to-
   * the-microsecond timestamps — a bulk-INSERT signature, not real traffic), so this line
   * currently shows fixture noise rather than real background-job cost. oryn-60 recommends
   * deleting them; that's a live-table write, founder-gated, not done here.
   */
  unattributedCalls: number;
  unattributedUsd: number;
}

export async function getSpendSummary(admin: SupabaseClient<Database>): Promise<SpendSummary> {
  const [todayUsd, last7dUsd, last30dUsd, allRes] = await Promise.all([
    sumCostSince(admin, startOfTodayUtcIso()),
    sumCostSince(admin, daysAgoIso(7)),
    sumCostSince(admin, daysAgoIso(30)),
    admin.from("ai_usage").select("user_id, feature, model, estimated_cost"),
  ]);

  const rows = allRes.data ?? [];
  const byFeature = new Map<string, SpendByKey>();
  const byModel = new Map<string, SpendByKey>();
  let unattributedCalls = 0;
  let unattributedUsd = 0;

  for (const row of rows) {
    const cost = row.estimated_cost ?? 0;
    if (row.user_id === null) {
      unattributedCalls += 1;
      unattributedUsd += cost;
    }
    const feature = byFeature.get(row.feature) ?? { key: row.feature, calls: 0, costUsd: 0 };
    feature.calls += 1;
    feature.costUsd += cost;
    byFeature.set(row.feature, feature);

    const model = byModel.get(row.model) ?? { key: row.model, calls: 0, costUsd: 0 };
    model.calls += 1;
    model.costUsd += cost;
    byModel.set(row.model, model);
  }

  const byCostDesc = (a: SpendByKey, b: SpendByKey) => b.costUsd - a.costUsd;

  return {
    todayUsd,
    last7dUsd,
    last30dUsd,
    allTimeUsd: sumCost(rows),
    allTimeCalls: rows.length,
    byFeature: [...byFeature.values()].sort(byCostDesc),
    byModel: [...byModel.values()].sort(byCostDesc),
    unattributedCalls,
    unattributedUsd,
  };
}

export interface UserSpend {
  userId: string;
  displayName: string | null;
  last30dUsd: number;
  lifetimeUsd: number;
  callCount: number;
  overWarningThreshold: boolean;
  overCeiling: boolean;
}

async function getLifetimeSpendByUser(admin: SupabaseClient<Database>): Promise<Map<string, number>> {
  const { data } = await admin.from("ai_usage").select("user_id, estimated_cost").not("user_id", "is", null);
  const byUser = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.user_id) continue; // narrows for TS past the .not() filter above, which it can't see through
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + (row.estimated_cost ?? 0));
  }
  return byUser;
}

/**
 * Per-user spend, highest first — the screen version of the query that found a real student
 * at $3.04 in one week against a $1.00/month ceiling. Names attached via a batch profile
 * lookup, the same fetch-then-zip convention used throughout this file and
 * lib/universities/queries.ts.
 */
export async function getPerUserSpend(admin: SupabaseClient<Database>): Promise<UserSpend[]> {
  const since30d = daysAgoIso(30);
  const [{ data: rows }, lifetimeByUser] = await Promise.all([
    admin.from("ai_usage").select("user_id, estimated_cost, created_at").gte("created_at", since30d).not("user_id", "is", null),
    getLifetimeSpendByUser(admin),
  ]);

  const last30dByUser = new Map<string, { costUsd: number; calls: number }>();
  for (const row of rows ?? []) {
    if (!row.user_id) continue;
    const entry = last30dByUser.get(row.user_id) ?? { costUsd: 0, calls: 0 };
    entry.costUsd += row.estimated_cost ?? 0;
    entry.calls += 1;
    last30dByUser.set(row.user_id, entry);
  }

  // Every user with EITHER lifetime spend or recent spend, not just one or the other — a
  // student who spent only outside the last 30 days should still be listed (at $0 recent),
  // and vice versa for a brand-new spender with no older history.
  const userIds = new Set([...lifetimeByUser.keys(), ...last30dByUser.keys()]);
  const idList = [...userIds];
  const { data: profiles } = idList.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", idList) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return idList
    .map((userId) => {
      const recent = last30dByUser.get(userId) ?? { costUsd: 0, calls: 0 };
      return {
        userId,
        displayName: nameById.get(userId) ?? null,
        last30dUsd: recent.costUsd,
        lifetimeUsd: lifetimeByUser.get(userId) ?? 0,
        callCount: recent.calls,
        overWarningThreshold: recent.costUsd >= BUDGET_WARNING_THRESHOLD_USD,
        overCeiling: recent.costUsd >= PER_STUDENT_MONTHLY_CEILING_USD,
      };
    })
    .sort((a, b) => b.lifetimeUsd - a.lifetimeUsd);
}

export interface RemainingCredit {
  startingCreditUsd: number;
  startingCreditEnteredAt: string;
  totalSpendUsd: number;
  remainingUsd: number;
}

/**
 * Remaining credit is a manual figure, not a read from a provider — Anthropic's balance isn't
 * exposed by the API, so there is nothing to query. `ADMIN_STARTING_CREDIT_USD` /
 * `ADMIN_STARTING_CREDIT_ENTERED_AT` are edited by hand whenever the account is topped up (see
 * .env.example). Returns null when unconfigured, and the caller must render that as "not set
 * up" rather than $0 remaining — an unset figure is not the same claim as a verified-empty one.
 */
export async function getRemainingCredit(admin: SupabaseClient<Database>): Promise<RemainingCredit | null> {
  const startingCreditUsd = Number(process.env.ADMIN_STARTING_CREDIT_USD);
  const startingCreditEnteredAt = process.env.ADMIN_STARTING_CREDIT_ENTERED_AT;
  if (!Number.isFinite(startingCreditUsd) || !startingCreditEnteredAt) return null;

  const totalSpendUsd = await sumCostSince(admin, startingCreditEnteredAt);
  return { startingCreditUsd, startingCreditEnteredAt, totalSpendUsd, remainingUsd: startingCreditUsd - totalSpendUsd };
}
