# What changes when the founder applies the unapplied migrations — 2026-09-03

Measurement only, per oryn-a7's dispatch. No code changed. For every migration currently
unapplied on `oryn-qa-scratch`, checked what reads the new table/column, what "doesn't
exist" means to that code today, and whether "exists with zero rows" means the same thing
or something stricter.

**Count correction, stated plainly rather than matched to the dispatch:** I count
**fourteen** unapplied migrations, not fifteen — verified directly against
`information_schema` (columns for `profiles`, `advisor_messages`; table existence for
everything else), not assumed. `0088` (advisor_messages.degraded) and `0089`-`0092`
(profiles.plan_tier/notify_deadline/response_mode/ultra_welcome_seen_at) are confirmed
**applied**. `0093` through `0106` — fourteen migrations — are confirmed **unapplied**.
Doesn't change the answer below; noted because a headcount that's off by one is worth
having exactly right before it's repeated again.

## Result: all fourteen are clean

Every one degrades to the *same* value whether the table is missing entirely or exists
with zero rows. None flips a fail-open default to something stricter. Two (`0098`
`admin_actions`, `0105` maintenance mode) are supposed to change visible behavior the
moment they land — checked those specifically for *what* they change, not just that they
don't break.

| Migration | What it adds | Reader | Missing vs. empty | Verdict |
|---|---|---|---|---|
| 0093 upgrade_prompt_dismissal | 4 `profiles` columns | `extractUpgradePromptDismissalState` | both `undefined`/`null` via `?? default` → "never dismissed" | clean |
| 0094 admin_finance_settings | singleton table | `getFinanceSettings` | `.maybeSingle()`; missing→caught error→default, empty→`!data`→same default | clean |
| **0095 job_controls** | per-job disable flag | `isJobDisabled`/`getJobControls` | `.maybeSingle()`, `data?.disabled ?? false` — identical `false` either way; migration's own header states this is the intended contract | **clean — my named territory, verified in full** |
| **0096 quota_grants** | per-user grant ledger | `getMonthlyGrantsUsd` | missing→error caught→`0`; empty→real empty array→`.reduce()` over nothing→`0` — identical | **clean — my named territory, verified in full** |
| 0097 admin_action_log | audit log (INSERT-only reader path is display) | `logAdminAction` (write), `getAdminActivityTimeline` (read) | write fails open (logged, not thrown — a lost log entry is real but recoverable, per that function's own comment); read: `isUndefinedTableError`-guarded, "not set up" and "set up, nothing happened" both render an empty list | clean |
| 0098 admin_actions | audit + cleanup-button gate | `isAdminActionsTableLive`, `getAdminActivityTimeline` | deliberately uses `.select().limit(1)` not `head:true` — confirmed live elsewhere that `head:true` masks a missing-table error on this exact table; correctly `false` before, `true` after with 0 rows | clean, and **this is the intended unlock** — the cleanup Apply button should enable, and it will |
| 0099 job_budget_overrides | per-feature override | `resolveJobBudgetUsd` | `.maybeSingle()`, missing→error→default; empty→`!data`→same default | clean |
| 0100 ai_model_pricing | per-model override | `getLiveRateOverrides` | missing→caught, cached empty Map; empty→real empty result→same empty Map→falls to `estimateCostUsd`'s hardcoded table | clean |
| 0101 admin_dead_feature_flags | per-feature dead marker | `getFeatureCensus` | `flags ?? []` either way → empty Map → every feature shows `deadFlag: null` | clean |
| 0102 weekly_plan_budget_settings | singleton ceiling | `getWeeklyPlanBudgetCeiling` | `isUndefinedTableError`-guarded fallback to `$10` default; empty row (none seeded) → same `?? default` | clean |
| 0103 opportunity_verification_runs | run-history log | `run-job.ts` (insert/update only, no read-for-decision anywhere in the job itself) | writes fail open, logged, job continues (matches this job's whole resilience design); nothing reads this table to decide anything | clean — no empty-vs-missing question even applies |
| 0104/0106 ultra_gift_expires_at | `profiles` column | `resolvePlanTier` | missing→`undefined`→`isGiftActive` false; empty (NULL, no gift granted)→`isGiftActive` false — identical "standard" unless `plan_tier` itself is already "ultra" | clean |
| 0105 admin_product_settings | singleton: signups/maintenance/trial | `getProductSettings` | `.maybeSingle()`, missing→default, empty→same default. **Checked the actual default values, not just the pattern**: `maintenanceMode: false` in both the code fallback and the column's own `default false` — landing this migration cannot silently turn maintenance mode on. `signupsEnabled: true` same agreement. | clean, **and this is the other intended unlock** — maintenance mode becomes a real, readable switch, defaulting off |

## The one thing worth naming as a pattern, not a finding

Almost every migration above already carries its own comment stating the exact
missing-vs-empty equivalence and citing the specific PostgREST behavior it depends on
(`isUndefinedTableError`, the documented `head:true`-masks-missing-table gotcha, `select("*")`
silently omitting an unknown column rather than erroring). This wasn't written blind and
checked once — it was designed for this transition from the start, migration by migration,
by whoever built each one tonight. My own read confirmed the code does what each comment
claims; I didn't find a comment that overstated its own safety.

## Bottom line for the founder

All fourteen migrations are safe to apply in one transaction. Nothing currently fail-open
flips to fail-closed (or the reverse) the moment any of these land with zero rows. Two
things will visibly change the moment they do, both intentionally: the admin panel's
description-cleanup Apply button goes from "not set up yet" to usable, and maintenance mode
becomes a real switch in the admin panel rather than a no-op — both default to the same
"off"/"nothing happens yet" state a fresh install should have.
