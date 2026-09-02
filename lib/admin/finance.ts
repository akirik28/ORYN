import "server-only";

import { JOB_BUDGET_USD } from "@/lib/ai/limits/job-budget";
import { PER_STUDENT_MONTHLY_CEILING_USD } from "@/lib/admin/queries";

/**
 * Unit-economics calculation for the admin finance dashboard (CEO's assignment, 2026-09-02;
 * ground truth `docs/maliyet-ve-fiyatlandirma-2026-09-02.md`). Pure computation only — no
 * Supabase reads live here, those stay in queries.ts per that file's own "every admin-panel
 * read, one module" header. This file is the business-logic layer queries.ts's own D8
 * boundary (docs/admin-panel-architecture-2026-09-02.md) describes: the admin surface reads
 * and renders, it does not decide what a number means — but a *pure function* of already-
 * fetched numbers isn't a Supabase read either, so it belongs here, not there.
 *
 * **Every dollar figure below traces to a live constant, not a copy of one.** The known
 * failure mode this avoids (found and fixed once already tonight, `queries.ts`'s own
 * `PER_STUDENT_MONTHLY_TARGET_USD` comment): a display-layer number redefined independently
 * of the enforcement layer's constant drifts silently the moment the founder changes the
 * real one. `WORST_CASE_AI_COST_PER_ACTIVE_USER_USD` reads `PER_STUDENT_MONTHLY_CEILING_USD`
 * (queries.ts's own re-export of `lib/ai/limits/budget.ts`'s `MONTHLY_BUDGET_CEILING_USD`),
 * not a hardcoded $0.99 — $0.99 is the cost doc's own message-level derivation (18 Sonnet +
 * 55 Haiku messages land just under the $1.00 ceiling with real per-message granularity),
 * genuinely a few cents more precise than the flat ceiling, but deriving it exactly would
 * mean re-implementing `lib/ai/monthly-quota.ts`'s own two-phase `usesConsumed` accounting a
 * second time for a number that's already, by construction, "cannot exceed the ceiling."
 * Using the ceiling directly is the more conservative (slightly higher) worst case and the
 * one guaranteed not to drift, which matters more here than the extra cents of precision.
 * `SYSTEM_JOB_COSTS_USD` reads `JOB_BUDGET_USD` (`lib/ai/limits/job-budget.ts`), the same
 * constants — including any env-var override — the job-spend cap itself enforces.
 *
 * What has NO code constant to read, because it isn't application logic — it's a billing
 * fact nothing in this codebase enforces or could: Supabase/Vercel/domain pricing. Those are
 * named constants below, sourced from the cost doc, and the doc itself flags them
 * "VARSAYIM (liste fiyatları, doğrulanmalı)" — list prices, unverified. Keep that hedge
 * alive here rather than letting the constant's mere existence in code imply it was checked.
 */

// Cost doc §3 — list prices, not yet verified against a live invoice. Update alongside the
// doc if either changes; there is no running total anywhere else to keep in sync with.
export const SUPABASE_PRO_USD = 25;
export const VERCEL_PRO_USD = 20;
export const DOMAIN_USD = 1;
/** Excludes the two system-wide catalog jobs on purpose — see SYSTEM_JOB_COSTS_USD, which
 *  is tracked separately because it does not shrink the same way per-user as this does (both
 *  are fixed totals, but CEO's own framing of the assignment asks for the split to stay
 *  visible: "the fixed share shrinks with scale and the AI share doesn't" is only legible if
 *  the reader isn't left to guess how much of "fixed" is Supabase/Vercel/domain versus
 *  catalog jobs). */
export const RECURRING_INFRA_USD = SUPABASE_PRO_USD + VERCEL_PRO_USD + DOMAIN_USD;

/** `JOB_BUDGET_USD`'s two keys summed — opportunity_extraction + requirement_extraction,
 *  the shared-catalog jobs cost doc §3/§4 call out as the fixed cost that does NOT scale
 *  with user count at all (same catalog, same job, whether 100 students or 10,000 read it). */
export const SYSTEM_JOB_COSTS_USD = JOB_BUDGET_USD.opportunity_extraction + JOB_BUDGET_USD.requirement_extraction;

