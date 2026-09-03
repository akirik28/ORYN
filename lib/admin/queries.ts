import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ExternalSyncJob, MessageReportStatus, Opportunity, OpportunityCategory, DataStatus, PlanTier, OpportunityStatus, ActionStatus } from "@/types/database";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { JOB_DEFINITIONS } from "@/lib/jobs/schedule";
import { summarizeJobHealth, EMPTY_STREAK_THRESHOLD, type JobHealthSummary } from "@/lib/jobs/job-health";
import { PROVIDER_DEFINITIONS, summarizeProviderHealth, type ProviderHealthSummary } from "@/lib/admin/provider-health";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";
import { MONTHLY_BUDGET_TARGET_USD, MONTHLY_BUDGET_CEILING_USD } from "@/lib/ai/limits/budget";
import { PER_STUDENT_AI_FEATURES } from "@/lib/ai/monthly-quota";
import { JOB_BUDGET_USD, checkJobBudget, type JobBudgetFeature, type JobBudgetReason } from "@/lib/ai/limits/job-budget";
import { checkWeeklyPlanAggregateBudget } from "@/lib/ai/limits/weekly-plan-budget";
import type { SeriesPoint } from "@/components/oryn/charts/types";
import { isOpportunityActionable, isOpportunitySufficientlyVerified, hasDeadlineCommitment, hasAnyVerificationRecord } from "@/lib/opportunities/lifecycle";
import { isUndefinedColumnError, isUndefinedTableError } from "@/lib/supabase/errors";
import { ULTRA_PRICE_TRY } from "@/lib/admin/finance";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { CONTAMINATION_CLEANUP_2026_09_02 } from "@/lib/opportunities/contamination-cleanup-2026-09-02";

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

/**
 * The expected-set-driven counterpart to `getProviderHealth` above — same relationship
 * `getJobHealth` already has to `JOB_DEFINITIONS`. Additive, not a replacement:
 * `getProviderHealth`'s existing row-shaped return still backs the current section
 * unchanged; this is the richer shape (`ProviderHealthSummary[]`, one entry per
 * *expected* provider, staleness-classified) the operational-health timeline view builds
 * from once it exists. See lib/admin/provider-health.ts for why a provider with zero rows
 * reads as `unknown`/`never_called` rather than being silently absent.
 */
