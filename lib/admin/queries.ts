import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ExternalSyncJob, MessageReportStatus } from "@/types/database";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { JOB_DEFINITIONS } from "@/lib/jobs/schedule";
import { summarizeJobHealth, EMPTY_STREAK_THRESHOLD, type JobHealthSummary } from "@/lib/jobs/job-health";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";
import { MONTHLY_BUDGET_TARGET_USD, MONTHLY_BUDGET_CEILING_USD } from "@/lib/ai/limits/budget";

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
 *
 * `locale` defaults to English, same reasoning as lib/admissions/persist.ts's
 * refreshAdmissionOutlook — only affects the three "no longer available"/repost-placeholder
 * fallback strings below, nothing persisted.
 */
export async function getReports(admin: SupabaseClient<Database>, locale: Locale = DEFAULT_LOCALE): Promise<AdminReportRow[]> {
  const t = await getTranslations({ locale, namespace: "admin.reports" });
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
  const postById = new Map((postsRes.data ?? []).map((p) => [p.id, p.body ?? t("repostNoComment")]));
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
    messagePreview: r.message_id ? resolveReportedContentPreview(r.message_id, messageById, t("messageMissing")) : null,
    recommendationPreview: r.recommendation_id ? resolveReportedContentPreview(r.recommendation_id, recommendationById, t("recommendationMissing")) : null,
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

/** The two literal event_name strings logged when a saved birth year reveals a signup below
 *  the minimum age (app/(confirm-age)/confirm-age/actions.ts,
 *  app/(app)/settings/actions.ts) -- exhaustively grepped from every logEvent(...) call site
 *  2026-09-02, not a substring/LIKE guess. Both contain "below_minimum_age" but neither is
 *  that string alone, and there is no third variant. Exported so
 *  __tests__/admin/below-minimum-age-event-names.test.ts can pin this list against the real
 *  call sites rather than letting the two silently drift apart. */
export const BELOW_MINIMUM_AGE_EVENT_NAMES = ["birth_year_backfill_below_minimum_age", "birth_year_settings_update_below_minimum_age"] as const;

// product_events has no natural bound (an append-only analytics log, Phase 52) unlike this
// file's other People-tab tables. None of its ten known event names are high-frequency --
// one row per meaningful student action, not per click -- so at today's real volume (56 rows
// fleet-wide) this is a wide margin, not an active limit; it exists so a future, much larger
// table can't make this section's single fetch unbounded.
const PRODUCT_EVENTS_FETCH_LIMIT = 500;
const RECENT_EVENTS_DISPLAY_LIMIT = 20;

export interface AdminProductEventRow {
  id: string;
  userId: string;
  displayName: string | null;
  eventName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AdminProductActivity {
  /** Every distinct event_name in the fetched window with its raw count, sorted desc. Not a
   *  funnel or a conversion percentage: Phase 19's minimum-cohort discipline (written for
   *  peer benchmarking, n >= 100) applies here too, and today's real n is 56 rows across ten
   *  names -- a derived "62% of imports reach onboarding" figure from a sample that size
   *  would be noise dressed as a statistic. Raw counts don't make that claim. */
  eventCounts: { eventName: string; count: number }[];
  /** The RECENT_EVENTS_DISPLAY_LIMIT most recent events fleet-wide, newest first -- a feed
   *  for one founder with eleven accounts, not a queryable log; no filters, no pagination. */
  recentEvents: AdminProductEventRow[];
  /** Every below-minimum-age event in the fetched window, deliberately NOT limited to
   *  RECENT_EVENTS_DISPLAY_LIMIT -- the one category that exists specifically for a human to
   *  see (see BELOW_MINIMUM_AGE_EVENT_NAMES) can't be allowed to scroll out of view just
   *  because other, routine events happened more recently. */
  belowMinimumAgeEvents: AdminProductEventRow[];
}

/**
 * product_events (lib/analytics/log.ts) had no reader anywhere in the app before this
 * function -- not a screen, not a job, not a report (found during the 2026-09-02 session-
 * client sweep: "no screen, no admin section, no job, no report"). Two of its ten event
 * names exist specifically so a human can see them (BELOW_MINIMUM_AGE_EVENT_NAMES): the
 * confirm-age and settings flows both save a below-minimum-age birth year unconditionally
 * rather than blocking it, on the premise in docs/age-gate-design-2026-09-02.md that GDPR
 * Art. 8(2)'s "reasonable efforts to verify" duty is satisfied by a human follow-up instead
 * -- a premise this function is what makes true, since nothing else reads this table.
 *
 * Read-only (no writes, no new columns, no migration) -- one fetch, three views: counts per
 * event name, a recent-activity feed, and the below-minimum-age events, pulled out unbounded
 * by the feed's own display cap. See AdminProductActivity's own field comments for why.
 */
export async function getProductActivity(admin: SupabaseClient<Database>): Promise<AdminProductActivity> {
  const { data: events } = await admin
    .from("product_events")
    .select("id, user_id, event_name, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(PRODUCT_EVENTS_FETCH_LIMIT);
  const rows = events ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", userIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const toRow = (r: (typeof rows)[number]): AdminProductEventRow => ({
    id: r.id,
    userId: r.user_id,
    displayName: nameById.get(r.user_id) ?? null,
    eventName: r.event_name,
    createdAt: r.created_at,
    metadata: r.metadata,
  });

  const countByName = new Map<string, number>();
  for (const r of rows) countByName.set(r.event_name, (countByName.get(r.event_name) ?? 0) + 1);
  const eventCounts = [...countByName.entries()].map(([eventName, count]) => ({ eventName, count })).sort((a, b) => b.count - a.count);

  const belowMinimumAgeNames: readonly string[] = BELOW_MINIMUM_AGE_EVENT_NAMES;
  return {
    eventCounts,
    recentEvents: rows.slice(0, RECENT_EVENTS_DISPLAY_LIMIT).map(toRow),
    belowMinimumAgeEvents: rows.filter((r) => belowMinimumAgeNames.includes(r.event_name)).map(toRow),
  };
}

// ---------------------------------------------------------------------------------------------
// Spend tab: summary, per-user, remaining credit, budget warnings
// ---------------------------------------------------------------------------------------------

/**
 * Founder-set budget guardrails (2026-09-02, relayed through oryn-a7): $0.50/student/month is
 * the target, $1.00 is the hard ceiling. The warning threshold is 80% of the CEILING — the
 * harder number, since the target is an aspiration and the ceiling is where real overage risk
 * starts.
 *
 * FIXED 2026-09-02 (docs/ai-spend-cap-2026-09-02.md): these two figures used to be redefined
 * here, independently of lib/ai/limits/budget.ts's own `MONTHLY_BUDGET_TARGET_USD`/
 * `MONTHLY_BUDGET_CEILING_USD` — the same founder-set numbers, typed twice, with nothing
 * tying them together. That module is where the numbers actually do something (degrading a
 * student to a cheaper model); this one only ever displayed them. Re-exported under this
 * file's existing names rather than changing every admin component that already imports
 * them — the display layer now reads the enforcement layer's own constant instead of a
 * second copy of the founder's number that could silently drift from it.
 */
export const PER_STUDENT_MONTHLY_TARGET_USD = MONTHLY_BUDGET_TARGET_USD;
export const PER_STUDENT_MONTHLY_CEILING_USD = MONTHLY_BUDGET_CEILING_USD;
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

  // Excludes fixture rows a test run wrote directly into the live table (model: "test-model",
  // 3 rows, 2026-08-15, confirmed live 2026-09-02 during the per-student cap work) -- they
  // carry `user_id: null`, so no per-student figure anywhere ever counted them, but this
  // summary's own totals (allTimeCalls, byFeature/byModel) had no such filter and were
  // counting them as if they were real background-job spend.
  const rows = (allRes.data ?? []).filter((row) => row.model !== "test-model");
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

// ---------------------------------------------------------------------------------------------
// Finance tab: exchange rate config, cost trend
// ---------------------------------------------------------------------------------------------

export interface ExchangeRate {
  /** TL per 1 USD — a rate of 40 means $1 costs 40 TL, matching
   *  docs/maliyet-ve-fiyatlandirma-2026-09-02.md's own "KUR = ___ TL/USD" framing. */
  rateTryPerUsd: number;
  enteredAt: string;
}

/**
 * The USD/TRY rate is unknown and this codebase will not guess it — CEO's own words,
 * relaying the founder's refusal to invent one in the cost doc: "bilgi kesme tarihim bu
 * hesabın yapıldığı günden önce, ve yanlış bir kur bütün tabloyu sessizce bozar" (my
 * knowledge cutoff predates this calculation, and a wrong rate silently corrupts the whole
 * table). Same shape as `getRemainingCredit` immediately above — a manually-entered pair
 * (value + when it was entered, so staleness is visible), `null` when unconfigured, and
 * every caller in `lib/admin/finance.ts` that needs this threads the `null` through as
 * `RateDependent`'s `available: false` rather than falling back to a guessed number.
 *
 * Not `async` and takes no `admin` client, unlike every other function in this file — it
 * reads only `process.env`, no Supabase call. Safe to call with or without `await` from a
 * section component; kept alongside the other Spend/Finance reads for the same reason
 * `getRemainingCredit` is grouped here despite reading `.env` too, not `ai_usage`.
 */
export function getConfiguredExchangeRate(): ExchangeRate | null {
  const rateTryPerUsd = Number(process.env.ADMIN_USD_TRY_RATE);
  const enteredAt = process.env.ADMIN_USD_TRY_RATE_ENTERED_AT;
  if (!Number.isFinite(rateTryPerUsd) || rateTryPerUsd <= 0 || !enteredAt) return null;
  return { rateTryPerUsd, enteredAt };
}

export interface CostTrendPoint {
  /** UTC calendar day, `YYYY-MM-DD` — matches startOfTodayUtcIso's own boundary choice
   *  elsewhere in this file, for the same reason (a trend needs a consistent day boundary;
   *  this file's other windows are rolling and don't need one, a day-by-day series does). */
  date: string;
  costUsd: number;
  calls: number;
}

/**
 * Real, measured AI spend per UTC calendar day over the trailing `days` — the "so a change
 * in behaviour is visible before it's a surprise" figure from the assignment. Deliberately
 * AI spend only, not AI-plus-amortized-fixed-infra: `RECURRING_INFRA_USD`/
 * `SYSTEM_JOB_COSTS_USD` (lib/admin/finance.ts) are flat monthly totals with no real daily
 * shape of their own — charting a constant divided by 30 as if it were a trend would imply a
 * pattern that doesn't exist. Fixed cost belongs in the unit-economics breakdown, not here.
 *
 * Fetches once (bounded by `days`, an honest, stated window — same D3 discipline as
 * `sumCostSince`'s own comment on why an unbounded row-count fetch would be wrong) and buckets
 * in memory, for the same `pgrst.db_aggregates_enabled`-is-unset reason `sumCostSince`
 * already documents: a real `.sum() ... group by` would be one query instead of one fetch
 * plus a reduce, and is the thing to switch to if aggregates are ever enabled.
 */
export async function getCostTrend(admin: SupabaseClient<Database>, days = 30): Promise<CostTrendPoint[]> {
  const sinceIso = daysAgoIso(days);
  const { data } = await admin.from("ai_usage").select("created_at, estimated_cost, model").gte("created_at", sinceIso);
  const rows = (data ?? []).filter((row) => row.model !== "test-model"); // same fixture-row exclusion as getSpendSummary

  const byDay = new Map<string, { costUsd: number; calls: number }>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10); // YYYY-MM-DD, UTC — created_at is already UTC ISO
    const entry = byDay.get(date) ?? { costUsd: 0, calls: 0 };
    entry.costUsd += row.estimated_cost ?? 0;
    entry.calls += 1;
    byDay.set(date, entry);
  }

  return [...byDay.entries()].map(([date, { costUsd, calls }]) => ({ date, costUsd, calls })).sort((a, b) => a.date.localeCompare(b.date));
}