/** The absolute per-active-user ceiling — see this file's own header comment for why this
 *  reads the enforcement constant rather than a derived literal. */
export const WORST_CASE_AI_COST_PER_ACTIVE_USER_USD = PER_STUDENT_MONTHLY_CEILING_USD;

/** The founder's own price, set 2026-09-02 (relayed through oryn-a7, verbatim: "399,99 TL
 *  olarak düşün, öyle yaz her yere"). Duplicated in messages/en.json and messages/tr.json as
 *  display copy (settings.plan.interestDescription, nav.upgradePlanPrice) — this is the one
 *  place it exists as a number code can compute with. If the founder changes the price,
 *  update both the copy strings and this constant; nothing currently reads one from the
 *  other, which is a real, small drift risk worth a future cleanup, not fixed here. */
export const ULTRA_PRICE_TRY = 399.99;

// -------------------------------------------------------------------------------------------
// The "we don't know the exchange rate" honesty boundary
// -------------------------------------------------------------------------------------------

/**
 * Wraps any figure that can only be computed once a value the admin hasn't necessarily
 * configured is known — today, specifically the USD/TRY rate. Mirrors `RemainingCredit |
 * null`'s existing shape (queries.ts's own `getRemainingCredit`, D4: "a missing starting
 * figure renders as 'not set up,' never as $0") one level more general, since here more than
 * one downstream figure (margin multiple, break-even revenue, a TL price restated in USD)
 * shares the identical "unavailable until configured" reason rather than each inventing its
 * own null-handling.
 *
 * A `boolean`-discriminated union, not `T | null`, so a caller is forced to handle *why* a
 * value is missing (today there's exactly one reason; the shape doesn't preclude a second
 * one later, e.g. a rate that's configured but implausibly stale) rather than a bare `null`
 * a future reader could mistake for "the answer is zero."
 */
export type RateDependent<T> = { available: true; value: T } | { available: false; reason: "exchange_rate_not_configured" };

function unavailable<T>(): RateDependent<T> {
  return { available: false, reason: "exchange_rate_not_configured" };
}

/** TRY → USD at the given rate (TL per 1 USD, matching the cost doc's own "KUR = ___ TL/USD"
 *  framing and `ADMIN_USD_TRY_RATE`'s doc comment) — division, not multiplication; a rate of
 *  40 means 40 TL buys $1, so 400 TL / 40 = $10, not $16,000. */
export function convertTryToUsd(amountTry: number, rateTryPerUsd: number): number {
  return amountTry / rateTryPerUsd;
}

// -------------------------------------------------------------------------------------------
// Revenue: real vs. projected, kept structurally distinct so the two can never be confused
// -------------------------------------------------------------------------------------------

/**
 * CEO's hard constraint, stated as a type rather than left to a component's own discipline:
 * "Don't build a chart that implies income exists... today's figure is a projection against
 * a price nobody can pay yet." There is no payment provider and migration 0089 (plan_tier)
 * is unapplied on every real account, so **every revenue figure this dashboard can produce
 * today is `kind: "projected"` except the literal, current, always-true fact that real
 * revenue this month is $0** (`kind: "real"`) — that zero is not a projection, it's the
 * actual current state, and the two must render differently (D4's same "a derived number is
 * never presented as an account balance" logic, applied to revenue instead of credit). A
 * future payment integration slots in by adding real `kind: "real"` rows computed from
 * whatever that system tracks — this type doesn't need to change, only what constructs it.
 */
export type RevenueFigure =
  | { kind: "real"; usd: number }
  | { kind: "projected"; usd: number; /** Human-readable, e.g. "120 hypothetical Ultra users at 399.99 TL/month" — always state the scenario next to the number, per the same constraint. */ basis: string };

/** Today's real revenue is always this — no payment provider exists, so there is nothing to
 *  query and nothing to project; $0 is not an estimate, it's the fact. Exists as a function
 *  (not a bare constant) so the one place this claim is made is named and greppable, and so
 *  a real payment integration has one obvious call site to replace, not a literal `0`
 *  scattered wherever "current revenue" is needed. */