export async function getProviderHealthSummaries(admin: SupabaseClient<Database>): Promise<ProviderHealthSummary[]> {
  const { data } = await admin.from("provider_health").select("*");
  const rowByProvider = new Map((data ?? []).map((row) => [row.provider, row]));
  return PROVIDER_DEFINITIONS.map((def) => summarizeProviderHealth(def, rowByProvider.get(def.provider) ?? null));
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

/** Re-exported so the section component's reads all come from this one module (D1), even
 *  though the underlying function also serves the non-admin /api/jobs/* cron routes and so
 *  lives in lib/jobs/ rather than here — see lib/jobs/job-controls.ts's own comment. */
export { getJobControls } from "@/lib/jobs/job-controls";

const RELIABILITY_TREND_DAYS = 30;

/** UTC calendar date from a PostgREST-returned ISO timestamp string — matches the
 *  `.toISOString().slice(0, 10)` convention used throughout lib/ (e.g.
 *  lib/social/profile-views.ts's own local `isoDate`), applied directly to the string
 *  PostgREST already returns rather than round-tripping through a new Date(). */
function isoDateOf(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export interface AIReliabilityDay {
  /** UTC calendar date, YYYY-MM-DD. */
  date: string;
  totalCalls: number;
  degradedCalls: number;
}

export interface AIReliabilityTrend {
  /** Oldest first — a chart's natural left-to-right reading order. Only dates with at
   *  least one call are present; a caller rendering a fixed 30-day axis fills the gaps. */
  days: AIReliabilityDay[];
  /**
   * A call that throws after tokens are already spent (AIResponseIncompleteError /
   * AIStructuredResponseFailedError — see lib/ai/usage.ts's withUsageLogging) is logged to
   * `ai_usage` with the exact same shape as a successful call: same feature, model, token
   * counts, cost. There is no column recording whether the call actually produced a usable
   * result, so this trend can show *degraded* calls (a real signal — a student got a
   * cheaper model under the spend cap) but cannot show *failed* calls at all. Always
   * `false`, kept as an explicit field rather than omitted, so a reader sees "not
   * measurable yet" instead of reading an absent failure count as "zero failures happened."
   * Closing this for real needs a migration (an outcome/success column on `ai_usage`) —
   * out of scope for a read-only pass; named here so it isn't lost.
   */
  hardFailureTrackingAvailable: false;
}

/** Pure aggregation step, split out from `getAIReliabilityTrend` so the bucketing logic is
 *  unit-testable without a database — same reasoning as `summarizeJobHealth`/
 *  `summarizeProviderHealth` staying DB-free. Excludes the same test-fixture rows
 *  (model: "test-model") `getSpendSummary` already filters out, for the same reason: real
 *  traffic, not a test run's leftovers in the live table. */
export function bucketAIReliabilityByDay(rows: readonly { created_at: string; degraded: boolean; model: string }[]): AIReliabilityDay[] {
  const filtered = rows.filter((row) => row.model !== "test-model");
  const byDate = new Map<string, { totalCalls: number; degradedCalls: number }>();
  for (const row of filtered) {
    const date = isoDateOf(row.created_at);
    const entry = byDate.get(date) ?? { totalCalls: 0, degradedCalls: 0 };
    entry.totalCalls += 1;
    if (row.degraded) entry.degradedCalls += 1;
    byDate.set(date, entry);
  }
  return [...byDate.entries()].map(([date, counts]) => ({ date, ...counts })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Daily degraded-call rate over the last `RELIABILITY_TREND_DAYS` — the "what's failing for
 * real students" question, scoped to what `ai_usage` can actually answer today (see
 * `hardFailureTrackingAvailable`'s own doc comment for the sharper question it can't).
 * Aggregated in memory for the same reason `getSpendSummary` is (PostgREST aggregates
 * aren't enabled on this project without a migration) — bounded by an explicit, honestly
 * labeled window, never by an arbitrary row count.
 */
export async function getAIReliabilityTrend(admin: SupabaseClient<Database>): Promise<AIReliabilityTrend> {
  const { data } = await admin.from("ai_usage").select("created_at, degraded, model").gte("created_at", daysAgoIso(RELIABILITY_TREND_DAYS));
  return { days: bucketAIReliabilityByDay(data ?? []), hardFailureTrackingAvailable: false };
}

export interface RateLimitDay {
  date: string;
  totalEvents: number;
  byAction: { action: string; count: number }[];
}

/** Pure aggregation step, split out for the same testability reason as
 *  `bucketAIReliabilityByDay`. */
export function bucketRateLimitEventsByDay(rows: readonly { action: string; created_at: string }[]): RateLimitDay[] {
  const byDate = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const date = isoDateOf(row.created_at);
    const actions = byDate.get(date) ?? new Map<string, number>();
    actions.set(row.action, (actions.get(row.action) ?? 0) + 1);
    byDate.set(date, actions);
  }

  return [...byDate.entries()]
    .map(([date, actions]) => ({
      date,
      totalEvents: [...actions.values()].reduce((sum, n) => sum + n, 0),
      byAction: [...actions.entries()].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Daily rate-limit hits over the last `RELIABILITY_TREND_DAYS` — a genuinely real "something
 * didn't work for a student" signal (a throttled request), distinct from and complementary
 * to the AI-reliability trend above (a rate limit can fire on a feature that never calls
 * the AI provider at all). Real volume today is small (6 rows, 2 distinct actions, live
 * 2026-09-02) — this is meant to be ready for real traffic, not calibrated against it.
 */
export async function getRateLimitTrend(admin: SupabaseClient<Database>): Promise<RateLimitDay[]> {
  const { data } = await admin.from("rate_limit_events").select("action, created_at").gte("created_at", daysAgoIso(RELIABILITY_TREND_DAYS));
  return bucketRateLimitEventsByDay(data ?? []);
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

export interface ReportsBacklog {
  openCount: number;
  oldestOpenAt: string | null;
  oldestOpenAgeMs: number | null;
}

/**
 * Age and backlog size, not just a row list — "a queue nobody has looked at is an
 * operational fact" (oryn-a7's framing). Pure, computed from `getReports`'s own already-
 * fetched rows rather than a second query, so the two can never disagree about what "open"
 * means. Inherits `getReports`'s own 100-row cap: with message_reports genuinely empty
 * today (confirmed live, 2026-09-02 — the social layer that generates reports is switched
 * off) this bound doesn't matter yet, but if it ever fills past 100 rows, "oldest open"
 * here means oldest among the 100 most recent, not oldest ever — the same window-honesty
 * discipline as the AI-usage trends above.
 */
export function summarizeReportsBacklog(reports: readonly AdminReportRow[], now: Date = new Date()): ReportsBacklog {
  const open = reports.filter((r) => r.status === "open");
  if (open.length === 0) return { openCount: 0, oldestOpenAt: null, oldestOpenAgeMs: null };

  const oldest = open.reduce((a, b) => (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime() ? a : b));
  return { openCount: open.length, oldestOpenAt: oldest.createdAt, oldestOpenAgeMs: now.getTime() - new Date(oldest.createdAt).getTime() };
}

export interface AdminUserRow {
  userId: string;
  displayName: string | null;
  /** Live as of migration 0089/2026-09-02 (the minor-payment question this used to be
   *  blocked on turned out to be orthogonal — plan_tier is a visual skin, not a billing
   *  entity, see that migration's own header) — `resolvePlanTier`'s own "absent defaults to
   *  standard" convention, never a raw column read, so a database where 0089 hasn't applied
   *  yet still renders a real value instead of null. */
  tier: PlanTier;
  signedUpAt: string;
  lastSeenAt: string | null;
  lifetimeSpendUsd: number;
  /** Raw grant timestamp (migration 0104), not a derived boolean — the admin UI needs both
   *  "has this student ever received the gift" (non-null, forever) and a real date to show
   *  next to the "used" label, which a boolean alone would throw away. */
  ultraGiftGrantedAt: string | null;
}

/**
 * The user list: signup date, last seen, lifetime spend, plan tier. "Last seen" is Supabase
 * Auth's own `last_sign_in_at` (`admin.auth.admin.listUsers`) — deliberately NOT
 * `profiles.updated_at`, which measures the last profile *edit*, a different and often much
 * staler signal than the last time someone actually opened the app.
 */
export async function getAdminUserList(admin: SupabaseClient<Database>): Promise<AdminUserRow[]> {
  const [profilesResult, spendByUser, { data: authUsers }] = await Promise.all([
    admin.from("profiles").select("id, display_name, created_at, plan_tier, ultra_gift_granted_at").order("created_at", { ascending: false }),
    getLifetimeSpendByUser(admin),
    admin.auth.admin.listUsers(),
  ]);

  // Named select, not `*` -- migration 0104 unapplied makes this the same "PostgREST
  // validates the requested column list" shape lib/supabase/errors.ts's own comment
  // documents for lib/notifications/create.ts, not the silent-omission shape resolvePlanTier
  // relies on elsewhere. Retried without the one new column rather than defaulted, because
  // the alternative -- `profiles ?? []` swallowing the error, as this function used to do --
  // loses every OTHER real field (display name, signup date, tier) for every student, not
  // just the gift timestamp. Confirmed live 2026-09-03: this exact query silently emptied
  // the whole admin user list against the real database before this retry existed.
  let profiles = profilesResult.data;
  if (profilesResult.error && isUndefinedColumnError(profilesResult.error, "ultra_gift_granted_at")) {
    const fallback = await admin.from("profiles").select("id, display_name, created_at, plan_tier").order("created_at", { ascending: false });
    profiles = fallback.data?.map((p) => ({ ...p, ultra_gift_granted_at: null as string | null })) ?? null;
  } else if (profilesResult.error) {
    console.error("[admin] failed to read profiles for user list", { error: profilesResult.error });
  }

  const lastSeenById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (profiles ?? []).map((p) => ({
    userId: p.id,
    displayName: p.display_name,
    tier: resolvePlanTier(p),
    signedUpAt: p.created_at,
    lastSeenAt: lastSeenById.get(p.id) ?? null,
    lifetimeSpendUsd: spendByUser.get(p.id) ?? 0,
    ultraGiftGrantedAt: p.ultra_gift_granted_at ?? null,
  }));
}

export interface AdminOpportunityRow {
  id: string;
  title: string;
  organization: string | null;
  category: string;
  status: OpportunityStatus;
  createdAt: string;
}

const ADMIN_OPPORTUNITY_LIST_LIMIT = 50;

/**
 * A moderation-scoped list, not the student browse catalog (lib/opportunities/browse.ts) —
 * that one filters to `status = "active"` and joins per-user matching/eligibility, neither
 * of which an admin looking for a bad record wants: they need to find and act on
 * `"disabled"` rows too (to reactivate one, mistakenly disabled), and they aren't a
 * student being matched against anything. No new migration — `status` already has
 * `"disabled"` as a real value (types/database.ts), and every student-facing read already
 * filters `.eq("status", "active")`, so setting it is already sufficient; this is purely
 * the read side an admin needs to find what to act on.
 *
 * `q` searches title and organization (`ilike`, case-insensitive substring) — not a search
 * index, a moderation tool for a founder who already knows roughly what they're looking
 * for ("AI Scholars", the record oryn-a7 named). Empty query returns the
 * ADMIN_OPPORTUNITY_LIST_LIMIT most recently created rows, since a bad record is most
 * often a recent ingestion-batch problem (oryn-31's 37 garbled-description rows, all one
 * batch) rather than evenly spread across the whole catalog.
 */
export async function getAdminOpportunityList(admin: SupabaseClient<Database>, q?: string): Promise<AdminOpportunityRow[]> {
  let query = admin.from("opportunities").select("id, title, organization, category, status, created_at").order("created_at", { ascending: false }).limit(ADMIN_OPPORTUNITY_LIST_LIMIT);

  const trimmed = q?.trim();
  if (trimmed) {
    // Escape ilike's own wildcards (%, _) in the search term so a literal "%" or "_" typed
    // by an admin searches for that character rather than being interpreted as a wildcard.
    const escaped = trimmed.replace(/[%_]/g, "\\$&");
    query = query.or(`title.ilike.%${escaped}%,organization.ilike.%${escaped}%`);
  }

  const { data } = await query;
  return (data ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    organization: o.organization,
    category: o.category,
    status: o.status,
    createdAt: o.created_at,
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

/**
 * Which of the three cost shapes docs/ai-cost-at-scale-2026-09-02.md §2 names a feature
 * belongs to: "student_pool" (PER_STUDENT_AI_FEATURES, the shared monthly allowance),
 * "job_budgeted" (the two catalog jobs, lib/ai/limits/job-budget.ts's own per-feature
 * budgets), or "admin_only" (requirement_interpretation — an admin action, not student
 * spend; excluded from the shared pool for exactly this reason, see monthly-quota.ts's own
 * comment). Derived from the enforcement layer's own constants wherever one exists rather
 * than retyped here, so a feature added to either list is picked up automatically — the one
 * exception is ADMIN_ONLY_AI_FEATURES below, which has no shared constant to derive from.
 */
export type AiFeatureCategory = "student_pool" | "job_budgeted" | "admin_only" | "uncategorized";

/** lib/ai/interpret-requirement.ts's own feature string — the one entry with no shared
 *  constant to derive from (see AiFeatureCategory's own comment). */
const ADMIN_ONLY_AI_FEATURES = ["requirement_interpretation"] as const;

/**
 * Every AI feature this admin surface knows about, whether or not it has ever been called.
 * Ten total, verified against every real withUsageLogging/logAIUsage call site (2026-09-02):
 * seven student_pool + two job_budgeted + one admin_only. This exists to fix a real gap, not
 * to add a list for its own sake — byFeature below used to be built purely from `ai_usage`
 * rows, so a feature with zero calls had no row and was indistinguishable from a feature
 * that doesn't exist. Six of the ten currently have zero real calls
 * (docs/ai-cost-at-scale-2026-09-02.md §1) — that fact is itself the story a founder needs
 * to see ("that shape is the story", oryn-a7, 2026-09-02), and a purely data-driven list was
 * hiding it.
 */
const KNOWN_AI_FEATURES: readonly string[] = [...PER_STUDENT_AI_FEATURES, ...Object.keys(JOB_BUDGET_USD), ...ADMIN_ONLY_AI_FEATURES];

// Exported (unlike this file's other internal helpers) so it can be unit-tested directly —
// see __tests__/admin/ai-spend-shape.test.ts's own header for why this file's established
// convention is "pure logic gets a test, thin DB wrapping doesn't."
export function categorizeAiFeature(feature: string): AiFeatureCategory {
  if ((PER_STUDENT_AI_FEATURES as readonly string[]).includes(feature)) return "student_pool";
  if (feature in JOB_BUDGET_USD) return "job_budgeted";
  if ((ADMIN_ONLY_AI_FEATURES as readonly string[]).includes(feature)) return "admin_only";
  return "uncategorized";
}

export interface SpendByFeature extends SpendByKey {
  category: AiFeatureCategory;
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
  /** Zero-filled from KNOWN_AI_FEATURES (see that constant's own comment) — every known
   *  feature appears here, even at $0/0 calls, tagged with its cost-shape category. Sorted
   *  by cost desc, so the zero rows settle to the bottom without needing a second sort key.
   *  This changes what the existing spend-summary-section.tsx renders today (four rows with
   *  real calls become ten, six of them at $0.00) — a correct and intended change, flagged
   *  here since it's a visible behavior change to already-shipped UI, not only new surface. */
  byFeature: SpendByFeature[];
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
  /**
   * Rows where estimateCostUsd (lib/ai/pricing.ts) returned null — a model absent from its
   * pricing table. Every dollar figure on this interface already silently treats a null
   * estimated_cost as $0 (`?? 0`), the same gap selectModelForUser's own hasUnknownCostRows
   * guards against on the enforcement side — so a rising unpricedCalls count means every
   * total above is a floor, not an exact figure, and this is the line that says so instead
   * of leaving that caveat implicit. Excludes the three `model="test-model"` fixture rows
   * (see unattributedCalls' own comment) — those are expected to be unpriced, not a sign the
   * pricing table itself is stale.
   */
  unpricedCalls: number;
  unpricedByModel: { model: string; calls: number }[];
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
  const byFeature = new Map<string, SpendByFeature>();
  const byModel = new Map<string, SpendByKey>();
  const unpricedByModel = new Map<string, number>();
  let unattributedCalls = 0;
  let unattributedUsd = 0;
  let unpricedCalls = 0;

  // Seeded from every known feature, not only ones with rows -- see KNOWN_AI_FEATURES.
  for (const feature of KNOWN_AI_FEATURES) {
    byFeature.set(feature, { key: feature, calls: 0, costUsd: 0, category: categorizeAiFeature(feature) });
  }

  for (const row of rows) {
    const cost = row.estimated_cost ?? 0;
    if (row.user_id === null) {
      unattributedCalls += 1;
      unattributedUsd += cost;
    }
    if (row.estimated_cost === null) {
      unpricedCalls += 1;
      unpricedByModel.set(row.model, (unpricedByModel.get(row.model) ?? 0) + 1);
    }

    const feature = byFeature.get(row.feature) ?? { key: row.feature, calls: 0, costUsd: 0, category: categorizeAiFeature(row.feature) };
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
    unpricedCalls,
    unpricedByModel: [...unpricedByModel.entries()].map(([model, calls]) => ({ model, calls })).sort((a, b) => b.calls - a.calls),
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
  /** Calendar month to date — the window selectModelForUser/getMonthlyQuota actually check
   *  (deliberately not last30dUsd's rolling window above; see DegradeStandingRow's own
   *  comment on why the two can disagree). Shown so a "reset this month"/grant control has a
   *  real number to act on, not last30dUsd's different window standing in for it. */
  monthToDateSpendUsd: number;
  /** This calendar month's total already granted via quota_grants (migration 0096) — 0 when
   *  nothing has been granted, always present so "already reset" is visible rather than
   *  reading identically to "never touched." */
  monthToDateGrantsUsd: number;
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

/** Every user's calendar-month-to-date real spend — the same window selectModelForUser and
 *  getMonthlyQuota check, aggregated for all students at once rather than looping
 *  lib/ai/limits/grants.ts's single-user getMonthlyGrantsUsd per row (which would be N+1
 *  queries here). Mirrors getLifetimeSpendByUser's own shape immediately above. */
async function getMonthToDateSpendByUser(admin: SupabaseClient<Database>): Promise<Map<string, number>> {
  const { data } = await admin.from("ai_usage").select("user_id, estimated_cost").not("user_id", "is", null).gte("created_at", currentUtcMonthStartIso());
  const byUser = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.user_id) continue;
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + (row.estimated_cost ?? 0));
  }
  return byUser;
}

/** Every user's calendar-month-to-date grants (quota_grants, migration 0096) — same
 *  all-users-at-once reasoning as getMonthToDateSpendByUser immediately above. */
async function getMonthToDateGrantsByUser(admin: SupabaseClient<Database>): Promise<Map<string, number>> {
  const { data } = await admin.from("quota_grants").select("user_id, amount_usd").gte("created_at", currentUtcMonthStartIso());
  const byUser = new Map<string, number>();
  for (const row of data ?? []) {
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + row.amount_usd);
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
  const [{ data: rows }, lifetimeByUser, monthToDateByUser, monthToDateGrantsByUser] = await Promise.all([
    admin.from("ai_usage").select("user_id, estimated_cost, created_at").gte("created_at", since30d).not("user_id", "is", null),
    getLifetimeSpendByUser(admin),
    getMonthToDateSpendByUser(admin),
    getMonthToDateGrantsByUser(admin),
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
        monthToDateSpendUsd: monthToDateByUser.get(userId) ?? 0,
        monthToDateGrantsUsd: monthToDateGrantsByUser.get(userId) ?? 0,
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
// Spend tab: AI budget deep-dive (2026-09-02, oryn-a7's dispatch) — job burn-down and the
// per-student degrade distribution, the two views nothing above answered yet. Both read-only
// (D8): neither gates a call or changes a budget, they render the same decision
// checkJobBudget/selectModelForUser already make on the enforcement side.
// ---------------------------------------------------------------------------------------------

function currentUtcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** YYYY-MM-DD in UTC — the bucket key for a daily cumulative series. */
function utcDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * One point per UTC calendar day from `sinceIso` through today (inclusive), running total —
 * the shape components/oryn/charts/burn-chart.tsx's `actual` prop wants directly. Forward-
 * filled on purpose, not gap-honest the way that chart kit's own `y: null` convention
 * usually requires (types.ts: "a missing AI spend day and a zero-spend day are different
 * facts"): a day with zero *new* rows still has a fully known cumulative total, because
 * `ai_usage` coverage for that day is complete, not absent — it's a real reading of "no
 * change," not a missing one. `null` would be the right call if the underlying monthly read
 * itself failed; that case is surfaced separately via JobBudgetStatus.reason
 * ("usage_unavailable"/"unknown_cost_this_month"), not encoded per-day here, since
 * checkJobBudget's month-level signal doesn't resolve to a single day regardless.
 */
// Exported for the same reason categorizeAiFeature is — see that export's own comment.
export function cumulativeByUtcDay(rows: { estimated_cost: number | null; created_at: string }[], sinceIso: string): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (row.estimated_cost === null) continue; // excluded, not treated as $0 -- see this function's own doc comment
    const day = utcDateKey(row.created_at);
    byDay.set(day, (byDay.get(day) ?? 0) + row.estimated_cost);
  }

  const start = new Date(sinceIso);
  const startOfDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const today = new Date();
  const days: string[] = [];
  for (const d = new Date(startOfDay); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  let running = 0;
  return days.map((day) => {
    running += byDay.get(day) ?? 0;
    return { x: day, y: running };
  });
}

export interface JobBudgetStatus {
  feature: JobBudgetFeature;
  budgetUsd: number;
  /** True when budgetUsd comes from a live job_budget_overrides row (migration 0099) rather
   *  than JOB_BUDGET_USD's own env/hardcoded default — lets the admin control show whether
   *  there's an active override to clear, and pre-fill the edit form with today's real
   *  effective value either way. A second, separate read from checkJobBudget's own internal
   *  resolution (small, deliberate duplication — see this function's own comment): keeping
   *  JobBudgetCheck itself free of an admin-display-only field. */
  isOverridden: boolean;
  /** Null only when usage_unavailable — mirrors JobBudgetCheck's own "absent is not zero"
   *  rule (lib/ai/limits/job-budget.ts). */
  monthToDateSpendUsd: number | null;
  /** The real, live decision checkJobBudget would make right now, not a separately-computed
   *  approximation — if this ever disagrees with whether the job actually ran tonight, that
   *  is itself the bug to chase, which is only possible because this reads the same function
   *  the job calls instead of a second, independently-reasoned copy of its logic. */
  allowed: boolean;
  reason: JobBudgetReason;
  /** This calendar month only — the window checkJobBudget itself checks. Empty when the job
   *  has never run (true for both features today — ORYN has never been deployed, see
   *  docs/ai-cost-at-scale-2026-09-02.md) — an honest empty series, not a synthesized flat
   *  line at zero. */
  dailyCumulativeUsd: SeriesPoint[];
}

/**
 * Per job-budgeted feature: this month's real cumulative spend against JOB_BUDGET_USD, plus
 * the live allowed/reason decision — "the chart that tells you a job is about to stop"
 * (oryn-a7, 2026-09-02). Both features read zero real usage as of this write: ORYN has never
 * been deployed, so neither job has ever run (lib/ai/limits/job-budget.ts's own header
 * comment) — this must render as a real, honest zero/empty rather than being omitted, same
 * D5 discipline as SpendSummary.unattributedCalls above.
 */
export async function getJobBudgetStatus(admin: SupabaseClient<Database>): Promise<JobBudgetStatus[]> {
  const features = Object.keys(JOB_BUDGET_USD) as JobBudgetFeature[];
  const sinceIso = currentUtcMonthStartIso();

  return Promise.all(
    features.map(async (feature) => {
      const [check, { data }, { data: overrideRow }] = await Promise.all([
        checkJobBudget(feature),
        admin.from("ai_usage").select("estimated_cost, created_at").eq("feature", feature).gte("created_at", sinceIso).order("created_at", { ascending: true }),
        admin.from("job_budget_overrides").select("budget_usd").eq("feature", feature).maybeSingle(),
      ]);
      return {
        feature,
        budgetUsd: check.budgetUsd,
        isOverridden: overrideRow !== null,
        monthToDateSpendUsd: check.monthToDateSpendUsd,
        allowed: check.allowed,
        reason: check.reason,
        dailyCumulativeUsd: cumulativeByUtcDay(data ?? [], sinceIso),
      };
    }),
  );
}

export interface DegradeStandingRow {
  userId: string;
  displayName: string | null;
  /** Calendar month to date — the same window selectModelForUser itself checks, deliberately
   *  NOT the 30-day rolling window getPerUserSpend/BudgetWarningsSection use elsewhere on
   *  this page. Worth stating plainly rather than silently reconciling: the two can disagree
   *  (spend concentrated at the end of last month vs. the start of this one) because they
   *  answer different questions — this field answers "would selectModelForUser degrade this
   *  student right now," the 30-day figure answers "is this student's recent spend trending
   *  high." Changing BudgetWarningsSection's own window is a separate, deliberate call, not
   *  a side effect of this addition. */
  monthToDateSpendUsd: number;
  /** Restricted to PER_STUDENT_AI_FEATURES — job/admin features never pass through
   *  selectModelForUser (its own "no_user" branch bypasses the check entirely), so a call
   *  against one of those was never eligible to degrade in the first place, and counting it
   *  here would understate fractionDegraded for reasons unrelated to budget. */
  totalCallsThisMonth: number;
  degradedCallsThisMonth: number;
  /** degradedCallsThisMonth / totalCallsThisMonth. Never render this alone — always beside
   *  totalCallsThisMonth, so a 0% rate at n=1 and a 0% rate at n=40 don't read identically. */
  fractionDegraded: number;
  firstDegradedAt: string | null;
  /** 1-31, UTC. Null when never degraded this month. */
  dayOfMonthFirstDegraded: number | null;
}

export interface DegradeStanding {
  /** Distinct students with at least one PER_STUDENT_AI_FEATURES call this month — the
   *  denominator studentsEverDegraded is a fraction of, and the honesty check oryn-a7's
   *  dispatch asked for: if this is a small number, "0 degraded" means "not enough traffic
   *  to tell," not "healthy." Never render studentsEverDegraded without it alongside. */
  totalStudentsWithUsage: number;
  studentsEverDegraded: number;
  byUser: DegradeStandingRow[];
}

/**
 * Who has actually been degraded this month, and how much of their usage ran that way —
 * "nobody has ever seen that as a distribution" (oryn-a7, 2026-09-02). Also the first real
 * read of the degraded/degrade_reason columns lib/ai/usage.ts fixed writing correctly
 * tonight (migration 0076 is live; the write-side bug that defaulted every row to `false`
 * regardless of the real decision was separate and is now fixed — see that file's own
 * comment). If every row below reads degradedCallsThisMonth: 0, that is either genuinely
 * true (no student has reached the $0.50 target yet this month) or simply that too little
 * traffic has landed since the write fix to say — totalStudentsWithUsage is what
 * distinguishes the two, returned alongside rather than left for the caller to compute.
 */
export async function getDegradeStanding(admin: SupabaseClient<Database>): Promise<DegradeStanding> {
  const sinceIso = currentUtcMonthStartIso();
  const { data } = await admin
    .from("ai_usage")
    .select("user_id, degraded, estimated_cost, created_at")
    .in("feature", PER_STUDENT_AI_FEATURES)
    .not("user_id", "is", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  interface Accum {
    spendUsd: number;
    total: number;
    degradedCount: number;
    firstDegradedAt: string | null;
  }
  const byUser = new Map<string, Accum>();

  for (const row of rows) {
    if (!row.user_id) continue; // narrows past .not() the same way getLifetimeSpendByUser does above
    const entry = byUser.get(row.user_id) ?? { spendUsd: 0, total: 0, degradedCount: 0, firstDegradedAt: null };
    entry.spendUsd += row.estimated_cost ?? 0;
    entry.total += 1;
    if (row.degraded) {
      entry.degradedCount += 1;
      if (!entry.firstDegradedAt) entry.firstDegradedAt = row.created_at; // rows are ascending, so the first hit is the earliest
    }
    byUser.set(row.user_id, entry);
  }

  const userIds = [...byUser.keys()];
  const { data: profiles } = userIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", userIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const byUserRows: DegradeStandingRow[] = userIds.map((userId) => {
    const entry = byUser.get(userId)!;
    return {
      userId,
      displayName: nameById.get(userId) ?? null,
      monthToDateSpendUsd: entry.spendUsd,
      totalCallsThisMonth: entry.total,
      degradedCallsThisMonth: entry.degradedCount,
      fractionDegraded: entry.total > 0 ? entry.degradedCount / entry.total : 0,
      firstDegradedAt: entry.firstDegradedAt,
      dayOfMonthFirstDegraded: entry.firstDegradedAt ? new Date(entry.firstDegradedAt).getUTCDate() : null,
    };
  });

  return {
    totalStudentsWithUsage: byUserRows.length,
    studentsEverDegraded: byUserRows.filter((u) => u.degradedCallsThisMonth > 0).length,
    byUser: byUserRows.sort((a, b) => b.fractionDegraded - a.fractionDegraded),
  };
}

// ---------------------------------------------------------------------------------------------
// Finance tab: exchange rate config, cost trend
// Finance tab: exchange rate + price config, cost trend
// ---------------------------------------------------------------------------------------------

/** Fixed, known id for the one row `admin_finance_settings` (migration 0094) ever holds —
 *  see that migration's own header comment for why a singleton table over a generic
 *  key-value store, and why a fixed id over a Postgres CHECK-constraint trick. Every read
 *  and write in this file targets exactly this id; no code path anywhere inserts a second
 *  row. */
export const ADMIN_FINANCE_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export interface ExchangeRate {
  /** TL per 1 USD — a rate of 40 means $1 costs 40 TL, matching
   *  docs/maliyet-ve-fiyatlandirma-2026-09-02.md's own "KUR = ___ TL/USD" framing. */
  rateTryPerUsd: number;
  enteredAt: string;
}

export interface FinanceSettings {
  /**
   * The USD/TRY rate is unknown and this codebase will not guess it — CEO's own words,
   * relaying the founder's refusal to invent one in the cost doc: "bilgi kesme tarihim bu
   * hesabın yapıldığı günden önce, ve yanlış bir kur bütün tabloyu sessizce bozar" (my
   * knowledge cutoff predates this calculation, and a wrong rate silently corrupts the
   * whole table). `null` when unconfigured — every caller in `lib/admin/finance.ts` that
   * needs this threads the `null` through as `RateDependent`'s `available: false` rather
   * than falling back to a guessed number.
   */
  usdTryRate: ExchangeRate | null;
  /** Always has a value, unlike the rate above — 399.99 is a known-real fact (the founder's
   *  own already-set price), not a guess, so a missing settings row (migration unapplied)
   *  falls back to `ULTRA_PRICE_TRY` rather than to "unconfigured". */
  ultraPriceTry: number;
  ultraPriceTryUpdatedAt: string;
}

const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  usdTryRate: null,
  ultraPriceTry: ULTRA_PRICE_TRY,
  ultraPriceTryUpdatedAt: new Date(0).toISOString(), // epoch — "never actually set", not a real edit date
};

/**
 * Replaces the earlier env-var design (`ADMIN_USD_TRY_RATE`/`_ENTERED_AT`) now that CEO's
 * course correction asked for these to be editable from the panel itself, not just visible
 * — an env var needs a redeploy to change, which isn't "the founder can set it here." See
 * migration 0094 and `updateFinanceSettings` below for the write side.
 *
 * A missing row reads identically to how the env-var version read when unset — `null` rate,
 * default price — whether that's because the migration hasn't been applied yet or because
 * nobody has opened the settings panel to set a rate yet; both are the same honest
 * "unconfigured" state to a caller. `isUndefinedTableError` distinguishes the *expected*
 * unapplied-migration case (silent) from a genuinely unexpected read failure (logged, but
 * still degraded rather than thrown — D8/this file's own header: an admin section's read
 * failing must not crash the panel, matching every other function here's fail-open shape).
 */
export async function getFinanceSettings(admin: SupabaseClient<Database>): Promise<FinanceSettings> {
  const { data, error } = await admin.from("admin_finance_settings").select("*").eq("id", ADMIN_FINANCE_SETTINGS_ID).maybeSingle();

  if (error) {
    if (!isUndefinedTableError(error, "admin_finance_settings")) {
      console.error("[admin/finance] failed to read admin_finance_settings", error);
    }
    return DEFAULT_FINANCE_SETTINGS;
  }
  if (!data) return DEFAULT_FINANCE_SETTINGS;

  return {
    usdTryRate: data.usd_try_rate !== null && data.usd_try_rate_updated_at !== null ? { rateTryPerUsd: data.usd_try_rate, enteredAt: data.usd_try_rate_updated_at } : null,
    ultraPriceTry: data.ultra_price_try,
    ultraPriceTryUpdatedAt: data.ultra_price_try_updated_at,
  };
}

export interface WeeklyPlanBudgetStatus {
  monthToDateSpendUsd: number | null;
  ceilingUsd: number;
  /** Whether the aggregate check is *currently* degrading every weekly_plan call this
   *  month — the live state lib/ai/limits/weekly-plan-budget.ts's own check would return
   *  right now, not a static config value. */
  currentlyDegrading: boolean;
}

/**
 * Admin-panel read for the aggregate weekly_plan spend ceiling (migration 0102) —
 * "surfaced to the admin panel alongside the existing spend cards, not silently" was the
 * proposal's own explicit requirement (docs/weekly-plan-aggregate-budget-2026-09-02.md §4).
 * Delegates entirely to `checkWeeklyPlanAggregateBudget` rather than re-querying —
 * lib/ai/limits/weekly-plan-budget.ts is the one place this specific question is answered,
 * the same reasoning `getJobControls`'s own re-export above follows for job_controls.
 */
export async function getWeeklyPlanBudgetStatus(): Promise<WeeklyPlanBudgetStatus> {
  const check = await checkWeeklyPlanAggregateBudget();
  return { monthToDateSpendUsd: check.monthToDateSpendUsd, ceilingUsd: check.ceilingUsd, currentlyDegrading: check.shouldDegrade };
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

// Catalog tab (queries only — see docs/catalog-health-queries-2026-09-02.md for the full shape
// report; the section component waits on 4e's chart kit, per CEO's own instruction). The
// standing version of four one-off audits from tonight — this is instrumentation, not a new
// investigation, so every predicate below is the exact one those audits already verified live:
// docs/opportunity-verification-gate-tightening-impact-2026-09-02.md,
// docs/migration-audit-applied-vs-written-2026-09-02.md,
// docs/unwritten-columns-sweep-2026-09-02.md, docs/opportunity-catalog-student-risk-2026-09-02.md.
//
// Deliberately not a single "data quality score" (CEO's own instruction): every function below
// returns a structured breakdown, never a collapsed number, because the distinctions those four
// audits exist to draw — unverified is not closed, a lineage timestamp is not a confirmation, an
// unreadable source is an absence of evidence rather than evidence of absence — are exactly what
// a single score would hide. Where something can't be known, a field says so explicitly rather
// than a confident zero standing in for it.
// ---------------------------------------------------------------------------------------------

const ACTIVE_OPPORTUNITY_FACTS_SELECT =
  "category, cycle_status, deadline, last_verified_at, verified_at, source_verified_at, eligible_countries, citizenship_restrictions, status";

type ActiveOpportunityFacts = Pick<
  Opportunity,
  "category" | "cycle_status" | "deadline" | "last_verified_at" | "verified_at" | "source_verified_at" | "eligible_countries" | "citizenship_restrictions" | "status"
>;

/**
 * "Passes the gate" means both of the live product's own checks, matching
 * docs/opportunity-verification-gate-tightening-impact-2026-09-02.md's own definition exactly
 * ("`isOpportunityActionable` and `isOpportunitySufficientlyVerified` both true") — caught live
 * while verifying this file against real data: `isOpportunitySufficientlyVerified` alone passed
 * all 283 active rows, because it says nothing about a closed cycle or a passed deadline, which
 * `isOpportunityActionable` is the one that excludes. Naming this as its own function rather than
 * inlining `a && b` at every call site is what made that gap visible in the first place, and what
 * stops the two-checks-required rule from silently narrowing to one at some future call site. */
function passesLiveVerificationGate(opportunity: ActiveOpportunityFacts): boolean {
  return isOpportunityActionable(opportunity) && isOpportunitySufficientlyVerified(opportunity);
}

/**
 * One shared fetch behind three of the functions below (verification reality, gate-tightening
 * impact, deadline/eligibility coverage) rather than three separate round trips to the same
 * table — `opportunities` is a bounded, low-hundreds-row table (283 active as of tonight's own
 * measurement), not the unbounded-log shape D2/D3 of docs/admin-panel-architecture-2026-09-02.md
 * reacted to (the "last 500 calls" `ai_usage` anti-pattern). The reason this stays a JS-side
 * fetch rather than a SQL aggregate, deliberately, not an oversight: every number below depends
 * on `isOpportunitySufficientlyVerified`/`hasDeadlineCommitment`/`hasAnyVerificationRecord`
 * (lib/opportunities/lifecycle.ts) — the actual live gating rule. Re-deriving that logic a
 * second time in raw SQL would create exactly the two-places-one-rule risk D8 warns against for
 * enforcement; reusing the real function against real rows is the only way this panel's numbers
 * can never silently drift from what the gate itself actually does. `getProductActivity` above
 * already establishes this same bounded-fetch-then-aggregate shape in this file for the same
 * reason (event names aren't a SQL-expressible aggregate either).
 */
async function getActiveOpportunityFacts(admin: SupabaseClient<Database>): Promise<ActiveOpportunityFacts[]> {
  const { data } = await admin.from("opportunities").select(ACTIVE_OPPORTUNITY_FACTS_SELECT).eq("status", "active");
  return data ?? [];
}

export interface VerificationReality {
  activeTotal: number;
  /** Both halves of the live gate — `isOpportunityActionable` AND `isOpportunitySufficientlyVerified`
   *  — matching docs/opportunity-verification-gate-tightening-impact-2026-09-02.md's own
   *  definition exactly. Caught live while verifying this file against real data, worth naming
   *  precisely rather than quietly fixing: an earlier draft checked verification alone on the
   *  (wrong) assumption that `status='active'` already implied actionability, and reported 283
   *  of 283 passing — `isOpportunityActionable` is the check that actually excludes a closed
   *  cycle or a passed deadline, and status alone says nothing about either. */
  passingGateToday: number;
  unverifiedCycleTotal: number;
  /** Independent existence counts, NOT mutually exclusive — a row can carry both, and most of
   *  the 75 measured 2026-09-02 did. Reported separately rather than partitioned because
   *  collapsing them would hide exactly the "which pipeline generation" distinction the source
   *  audit exists to surface — see this file's own section header. */
  unverifiedCycleWithVerifiedAt: number;
  unverifiedCycleWithLastVerifiedAt: number;
  /** The verification half of the gate specifically, not the whole thing — deliberately narrower
   *  than `passingGateToday` above. Answers "of the unverified-cycle rows, how many does
   *  verification-sufficiency alone reject," which is the exact question
   *  docs/opportunity-verification-gate-tightening-impact-2026-09-02.md's "0 of them are
   *  correctly excluded" measured. A row here could still separately fail actionability (a
   *  passed deadline) without this field moving — that is a real, different fact, not a bug in
   *  this one, and is why passingGateToday exists as its own, whole-gate number above rather
   *  than being inferred from this field. */
  unverifiedCycleVerificationInsufficient: number;
}

export async function getVerificationReality(admin: SupabaseClient<Database>): Promise<VerificationReality> {
  const rows = await getActiveOpportunityFacts(admin);
  const unverified = rows.filter((r) => r.cycle_status === "unverified");

  return {
    activeTotal: rows.length,
    passingGateToday: rows.filter((r) => passesLiveVerificationGate(r)).length,
    unverifiedCycleTotal: unverified.length,
    unverifiedCycleWithVerifiedAt: unverified.filter((r) => Boolean(r.verified_at)).length,
    unverifiedCycleWithLastVerifiedAt: unverified.filter((r) => Boolean(r.last_verified_at)).length,
    unverifiedCycleVerificationInsufficient: unverified.filter((r) => !isOpportunitySufficientlyVerified(r)).length,
  };
}

/**
 * MEASUREMENT ONLY. Never wired into real gating — lib/opportunities/lifecycle.ts's
 * `isOpportunitySufficientlyVerified` remains the single live rule, per D8
 * (docs/admin-panel-architecture-2026-09-02.md: "the panel reads and renders... the rule that
 * stops a call is never split between a screen and a library"). Kept local to this file rather
 * than exported from lifecycle.ts specifically so nothing outside this reporting path can ever
 * import and accidentally apply it to a real recommendation.
 *
 * Encodes exactly the tightened rule docs/opportunity-verification-gate-tightening-impact-
 * 2026-09-02.md measured and CEO decided against shipping: a bare pipeline-lineage timestamp no
 * longer counts as sufficient on its own for cycle_status='unverified' specifically. A deadline
 * commitment still passes regardless of cycle_status; a verification timestamp still passes for
 * any OTHER cycle_status. Both the "narrow" and "broad" readings of that document converged on
 * this same predicate (131 recommendable either way) — there was no third reading to encode.
 */
function wouldPassTightenedVerificationGate(opportunity: Pick<Opportunity, "cycle_status" | "deadline" | "last_verified_at" | "verified_at" | "source_verified_at">): boolean {
  if (hasDeadlineCommitment(opportunity)) return true;
  if (opportunity.cycle_status === "unverified") return false;
  return hasAnyVerificationRecord(opportunity);
}

export interface CategoryGateImpact {
  category: OpportunityCategory;
  totalActive: number;
  recommendableToday: number;
  ofWhichUnverifiedCycle: number;
  /** Hypothetical, per wouldPassTightenedVerificationGate's own comment — not a preview of a
   *  planned change. This is the exact number that stopped a change CEO had already
   *  half-committed to (summer_program: 90 → 31) — the reason this whole category breakdown
   *  exists as a standing figure rather than a one-off measurement. */
  recommendableIfTightened: number;
}

/** Sorted by totalActive descending — the category that dominates the catalog (summer_program,
 *  49% of everything active on 2026-09-02) belongs at the top of this list on its own, not
 *  because of a separate ranking decision a caller has to make. */
export async function getGateTighteningImpactByCategory(admin: SupabaseClient<Database>): Promise<CategoryGateImpact[]> {
  const rows = await getActiveOpportunityFacts(admin);

  const byCategory = new Map<OpportunityCategory, ActiveOpportunityFacts[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  return [...byCategory.entries()]
    .map(([category, categoryRows]) => ({
      category,
      totalActive: categoryRows.length,
      recommendableToday: categoryRows.filter((r) => passesLiveVerificationGate(r)).length,
      ofWhichUnverifiedCycle: categoryRows.filter((r) => r.cycle_status === "unverified" && passesLiveVerificationGate(r)).length,
      // Tightening can only ever remove rows from today's recommendable set, never add one back
      // — a row actionability already excludes stays excluded regardless of which verification
      // rule is applied, so this still requires isOpportunityActionable, just with the tightened
      // verification half swapped in for the live one.
      recommendableIfTightened: categoryRows.filter((r) => isOpportunityActionable(r) && wouldPassTightenedVerificationGate(r)).length,
    }))
    .sort((a, b) => b.totalActive - a.totalActive);
}

/** Both country spellings the corpus actually uses were checked live before writing this —
 *  "Türkiye" is the only one present (5 active rows), "Turkey" appears in zero rows. A future
 *  research batch introducing the English spelling would silently split this predicate; this
 *  checks both so that can't happen unnoticed. */
const TURKEY_SPELLINGS = ["Türkiye", "Turkey"] as const;

export interface DeadlineEligibilityCoverage {
  /** cycle_status='open' (reads as actionable right now) with no deadline on file — not wrong,
   *  but nothing for a student to plan around, and indistinguishable in the UI from a genuinely
   *  dateless rolling admission. docs/opportunity-catalog-student-risk-2026-09-02.md's finding
   *  #2, unchanged predicate. */
  openWithNoDeadline: number;
  /** A non-empty eligible_countries list that excludes Turkey (either spelling) with no
   *  citizenship_restrictions text explaining why. Explicitly NOT a confirmed-defect count —
   *  docs/opportunity-catalog-student-risk-2026-09-02.md's finding #3 flagged this as
   *  "plausibly all legitimate... not claiming this is wrong, only that it's unverified," and
   *  this function inherits that same honesty: it is a worth-a-spot-check count, not a defect
   *  count, and a UI built on it must say so rather than rendering it as N confirmed problems. */
  turkeyExcludedWithNoRestrictionText: number;
}

export async function getDeadlineEligibilityCoverage(admin: SupabaseClient<Database>): Promise<DeadlineEligibilityCoverage> {
  const rows = await getActiveOpportunityFacts(admin);

  return {
    openWithNoDeadline: rows.filter((r) => r.cycle_status === "open" && !r.deadline).length,
    turkeyExcludedWithNoRestrictionText: rows.filter(
      (r) =>
        r.eligible_countries.length > 0 &&
        !TURKEY_SPELLINGS.some((spelling) => r.eligible_countries.includes(spelling)) &&
        !r.citizenship_restrictions
    ).length,
  };
}

const DATA_STATUS_TABLES = ["universities", "university_requirements", "university_deadlines"] as const;
const DATA_STATUSES: readonly DataStatus[] = ["fresh", "stale", "needs_review", "unavailable"];

export interface DataStatusDistribution {
  table: (typeof DATA_STATUS_TABLES)[number];
  total: number;
  byStatus: Record<DataStatus, number>;
}

/**
 * `opportunities` has no `data_status`/`last_checked_at` columns — checked directly against
 * types/database.ts before writing this, not assumed from the other three tables having them.
 * Its own freshness signal is the verification timestamps `getVerificationReality` above already
 * covers; this function is deliberately scoped to the three tables that actually carry Phase 29's
 * `data_status` enum, not stretched to cover a fourth table that doesn't have the concept.
 *
 * Genuine SQL-side counts (D3) — one exact-count query per status per table (12 total), never a
 * row fetch. Unlike the opportunity functions above, there's no shared business-rule predicate
 * here to keep in one place; a plain GROUP BY-equivalent count is the correct shape, not a
 * bounded-fetch exception.
 */
export async function getDataStatusDistribution(admin: SupabaseClient<Database>): Promise<DataStatusDistribution[]> {
  return Promise.all(
    DATA_STATUS_TABLES.map(async (table) => {
      const counts = await Promise.all(
        DATA_STATUSES.map((status) => admin.from(table).select("*", { count: "exact", head: true }).eq("data_status", status))
      );
      const byStatus = Object.fromEntries(DATA_STATUSES.map((status, i) => [status, counts[i].count ?? 0])) as Record<DataStatus, number>;
      return { table, total: Object.values(byStatus).reduce((sum, n) => sum + n, 0), byStatus };
    })
  );
}

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
/** Matches an `alter table [public.]<name>` statement opening a (possibly multi-line, comma-
 *  separated) block of `add column` clauses. */
const ALTER_TABLE_RE = /alter table(?:\s+if exists)?\s+(?:public\.)?(\w+)/gi;
const ADD_COLUMN_RE = /add column(?:\s+if not exists)?\s+(\w+)/gi;

interface MigrationColumnArtifact {
  table: string;
  column: string;
}

/**
 * A light regex scan, explicitly not a SQL parser — extracts only `alter table ... add column`
 * occurrences. **Deliberately does not attempt `create table` at all**, not just the harder
 * shapes (indexes, constraints, triggers, functions, views, enums, policies, grants) — see this
 * function's live-check counterpart below for why table-level existence isn't checkable through
 * this app's actual database access path the way column existence is. A migration whose only
 * statements are `create table` or one of the uncovered kinds — 0058's three tables, 0082's
 * three indexes, most of the 0061-0067 RLS set — yields zero artifacts here and must be
 * reported as "unchecked", never silently folded into "applied" or "unapplied". Column-adding
 * migrations are most of what docs/migration-audit-applied-vs-written-2026-09-02.md actually
 * found unapplied (0089-0092 among them), so this still covers the highest-value case.
 *
 * `alter table` block scope is tracked per statement, not per file — a migration doing `alter
 * table profiles add column ...; alter table opportunities add column ...;` (0059's shape)
 * attributes each `add column` to the nearest preceding `alter table`, re-scanned per statement
 * boundary (`;`) rather than assuming one table per file.
 */
function extractMigrationColumnArtifacts(sql: string): MigrationColumnArtifact[] {
  const artifacts: MigrationColumnArtifact[] = [];
  for (const statement of sql.split(";")) {
    const alterMatch = ALTER_TABLE_RE.exec(statement);
    ALTER_TABLE_RE.lastIndex = 0;
    if (!alterMatch) continue;
    const table = alterMatch[1]!;
    for (const m of statement.matchAll(ADD_COLUMN_RE)) artifacts.push({ table, column: m[1]! });
  }
  return artifacts;
}

/**
 * Column existence, checked the same way every write-path degrade guard in this codebase
 * already does — reusing `isUndefinedColumnError`, not inventing a second mechanism. This
 * app's `admin` client talks to Postgres through PostgREST, which does not expose
 * `information_schema`/`pg_catalog` for arbitrary introspection the way a direct Postgres
 * connection (e.g. this session's own Supabase-MCP `execute_sql`, used to verify every number
 * in docs/catalog-health-queries-2026-09-02.md) does — an earlier draft of this function tried
 * exactly that and would have failed outright in the deployed app. A NAMED select of the column
 * itself, head-only (no row data fetched), goes through PostgREST's own schema-cache validation
 * before any SQL runs — the identical check `categoryIsEnabled()` (lib/notifications/create.ts)
 * already relies on for a read. No error means the column is live; `isUndefinedColumnError`
 * matching means it genuinely isn't; anything else (RLS, a transient failure, the table itself
 * missing) is surfaced as `null` — "couldn't determine," never guessed at as either answer. This
 * is also why `create table` artifacts aren't extracted above: there is no equivalent
 * PostgREST-native "does this table exist" signal this function can rely on without guessing at
 * an error shape that hasn't been observed against this project (the same discipline
 * `isUndefinedColumnError`'s own comment applies to `PGRST204`'s spelling).
 */
async function columnExistsLive(admin: SupabaseClient<Database>, table: string, column: string): Promise<boolean | null> {
  const { error } = await admin.from(table as never).select(column, { head: true });
  if (!error) return true;
  if (isUndefinedColumnError(error, column)) return false;
  return null;
}

export type MigrationRealityStatus = "confirmed_live" | "confirmed_partially_live" | "confirmed_missing" | "unchecked" | "indeterminate";

export interface MigrationRealityRow {
  file: string;
  columnArtifactsFound: number;
  columnArtifactsConfirmedLive: number;
  /** Artifacts `columnExistsLive` couldn't resolve either way — kept separate from "confirmed
   *  live"/"confirmed missing" rather than silently defaulting into one of them. */
  columnArtifactsIndeterminate: number;
  status: MigrationRealityStatus;
}

/**
 * The live, standing replacement for docs/migration-audit-applied-vs-written-2026-09-02.md's
 * one-off sweep — narrower in scope than that audit (columns only, see the extractor's own
 * comment), broader in the sense that it never goes stale the way a doc does. Reads
 * `supabase/migrations/*.sql` from disk — a NEW pattern for `lib/` in this codebase (previously
 * only test files did this, e.g. `__tests__/social/posts-schema.test.ts`); flagged explicitly
 * rather than assumed safe, because a Next.js production deployment's file tracing does not
 * automatically include files a route only reaches via a raw `fs` call outside static imports.
 * Whoever wires this into the real admin route should confirm the migrations directory actually
 * ships in the deployed function (Vercel's `outputFileTracingIncludes` in `next.config.ts` is
 * the standard fix if it doesn't) before trusting this in production — noted here rather than
 * discovered after a deploy shows every migration as "unchecked" for the wrong reason.
 *
 * Never reads `supabase_migrations.schema_migrations` — reference_list_migrations_unreliable_
 * use_direct_probe's own finding (confirmed twice this session already, independently) is that
 * the ledger undercounts what's actually live. Every answer here comes from asking the live
 * schema directly, the same discipline that finding established.
 */
export async function getMigrationReality(admin: SupabaseClient<Database>): Promise<MigrationRealityRow[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const rows: MigrationRealityRow[] = [];
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const artifacts = extractMigrationColumnArtifacts(sql);

    if (artifacts.length === 0) {
      rows.push({ file, columnArtifactsFound: 0, columnArtifactsConfirmedLive: 0, columnArtifactsIndeterminate: 0, status: "unchecked" });
      continue;
    }

    let confirmedLive = 0;
    let indeterminate = 0;
    for (const artifact of artifacts) {
      const exists = await columnExistsLive(admin, artifact.table, artifact.column);
      if (exists === true) confirmedLive++;
      else if (exists === null) indeterminate++;
    }

    const status: MigrationRealityStatus =
      indeterminate === artifacts.length
        ? "indeterminate"
        : confirmedLive === artifacts.length
          ? "confirmed_live"
          : confirmedLive === 0 && indeterminate === 0
            ? "confirmed_missing"
            : "confirmed_partially_live";

    rows.push({ file, columnArtifactsFound: artifacts.length, columnArtifactsConfirmedLive: confirmedLive, columnArtifactsIndeterminate: indeterminate, status });
  }
  return rows;
}

/**
 * The generalised version of tonight's two hand-found instances (ai_usage.degraded,
 * university_requirements.is_exclusion) — a standing, extensible watchlist rather than a
 * one-off grep. Deliberately NOT a scan of all ~180 defaulted columns
 * docs/unwritten-columns-sweep-2026-09-02.md catalogued; that sweep's own §Method drew the line
 * at columns whose default is a specific factual claim (a boolean/enum flag asserting something
 * happened) versus an ordinary settings default, and chasing all 180 live on every admin-panel
 * load is neither necessary nor cheap. This list is the mechanism that sweep's own conclusion
 * asked for — add an entry here, and it becomes a permanent, live check instead of a claim that
 * ages the moment the audit doc is written. Seeded with the two already-known instances (kept
 * for standing regression coverage — is_exclusion should show a real non-100% figure now that
 * lib/requirements/ingest.ts sets it) plus one already-confirmed-safe column, so the panel proves
 * it can tell "still broken," "fixed," and "never broken" apart, not just find one shape.
 */
const NEVER_WRITTEN_COLUMN_WATCHLIST: { table: string; column: string; defaultDescription: string; defaultValue: unknown }[] = [
  { table: "ai_usage", column: "degraded", defaultDescription: "false", defaultValue: false },
  { table: "university_requirements", column: "is_exclusion", defaultDescription: "false", defaultValue: false },
  { table: "opportunity_matches", column: "eligible", defaultDescription: "true", defaultValue: true },
];

export interface NeverWrittenColumnCheck {
  table: string;
  column: string;
  defaultDescription: string;
  totalRows: number;
  rowsAtDefault: number;
  /** null when totalRows is 0 — "100% at default" and "no data to judge" must never render the
   *  same way; a table with zero rows says so rather than showing a hollow 0%. */
  percentAtDefault: number | null;
}

export async function getNeverWrittenColumnChecks(admin: SupabaseClient<Database>): Promise<NeverWrittenColumnCheck[]> {
  return Promise.all(
    NEVER_WRITTEN_COLUMN_WATCHLIST.map(async ({ table, column, defaultDescription, defaultValue }) => {
      const [totalRes, atDefaultRes] = await Promise.all([
        admin.from(table as never).select("*", { count: "exact", head: true }),
        admin.from(table as never).select("*", { count: "exact", head: true }).eq(column, defaultValue as never),
      ]);
      const totalRows = totalRes.count ?? 0;
      const rowsAtDefault = atDefaultRes.count ?? 0;
      return {
        table,
        column,
        defaultDescription,
        totalRows,
        rowsAtDefault,
        percentAtDefault: totalRows === 0 ? null : Math.round((rowsAtDefault / totalRows) * 1000) / 10,
      };
    })
  );
}

// ---------------------------------------------------------------------------------------------
// Growth tab: signups, activation, feature census, loop closing, retention
// (docs/admin-growth-panel-2026-09-02.md). Regenerate-plan and dead-feature-flag WRITES live
// in app/(app)/admin/actions.ts, not here — this file is reads only (D8).
// ---------------------------------------------------------------------------------------------

export interface SignupDay {
  /** UTC calendar day, YYYY-MM-DD — same convention as CostTrendPoint's `date` above. */
  date: string;
  count: number;
}

export interface SignupTimeline {
  byDay: SignupDay[];
  total: number;
  firstSignupAt: string | null;
  lastSignupAt: string | null;
  /** Whole days between `lastSignupAt` and now, or null with zero signups. Computed here,
   *  not in the section component: `Date.now()` inside a .tsx component's render body trips
   *  this codebase's react-hooks/purity lint rule (a real catch, not a false positive — a
   *  Server Component's render can be replayed), and a plain .ts query module isn't subject
   *  to it. The *threshold* for "read this as a seed cohort" is still the section's call,
   *  not baked in here — this is the raw day count, an objective fact, not a judgment. */
  daysSinceLastSignup: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Signups bucketed by UTC calendar day — deliberately a plain count per day, never a
 * cumulative or smoothed line computed here. Real data checked live 2026-09-02: 11 signups,
 * all inside 2026-08-20..08-24, none since — a seed cohort, not a growth curve. That reading
 * is the section's caption to draw (from `daysSinceLastSignup`), not a boolean this function
 * invents and could get wrong; the query stays an honest, un-opinionated count either way.
 */
export async function getSignupTimeline(admin: SupabaseClient<Database>): Promise<SignupTimeline> {
  const { data } = await admin.from("profiles").select("created_at").order("created_at", { ascending: true });
  const rows = data ?? [];

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10); // YYYY-MM-DD, UTC — created_at is already UTC ISO
    byDay.set(date, (byDay.get(date) ?? 0) + 1);
  }

  const lastSignupAt = rows.length > 0 ? rows[rows.length - 1].created_at : null;

  return {
    byDay: [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    total: rows.length,
    firstSignupAt: rows[0]?.created_at ?? null,
    lastSignupAt,
    daysSinceLastSignup: lastSignupAt ? Math.floor((Date.now() - new Date(lastSignupAt).getTime()) / DAY_MS) : null,
  };
}

export interface OnboardingFunnel {
  signedUp: number;
  completedOnboarding: number;
  /** Distinct students with at least one `cv_imported` product_event — reached AI extraction
   *  on the CV-upload path. Deliberately NOT labeled "completed CV import": the event fires
   *  at extraction success, before the review/confirm step
   *  (docs/admin-growth-panel-2026-09-02.md §2) — the actual save happens later, inside
   *  completeOnboarding. The section must carry that caveat in its own copy, not just here. */
  reachedCvExtraction: number;
}

/**
 * The honest 2-stage (+1 sub-signal) onboarding funnel — not the 5-screen funnel a founder
 * might expect. Confirmed by tracing every onboarding logEvent call site directly
 * (2026-09-02): nothing saves to `profiles` incrementally per screen, so a non-completing
 * profile can't be traced to which screen it stopped on. Building a 5-bar chart here would
 * imply data that doesn't exist; this function returns only what's actually knowable.
 */
export async function getOnboardingFunnel(admin: SupabaseClient<Database>): Promise<OnboardingFunnel> {
  const [{ data: profiles }, { data: cvEvents }] = await Promise.all([
    admin.from("profiles").select("id, onboarding_completed"),
    admin.from("product_events").select("user_id").eq("event_name", "cv_imported"),
  ]);
  const rows = profiles ?? [];

  return {
    signedUp: rows.length,
    completedOnboarding: rows.filter((p) => p.onboarding_completed).length,
    reachedCvExtraction: new Set((cvEvents ?? []).map((e) => e.user_id)).size,
  };
}

/**
 * Every event_name a `logEvent(...)` call site in this codebase can actually produce —
 * exhaustively grepped 2026-09-02 (docs/admin-growth-panel-2026-09-02.md), same discipline as
 * BELOW_MINIMUM_AGE_EVENT_NAMES above, not a remembered or substring-guessed list. A feature
 * whose call site logs a name missing from this list would read as "0 events" in the census
 * below rather than "unknown" — keep this current when a new logEvent call site ships, or
 * getFeatureCensus's `unknownEventNames` field (below) is what catches the drift instead of
 * the census silently going stale.
 */
export const KNOWN_PRODUCT_EVENT_NAMES = [
  "advisor_message_sent",
  "application_updated",
  "cv_imported",
  "onboarding_completed",
  "opportunity_applied",
  "opportunity_saved",
  "profile_item_added",
  "research_project_started",
  "target_university_added",
  "ultra_interest_registered",
  "weekly_action_completed",
  ...BELOW_MINIMUM_AGE_EVENT_NAMES,
] as const;

export interface FeatureCensusRow {
  eventName: string;
  count: number;
  /** BELOW_MINIMUM_AGE_EVENT_NAMES exist so a human sees a rare safety event fire — zero is
   *  the correct, good outcome for those two, not evidence of a dead feature. Every other
   *  known name is a real product action, where zero is a genuine dead-feature candidate.
   *  Conflating the two into one flat "unused" list would point someone at deleting a guard
   *  (docs/admin-growth-panel-2026-09-02.md §3). */
  category: "product" | "safety_net";
  deadFlag: { markedBy: string | null; markedAt: string; note: string | null } | null;
}

export interface FeatureCensus {
  rows: FeatureCensusRow[];
  /** Names present in `product_events` this fetch but absent from KNOWN_PRODUCT_EVENT_NAMES
   *  — a real drift signal (a new logEvent call site shipped and this list wasn't updated),
   *  surfaced rather than silently dropped from the count. Expected empty; not an error if
   *  populated, just a prompt to update the list above. */
  unknownEventNames: string[];
}

export async function getFeatureCensus(admin: SupabaseClient<Database>): Promise<FeatureCensus> {
  const [{ data: events }, { data: flags }] = await Promise.all([
    admin.from("product_events").select("event_name"),
    admin.from("admin_dead_feature_flags").select("*"),
  ]);

  const countByName = new Map<string, number>();
  for (const row of events ?? []) countByName.set(row.event_name, (countByName.get(row.event_name) ?? 0) + 1);
  const flagByName = new Map((flags ?? []).map((f) => [f.feature_key, f]));
  const knownNames: readonly string[] = KNOWN_PRODUCT_EVENT_NAMES;
  const safetyNetNames: readonly string[] = BELOW_MINIMUM_AGE_EVENT_NAMES;

  const rows = KNOWN_PRODUCT_EVENT_NAMES.map(
    (eventName): FeatureCensusRow => {
      const flag = flagByName.get(eventName);
      return {
        eventName,
        count: countByName.get(eventName) ?? 0,
        category: safetyNetNames.includes(eventName) ? "safety_net" : "product",
        deadFlag: flag ? { markedBy: flag.marked_by, markedAt: flag.marked_at, note: flag.note } : null,
      };
    }
  ).sort((a, b) => b.count - a.count);

  const unknownEventNames = [...countByName.keys()].filter((name) => !knownNames.includes(name));

  return { rows, unknownEventNames };
}

export interface LoopClosingStats {
  totalActions: number;
  totalPlans: number;
  byStatus: Record<ActionStatus, number>;
}

/**
 * The completion count everything else in this panel is downstream of — see the section's
 * own copy for why this is rendered as a raw fraction ("1 of 25"), never a percentage: at
 * this n a percent sign claims a precision the sample doesn't support, and it invites "why
 * is completion so low" when the honest question is "is there enough history to have an
 * opinion yet."
 */
export async function getLoopClosingStats(admin: SupabaseClient<Database>): Promise<LoopClosingStats> {
  const [{ data: actions }, { count: planCount }] = await Promise.all([
    admin.from("weekly_actions").select("status"),
    admin.from("weekly_plans").select("*", { count: "exact", head: true }),
  ]);
  const rows = actions ?? [];

  const byStatus: Record<ActionStatus, number> = { not_started: 0, in_progress: 0, completed: 0, skipped: 0, expired: 0 };
  for (const row of rows) byStatus[row.status] += 1;

  return { totalActions: rows.length, totalPlans: planCount ?? 0, byStatus };
}

export interface RetentionBuckets {
  activeToday: number;
  activeThisWeek: number;
  stale: number;
  neverSignedIn: number;
  total: number;
}

/**
 * `auth.users.last_sign_in_at` is a single value, overwritten on every sign-in — not a visit
 * log (confirmed live 2026-09-02, docs/admin-growth-panel-2026-09-02.md §5). This can bucket
 * *staleness* (when someone was last seen), never true cohort retention (whether they keep
 * coming back), which would need a visit history this schema doesn't record. Buckets, not a
 * curve, on purpose — building a retention curve here would render confidence the data can't
 * support.
 */
export async function getRetentionBuckets(admin: SupabaseClient<Database>): Promise<RetentionBuckets> {
  const { data } = await admin.auth.admin.listUsers();
  const users = data?.users ?? [];
  const now = Date.now();

  const buckets: RetentionBuckets = { activeToday: 0, activeThisWeek: 0, stale: 0, neverSignedIn: 0, total: users.length };
  for (const user of users) {
    if (!user.last_sign_in_at) {
      buckets.neverSignedIn += 1;
      continue;
    }
    const ageDays = (now - new Date(user.last_sign_in_at).getTime()) / DAY_MS;
    if (ageDays < 1) buckets.activeToday += 1;
    else if (ageDays < 7) buckets.activeThisWeek += 1;
    else buckets.stale += 1;
  }

  return buckets;
}

// ---------------------------------------------------------------------------------------------
// Catalog tab, write-capable actions (course correction, 2026-09-02 — see
// docs/catalog-health-actions-design-2026-09-02.md). Preview only below; the actual mutation
// (applyContaminationCleanup) lives in app/(app)/admin/actions.ts alongside every other
// admin Server Action, per this file's own D1 scope ("every admin-panel READ, one module") —
// queries.ts reads, actions.ts writes, the same split this file already draws for
// removeReportedPost/restoreReportedPost.
// ---------------------------------------------------------------------------------------------

export interface ContaminationCleanupPreviewRow {
  id: string;
  title: string;
  currentDescription: string | null;
  newDescription: string;
  /** Whether `.like(description, guardPrefix + "%")` would currently match this row — computed
   *  the same way the apply action itself checks, so a preview showing "will apply" can never
   *  disagree with what actually happens a moment later on the same data. `null` means the row
   *  itself could not be found (deleted or the id is stale) — a third state, not folded into
   *  `false`, because "guard failed" and "row is gone" call for different messages to an admin
   *  reading this before clicking apply. */
  guardWouldPass: boolean | null;
}

/**
 * Read-only. Fetches the current live description for all 35 rows in
 * CONTAMINATION_CLEANUP_2026_09_02 and checks each guard against it — the exact preview CEO
 * asked for ("old value, new value, per row, before the button that commits anything is even
 * enabled"). Never writes; the apply action re-checks the identical guard at commit time rather
 * than trusting this preview's own read, since the two calls are not atomic with each other and
 * a row could change in between.
 */
export async function getContaminationCleanupPreview(admin: SupabaseClient<Database>): Promise<ContaminationCleanupPreviewRow[]> {
  const ids = CONTAMINATION_CLEANUP_2026_09_02.map((e) => e.id);
  const { data } = await admin.from("opportunities").select("id, description").in("id", ids);
  const currentById = new Map((data ?? []).map((r) => [r.id, r.description]));

  return CONTAMINATION_CLEANUP_2026_09_02.map((entry) => {
    const current = currentById.get(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      currentDescription: current ?? null,
      newDescription: entry.newDescription,
      guardWouldPass: current == null ? null : current.startsWith(entry.guardPrefix),
    };
  });
}

/**
 * Migration 0098 is written, not applied — confirmed directly against live, not assumed.
 * `applyContaminationCleanup` (app/(app)/admin/actions.ts) fails closed when the
 * `admin_actions` audit write fails, deliberately (see that function's own comment) — which
 * means running it before 0098 lands would report all 35 rows as "not applied" with an audit
 * failure reason, even though the description rewrite itself is completely correct. That
 * result is accurate but genuinely confusing to read cold, so the UI checks this upfront and
 * says plainly "not set up yet" instead of a founder discovering it via a 0-of-35 run.
 *
 * Deliberately NOT `{ head: true }`, confirmed live rather than assumed safe: a HEAD request
 * against a genuinely missing table returns `{ error: null, status: 204 }` — PostgREST/
 * Supabase-js masks the PGRST205 "table not found" error specifically on HEAD requests,
 * confirmed by comparing both shapes against this exact table live (`head:true` → false
 * success; a plain `.select().limit(1)` → the real PGRST205 error). This is a genuinely
 * different failure mode from the missing-*column* case `columnExistsLive`
 * (getMigrationReality, above) checks — that one already uses `head:true` and is unaffected,
 * confirmed separately by that function's own live-verified results matching known ground
 * truth exactly. `getFinanceSettings` above never used `head:true` for its own table-missing
 * check either, which is why it was never exposed to this — not by design, but the safer
 * shape happened to be the one already in use there. `.limit(1)` keeps this cheap without
 * reintroducing the trap: real data may come back, but at most one row, and nothing here
 * reads it.
 */
export async function isAdminActionsTableLive(admin: SupabaseClient<Database>): Promise<boolean> {
  const { error } = await admin.from("admin_actions").select("id").limit(1);
  if (!error) return true;
  // Any error — the expected missing-table case or a genuinely unexpected one — means this
  // is not confirmed usable. An apply button about to perform 35 real writes should default
  // to "not ready" on an unknown failure, not "ready" — the one place in this pass where
  // treating an unrecognized error as the safe case would be the wrong direction to fail in.
  if (!isUndefinedTableError(error, "admin_actions")) {
    console.error("[admin] unexpected error checking admin_actions", error);
  }
  return false;
}

export interface AdminActivityEntry {
  id: string;
  createdAt: string;
  adminLabel: string;
  action: string;
  targetLabel: string | null;
  detail: Record<string, unknown>;
  /** Which table this row actually lives in — kept, not hidden, so a reader who needs the
   *  real row (to correct an audit entry, say) knows where to look. The point of merging is
   *  that a founder browsing the timeline never has to think about this; it not existing at
   *  all would be a worse trade, not a better one. */
  source: "admin_actions" | "admin_action_log";
}

const ADMIN_ACTIVITY_FETCH_LIMIT = 50;

/**
 * CEO's ruling, 2026-09-02: two audit tables stay two tables (different schemas for
 * different stakes — see admin_actions'/admin_action_log's own comments) but "what happened
 * recently" reads as one honest chronological list, not two a founder has to know to check
 * separately. The schema split is an implementation detail this function exists specifically
 * to hide.
 *
 * Bounded fetch (D3) from each table, not unbounded — same discipline `getProductActivity`
 * above already established for a single-table version of this exact shape.
 *
 * `admin_actions` has no label snapshot the way `admin_action_log` deliberately does (that
 * table's own migration explains why: survives the admin/target account later being deleted).
 * A real, smaller gap in this pass rather than one worth blocking the UI on: resolves the
 * admin's display name with one batched read-time lookup instead, which is honest today (no
 * account here has been deleted yet) and degrades to the raw id if the profile is ever gone
 * — never throws, never hides the row. `target_id`/`target_table` stand in for a target label
 * (no per-action title lookup here on purpose — that would mean this function knowing about
 * every future action's own data shape, exactly the coupling `admin_actions`' generic columns
 * exist to avoid).
 */
export async function getAdminActivityTimeline(admin: SupabaseClient<Database>): Promise<AdminActivityEntry[]> {
  const [catalogRes, opsRes] = await Promise.all([
    admin.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(ADMIN_ACTIVITY_FETCH_LIMIT),
    admin.from("admin_action_log").select("*").order("created_at", { ascending: false }).limit(ADMIN_ACTIVITY_FETCH_LIMIT),
  ]);
  // Both migrations (0097, 0098) are written but not applied as of this pass — confirmed
  // directly against live, not assumed. `isUndefinedTableError` distinguishes that expected
  // case (silent — an empty timeline is the honest state either way, "not set up" and "set up
  // but nothing happened yet" degrade to the same list) from a genuinely unexpected read
  // failure (logged), matching getFinanceSettings' own established shape in this file rather
  // than inventing a second one.
  if (catalogRes.error && !isUndefinedTableError(catalogRes.error, "admin_actions")) {
    console.error("[admin] failed to read admin_actions", catalogRes.error);
  }
  if (opsRes.error && !isUndefinedTableError(opsRes.error, "admin_action_log")) {
    console.error("[admin] failed to read admin_action_log", opsRes.error);
  }
  const catalogRows = catalogRes.data ?? [];
  const opsRows = opsRes.data ?? [];

  const adminIds = [...new Set(catalogRows.map((r) => r.admin_user_id))];
  const { data: profiles } = adminIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", adminIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const fromCatalog: AdminActivityEntry[] = catalogRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    adminLabel: nameById.get(r.admin_user_id) ?? r.admin_user_id,
    action: r.action,
    targetLabel: `${r.target_table}:${r.target_id}`,
    detail: { reason: r.reason, before: r.before_value, after: r.after_value },
    source: "admin_actions" as const,
  }));
  const fromOps: AdminActivityEntry[] = opsRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    adminLabel: r.admin_label,
    action: r.action,
    targetLabel: r.target_label,
    detail: (r.detail as Record<string, unknown>) ?? {},
    source: "admin_action_log" as const,
  }));

  return [...fromCatalog, ...fromOps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, ADMIN_ACTIVITY_FETCH_LIMIT);
}
