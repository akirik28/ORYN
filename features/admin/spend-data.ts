import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Founder-set budget guardrails (2026-09-02, relayed through oryn-a7): $0.50/student/month is
 * the target, $1.00 is the hard ceiling. The warning threshold is 80% of the CEILING — the
 * harder number, since the target is an aspiration and the ceiling is where real overage risk
 * starts. Kept here, not inline, because these are founder-set business figures that can change
 * independently of the code that reads them.
 */
export const PER_STUDENT_MONTHLY_TARGET_USD = 0.5;
export const PER_STUDENT_MONTHLY_CEILING_USD = 1.0;
export const BUDGET_WARNING_FRACTION = 0.8;
export const BUDGET_WARNING_THRESHOLD_USD = PER_STUDENT_MONTHLY_CEILING_USD * BUDGET_WARNING_FRACTION;

type UsageRow = Pick<Database["public"]["Tables"]["ai_usage"]["Row"], "user_id" | "feature" | "model" | "estimated_cost" | "created_at">;

export interface SpendByKey {
  key: string;
  calls: number;
  costUsd: number;
}

export interface SpendSummary {
  /** Rolling windows (last 24h / 7d / 30d from the moment this is computed), not
   *  calendar-aligned "today"/"this week". A calendar boundary needs a timezone, and there is
   *  no single correct one here — the founder viewing this and the students generating the
   *  spend are not necessarily in the same one. A rolling window is unambiguous and needs no
   *  timezone decision; the UI still labels these "Today" / "This week" / "This month" for
   *  readability, since the difference from a calendar boundary is at most a few hours either
   *  way and never changes which figure is actionable. */
  last24hUsd: number;
  last7dUsd: number;
  last30dUsd: number;
  byFeature: SpendByKey[];
  byModel: SpendByKey[];
  totalCalls: number;
  totalUsd: number;
  /** Calls with no user_id — either a genuinely system-initiated call, or a deleted account
   *  (ai_usage.user_id is ON DELETE SET NULL). Reported as its own line rather than folded into
   *  a total: a per-user budget view built from this table structurally cannot see these calls,
   *  so silently merging them into an aggregate is exactly how that blind spot stays invisible. */
  unattributedCalls: number;
  unattributedUsd: number;
}

export interface UserSpend {
  userId: string;
  displayName: string | null;
  /** This calendar-month-to-date spend — what the budget threshold is actually evaluated
   *  against. Same rolling-30d simplification as SpendSummary above, not a calendar-month
   *  boundary, for the same timezone reason. */
  last30dUsd: number;
  lifetimeUsd: number;
  callCount: number;
  overWarningThreshold: boolean;
  overCeiling: boolean;
}

export interface RemainingCredit {
  startingCreditUsd: number;
  startingCreditEnteredAt: string;
  totalSpendUsd: number;
  remainingUsd: number;
}

export interface AdminUserRow {
  userId: string;
  displayName: string | null;
  /** Tiers don't exist yet (founder's roadmap item, not built) — always null until they do.
   *  Rendered as "—", never invented from another field. */
  tier: null;
  signedUpAt: string;
  lastSeenAt: string | null;
  lifetimeSpendUsd: number;
}

function toUsd(row: Pick<UsageRow, "estimated_cost">): number {
  return row.estimated_cost ?? 0;
}

function isWithin(createdAt: string, sinceMs: number): boolean {
  return new Date(createdAt).getTime() >= sinceMs;
}

/**
 * Everything on the spend summary card, computed from one full scan of `ai_usage`. The table
 * is small (low hundreds of rows for this pilot cohort) — a single unbounded read, aggregated
 * in memory, rather than four separate range-filtered queries. Revisit if this table's growth
 * ever makes an unbounded read here a real cost; no evidence of that yet.
 */