export function getRealRevenueThisMonthUsd(): RevenueFigure {
  return { kind: "real", usd: 0 };
}

/** A hypothetical: if `payingUsers` were on Ultra this month, revenue would be this —
 *  labelled `projected` unconditionally, regardless of how plausible `payingUsers` is,
 *  because there is no code path today that makes any paying-user count real. */
export function projectRevenueUsd(payingUsers: number, rateTryPerUsd: number): RevenueFigure {
  const usd = convertTryToUsd(payingUsers * ULTRA_PRICE_TRY, rateTryPerUsd);
  return { kind: "projected", usd, basis: `${payingUsers} hypothetical Ultra user${payingUsers === 1 ? "" : "s"} at ${ULTRA_PRICE_TRY} TL/month` };
}

// -------------------------------------------------------------------------------------------
// Unit economics — one calculator, reused for the per-user breakdown, the scale-scenario
// table, break-even, and margin, rather than four independent calculations that could drift
// apart from each other.
// -------------------------------------------------------------------------------------------

export interface UnitEconomicsInput {
  /** Every registered user in the scenario, paying or not — cost is driven by usage, and
   *  Ultra does not currently carry a different AI allowance (confirmed 2026-09-02, see
   *  docs/ultra-feature-recommendation-2026-09-02.md and lib/tier/comparison.ts's own note:
   *  the one real Ultra AI difference is reply-mode depth, not a bigger monthly pool), so a
   *  free and a paying user cost the same in this model. */
  totalUsers: number;
  /** 0–1. Cost doc §4's own 30%/60% scenarios are explicitly marked VARSAYIM — assumption,
   *  not measurement (§9's own open checklist: "Gerçek aktif kullanıcı oranı — ölçüm
   *  değil"). Required, not defaulted, so a caller can't accidentally render an assumed
   *  ratio as if it were read from real data. */
  activeRatio: number;
}

export interface UnitEconomicsResult {
  totalUsers: number;
  activeUsers: number;
  /** AI cost only, worst case, spread across every registered user (not just active ones —
   *  matches the cost doc's own table, verified by reproducing its exact numbers: 100 users
   *  @ 30% active = 30 × 0.99 + 86, / 100 = $1.16; 10,000 @ 60% = 6,000 × 0.99 + 86, /
   *  10,000 = $0.60 — both match docs/maliyet-ve-fiyatlandirma-2026-09-02.md §4 to the cent,
   *  confirmed reproducing the table before trusting the formula, not assumed from reading
   *  the doc's prose description of it alone). This is the piece that does NOT shrink with
   *  scale — more users means proportionally more active users means proportionally more AI
   *  spend, a roughly flat per-user figure regardless of totalUsers. */
  aiCostPerUserUsd: number;
  /** Supabase + Vercel + domain, fixed monthly total divided by totalUsers — shrinks as
   *  totalUsers grows, unlike the AI line above. Split from jobs (below) rather than folded
   *  into one "fixed" number, per the assignment's own framing that the three-way split is
   *  the point, not incidental detail. */
  infraCostPerUserUsd: number;
  /** The two shared-catalog jobs, fixed monthly total divided by totalUsers — same shrinking
   *  shape as infra, tracked separately because it is conceptually a different kind of fixed
   *  cost (a shared product feature's own cost, not hosting) and the cost doc treats it as
   *  its own line for that reason. */
  jobsCostPerUserUsd: number;
  totalCostPerUserUsd: number;
  totalMonthlyCostUsd: number;
}

export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const { totalUsers, activeRatio } = input;
  if (totalUsers <= 0) {
    throw new Error("computeUnitEconomics: totalUsers must be positive — there is no meaningful per-user cost for zero users, and dividing by zero would silently produce Infinity/NaN instead of a caught error.");
  }
  if (activeRatio < 0 || activeRatio > 1) {
    throw new Error(`computeUnitEconomics: activeRatio must be within [0, 1], got ${activeRatio}.`);
  }

  const activeUsers = totalUsers * activeRatio;
  const totalAiCostUsd = activeUsers * WORST_CASE_AI_COST_PER_ACTIVE_USER_USD;
  const totalMonthlyCostUsd = totalAiCostUsd + RECURRING_INFRA_USD + SYSTEM_JOB_COSTS_USD;

  return {
    totalUsers,
    activeUsers,
    aiCostPerUserUsd: totalAiCostUsd / totalUsers,
    infraCostPerUserUsd: RECURRING_INFRA_USD / totalUsers,
    jobsCostPerUserUsd: SYSTEM_JOB_COSTS_USD / totalUsers,
    totalCostPerUserUsd: totalMonthlyCostUsd / totalUsers,
    totalMonthlyCostUsd,
  };
}