export async function getSpendSummary(admin: SupabaseClient<Database>): Promise<SpendSummary> {
  const { data } = await admin.from("ai_usage").select("user_id, feature, model, estimated_cost, created_at");
  const rows = data ?? [];

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const since24h = now - day;
  const since7d = now - 7 * day;
  const since30d = now - 30 * day;

  let last24hUsd = 0;
  let last7dUsd = 0;
  let last30dUsd = 0;
  let totalUsd = 0;
  let unattributedCalls = 0;
  let unattributedUsd = 0;
  const byFeature = new Map<string, SpendByKey>();
  const byModel = new Map<string, SpendByKey>();

  for (const row of rows) {
    const cost = toUsd(row);
    totalUsd += cost;
    if (isWithin(row.created_at, since24h)) last24hUsd += cost;
    if (isWithin(row.created_at, since7d)) last7dUsd += cost;
    if (isWithin(row.created_at, since30d)) last30dUsd += cost;
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
    last24hUsd,
    last7dUsd,
    last30dUsd,
    byFeature: [...byFeature.values()].sort(byCostDesc),
    byModel: [...byModel.values()].sort(byCostDesc),
    totalCalls: rows.length,
    totalUsd,
    unattributedCalls,
    unattributedUsd,
  };
}

/**
 * Per-user spend, highest first — the screen version of the query that found a real user at
 * $3.04 in one week against a $1.00/month ceiling. Names attached via a batch profile lookup
 * (the "fetch then zip" convention this codebase uses everywhere instead of a nested embed —
 * see lib/universities/queries.ts's own comment on why). A user with spend but no matching
 * profile (a fully deleted account, `estimated_cost` rows survive per
 * docs/handoffs/data-rights-audit) is still listed under a fallback label rather than dropped —
 * their spend happened and stays visible even though the account didn't survive.
 */
export async function getPerUserSpend(admin: SupabaseClient<Database>): Promise<UserSpend[]> {
  const { data } = await admin.from("ai_usage").select("user_id, estimated_cost, created_at").not("user_id", "is", null);
  const rows = data ?? [];

  const since30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const byUser = new Map<string, { last30dUsd: number; lifetimeUsd: number; callCount: number }>();
  for (const row of rows) {
    if (!row.user_id) continue; // narrows for TS after the .not() filter above, which it can't see through
    const entry = byUser.get(row.user_id) ?? { last30dUsd: 0, lifetimeUsd: 0, callCount: 0 };
    const cost = toUsd(row);
    entry.lifetimeUsd += cost;
    entry.callCount += 1;
    if (isWithin(row.created_at, since30d)) entry.last30dUsd += cost;
    byUser.set(row.user_id, entry);
  }

  const userIds = [...byUser.keys()];
  const { data: profiles } = userIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", userIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return [...byUser.entries()]
    .map(([userId, stats]) => ({
      userId,
      displayName: nameById.get(userId) ?? null,
      last30dUsd: stats.last30dUsd,
      lifetimeUsd: stats.lifetimeUsd,
      callCount: stats.callCount,
      overWarningThreshold: stats.last30dUsd >= BUDGET_WARNING_THRESHOLD_USD,
      overCeiling: stats.last30dUsd >= PER_STUDENT_MONTHLY_CEILING_USD,
    }))
    .sort((a, b) => b.lifetimeUsd - a.lifetimeUsd);
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

  const { data } = await admin.from("ai_usage").select("estimated_cost").gte("created_at", startingCreditEnteredAt);
  const totalSpendUsd = (data ?? []).reduce((sum, row) => sum + toUsd(row), 0);

  return {
    startingCreditUsd,
    startingCreditEnteredAt,
    totalSpendUsd,
    remainingUsd: startingCreditUsd - totalSpendUsd,
  };
}

/**
 * The user list card: signup date, last seen, lifetime spend, and a tier column that's always
 * "—" until tiers exist (env.ts note: not invented here). "Last seen" is Supabase Auth's own
 * `last_sign_in_at` (`admin.auth.admin.listUsers`) — NOT `profiles.updated_at`, which measures
 * the last profile *edit*, a materially different and often much staler signal than the last
 * time someone actually opened the app.
 */
export async function getAdminUserList(admin: SupabaseClient<Database>): Promise<AdminUserRow[]> {
  const [{ data: profiles }, spend, { data: authUsers }] = await Promise.all([
    admin.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }),
    getPerUserSpend(admin),
    admin.auth.admin.listUsers(),
  ]);

  const spendById = new Map(spend.map((s) => [s.userId, s.lifetimeUsd]));
  const lastSeenById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (profiles ?? []).map((p) => ({
    userId: p.id,
    displayName: p.display_name,
    tier: null,
    signedUpAt: p.created_at,
    lastSeenAt: lastSeenById.get(p.id) ?? null,
    lifetimeSpendUsd: spendById.get(p.id) ?? 0,
  }));
}