/** Cost doc §4's own scale table, reproduced as data rather than retyped as a second literal
 *  copy — 100/500/1,000/5,000/10,000 users at 30%/60% active, the exact rows the doc shows.
 *  A caller wanting a different scale or ratio should call `computeUnitEconomics` directly;
 *  this exists so the dashboard can render the doc's own illustrative table without
 *  hand-copying five rows of numbers that would then need to be kept in sync by hand. */
export const COST_DOC_SCALE_SCENARIOS: readonly { totalUsers: number; activeRatio: number }[] = [
  { totalUsers: 100, activeRatio: 0.3 },
  { totalUsers: 100, activeRatio: 0.6 },
  { totalUsers: 500, activeRatio: 0.3 },
  { totalUsers: 500, activeRatio: 0.6 },
  { totalUsers: 1_000, activeRatio: 0.3 },
  { totalUsers: 1_000, activeRatio: 0.6 },
  { totalUsers: 5_000, activeRatio: 0.3 },
  { totalUsers: 5_000, activeRatio: 0.6 },
  { totalUsers: 10_000, activeRatio: 0.3 },
  { totalUsers: 10_000, activeRatio: 0.6 },
];

// -------------------------------------------------------------------------------------------
// Break-even and margin — both rate-dependent, both built on computeUnitEconomics rather
// than a second, disconnected formula.
// -------------------------------------------------------------------------------------------

export interface BreakEvenResult {
  totalUsers: number;
  activeRatio: number;
  totalMonthlyCostUsd: number;
  /** Rounded up — 41.2 paying users needed means 41 isn't enough, matching how a real
   *  headcount works. */
  requiredPayingUsers: number;
}

/** How many of `input.totalUsers` would need to be paying Ultra users to cover
 *  `computeUnitEconomics(input)`'s total monthly cost, at the founder's own price. Requires
 *  the exchange rate (the price is in TRY, the cost model is in USD) — `unavailable()` if
 *  the rate isn't configured, never a number computed against a guessed rate. */
export function computeBreakEven(input: UnitEconomicsInput, rateTryPerUsd: number | null): RateDependent<BreakEvenResult> {
  if (rateTryPerUsd === null) return unavailable();
  const economics = computeUnitEconomics(input);
  const priceUsd = convertTryToUsd(ULTRA_PRICE_TRY, rateTryPerUsd);
  return {
    available: true,
    value: {
      totalUsers: input.totalUsers,
      activeRatio: input.activeRatio,
      totalMonthlyCostUsd: economics.totalMonthlyCostUsd,
      requiredPayingUsers: Math.ceil(economics.totalMonthlyCostUsd / priceUsd),
    },
  };
}

/** Price ÷ cost-per-user, at whatever scale `unitEconomics` was computed for — deliberately
 *  not a single number. CEO's own instruction: "the cost model recommended 5x and the
 *  founder set a price well above that... show the real multiple rather than a flattering
 *  one." Showing this against several `unitEconomics` inputs (today's real, tiny user count;
 *  a mid-scale scenario; the worst-case single active user) rather than picking whichever
 *  scenario produces the biggest number is how a caller keeps that honest — this function
 *  computes one multiple, the caller decides which scenarios to show side by side. */
export function computeMarginMultiple(unitEconomics: UnitEconomicsResult, rateTryPerUsd: number | null): RateDependent<number> {
  if (rateTryPerUsd === null) return unavailable();
  const priceUsd = convertTryToUsd(ULTRA_PRICE_TRY, rateTryPerUsd);
  return { available: true, value: priceUsd / unitEconomics.totalCostPerUserUsd };
}
