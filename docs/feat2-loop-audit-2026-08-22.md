# FEAT-2 territory audit — 2026-08-22

Package 1. Audits every feature in FEAT-2's territory (weekly plan & actions, reflection
loop, application tracker, deadline engine, notifications, monthly review, goals, time
budget/busy mode) against three independent sources: what `PHASE_STATUS.md` claims, what
the code actually does, and what actually happens in a live browser against real data.
Produces a ranked finish-order proposal for Package 2+. Does not fix anything — see
"Escalated ahead of this document" below for the one exception.

## Measurement provenance

| What | Value |
|---|---|
| Code measured against | `origin/main` @ `85c3d65`, re-fetched mid-audit to `ce3ac74` — the delta between the two touches only docs and research/data lanes (`git diff --stat 85c3d65..ce3ac74` confirms zero files under `lib/plan`, `lib/deadlines`, `lib/notifications`, `lib/applications`, `lib/scoring/monthly-review.ts`, `features/dashboard`, `features/applications`, `features/settings`), so every code and browser finding below still holds against current `main`. |
| Browser verified against | A dev server built from this audit's own worktree (`.claude/worktrees/feat2-loop-audit`, `origin/main`), started on a spare port — **not** `localhost:3000`, which UI-1 confirmed is serving `oryn/hide-social-nav` (212 commits behind `main`). `node_modules` cloned via `cp -Rc` (APFS clone). Diffed the two branches for every file in my territory before trusting anything observed on the stale server for corroboration; the only overlapping edits were a pure `canonicalUniversityId` signature refactor in `lib/deadlines/{upcoming,scan}.ts` and a metadata-generation removal in the applications detail page — no business-logic difference. |
| Account used | `oryn.qa.a@example.com` (`.env.qa-accounts.local`), confirmed via its Supabase auth cookie before touching anything. Turns out to be `is_admin=true`, which is why the admin inline requirement-editor renders on university pages under this account — noted where relevant, not a bug. |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP, at multiple points through the audit (numbers below are timestamped per-claim, not one snapshot). |
| Credentials live this session | `SUPABASE_SECRET_KEY` and `CRON_SECRET` both work (the "JWT issued at future" regression is resolved, confirmed via `npm run check:integrations`: Supabase secret key OK). `ANTHROPIC_API_KEY` and `TAVILY_API_KEY` are empty — genuinely unset, not failing. This matters throughout: it means every AI-gated surface in my territory was testable for its *degradation path* but not its *AI-generation path*, while every secret-key-dependent surface (notifications, admin jobs) was fully testable for the first time. |

## Escalated ahead of this document

One finding was serious enough that ORYN-CEO ruled it should jump the queue as **Package
2**, ahead of any ranking below, before I'd finished this audit. Recorded here so the
ranking's reasoning is on record before that PR lands, per the CEO's explicit request.

**The deadline engine does not filter opportunities by cycle status — a closed-cycle
opportunity can be told to a student as "due soon" plus a deadline-reminder notification.**
`lib/deadlines/upcoming.ts`'s `getUpcomingOpportunityDeadlines` and `lib/deadlines/scan.ts`'s
`scanSavedOpportunityDeadlines` select `opportunities` on `deadline >= today` only. Neither
consults `cycle_status`, and neither calls `lib/opportunities/lifecycle.ts`'s
`isOpportunityActionable` — the exact guard the *dashboard's opportunity-match preview*
already applies, on the same page, as documented "defense in depth." One page, two
inconsistent trust postures for the same underlying data.

Confirmed with live data, not hypothetically: `select id, title, cycle_status, deadline,
status from opportunities where deadline >= current_date and cycle_status in ('closed',
'unverified')` (2026-08-22) returns **LaunchX** — `cycle_status='closed'`, `status='active'`,
`deadline` 82 days out. It is `active` (student-browsable, saveable) with a closed cycle and
a future date. If a student saves it, both the "Due soon" widget and the 14/7/3/1-day
notification job will tell them to act on a cycle that's already over.

`isOpportunityActionable` already exists, is already unit-anchored by its own module
comment's worked examples, and already excludes exactly `closed`/`historical`/`discontinued`
while *deliberately* leaving `unverified` alone (unconfirmed is not the same claim as wrong,
and the rest of the app already treats `unverified` as still-showable) — so applying it at
the two call sites resolves this without inventing new status vocabulary. Package 2, per
CEO: smallest possible change (apply the guard, don't refactor the surrounding functions),
pin current behavior with tests before changing it, then add tests for the defective case,
verify both surfaces live on a from-`main` dev server, report before continuing.

## Territory audit

| Feature (spec phase) | `PHASE_STATUS.md` claims | Code-verified | Browser-verified (2026-08-22) | Gap |
|---|---|---|---|---|
| Weekly plan generation (9) | "Done" | Real: `lib/plan/persist.ts` is idempotent per ISO week, `lib/ai/weekly-plan.ts` grounds in Counselor Core's ranked candidates additively. Correct AI-unavailable handling *on the dashboard's initial render* (`dashboard-view.tsx`'s `planError` branch shows a real message and hides the Generate button when `not_configured`). | Dashboard correctly shows Counselor Core's deterministic fallback ("Based on your verified profile data — no AI required") instead of an error, live-confirmed with 3 real ranked actions. `/plan` page: clicked "Generate my plan" with AI genuinely unconfigured — **nothing happened**. No toast, no message, no state change. | **Real gap, not env-only.** `features/dashboard/generate-plan-button.tsx` calls `regenerateWeeklyPlan()` / `ensureWeeklyPlan()`, both of which return `{ error: "..." }` on failure, and the button does `if (!result.error) router.refresh()` — the error string is captured and thrown away. The dashboard's *own* EmptyState avoids this by never rendering `GeneratePlanButton` when `planError === "not_configured"`, but the standalone `/plan` page (`app/(app)/plan/page.tsx`) has no equivalent — it always renders the button, unconditionally. Violates Phase 45 ("errors should be human-readable") more literally than most violations: there is no error shown at all, not even a bad one. `RequirementChecklist` in the same codebase shows the right pattern (`if (result.error) toast.error(result.error)`) three files away. |
| Reflection loop (10) | "Done" | `weekly_actions.reflection_outcome` and `.reflection_note` both exist, both flow into `lib/ai/student-context.ts`'s `recentActionOutcomes` and back into the advisor's prompt (confirmed: real, not aspirational — Chat 1's fix closing this loop is genuine). `updateActionStatus` accepts `reflectionNote` as a parameter. | `features/dashboard/weekly-focus.tsx`'s inline "What happened?" — 4 outcome chips (`completed_successfully`/`partially_completed`/`did_not_work`/`opportunity_no_longer_available`) render on completing an action and correctly persist `reflection_outcome`. | **`reflection_note` (free text) has no UI anywhere.** `grep -rn "reflectionNote" app features lib` shows it only in the type signature and the one hardcoded `null` in `lib/plan/persist.ts`'s insert — never called with an actual string. The DB column, the AI context, and even the action-function's parameter all support it; only the actual textbox a student would type into doesn't exist. Spec (Phase 10) explicitly says "allow short notes" as part of this loop. |
| Weekly action status transitions (10, 50) | "Done" | DB enum (`ActionStatus`) and `lib/ai/student-context.ts`'s own filter (`.in("status", ["completed", "skipped", "expired"])`) both treat `skipped` and `expired` as real states the advisor reasons about. | Only `not_started ⇄ completed` is reachable from any UI I found — the `NumeralToggle` in `weekly-focus.tsx` only toggles those two. | **`skipped` and `expired` are permanently unreachable.** No control lets a student mark an action skipped, and nothing — no job, no page load side effect — ever expires a stale action. The advisor's prompt has a branch (`lib/ai/student-context.ts:288`, `if (a.status === "skipped") return "SKIPPED ..."`) that can never fire from real student data. This is exactly the kind of half-built status-transition gap Phase 50 calls out by name as required test surface, and it has zero tests either (see Cross-cutting below). |
| Deadline engine — cross-source merge (23) | "Done" ("Unified cross-source Deadline Engine" section) | Real: `lib/deadlines/upcoming.ts` genuinely merges applications + saved opportunities + target-university deadlines into one sorted, capped feed; `lib/deadlines/scan.ts` mirrors the same three sources for notifications. Both correctly exclude `NON_ACTIONABLE_VERIFICATION_STATES` (`VERIFIED_HISTORICAL`/`CONFLICTING_EVIDENCE`/`NEEDS_REVIEW`/`CURRENT_CYCLE_NOT_PUBLISHED`) on the university-deadline path — confirmed live: 7 real `VERIFIED_HISTORICAL` rows (2025–2026 past dates) on a targeted university correctly excluded from both the "Due soon" query and the notification scan. | Confirmed the merge logic is real by direct SQL against live `university_deadlines`/`applications`/`saved_opportunities`, cross-checked against what the two functions would return. | **The opportunity-cycle-status gap above.** Otherwise this phase is genuinely done — the "university" source's verification-state filtering (added for migration 0056) is a real, working analog of the guard that's missing on the "opportunity" source; whoever built one clearly knew the pattern, it just didn't travel to the sibling function. |
| Notifications (24) | "Done" (system-generated only, bell in both headers, mark-read/mark-all-read) | `lib/notifications/create.ts` correctly routes through the admin client only (matches the RLS design — no client insert policy). `app/(app)/notifications/actions.ts`'s read/read-all both scope to `user_id`. | Bell popover: correct empty state ("You're all caught up"), matches `notifications: 0` live. Ran the deadline-reminders job for real via the Admin panel's "Run deadline scan" button (first real end-to-end exercise of this job in this project's history per `external_sync_jobs` going 0→1 rows total) — **succeeded**, correctly notified 0 (no live deadline actually crosses a 14/7/3/1-day threshold today), and the run was recorded. | **Not a code gap — a genuinely missing piece of infrastructure.** No `vercel.json`, no GitHub Actions `schedule:`, no `pg_cron` entry anywhere in the repo (`grep -rn cron` across migrations, `.github/workflows/`, and the repo root all come up empty). Every `/api/jobs/*` route, including this one, is reachable only by a human clicking the admin panel or an authenticated `curl`. The job code itself is real and now confirmed working — but Phase 30 asks for "scheduled processes," and there is currently no schedule. |
| Application tracker (22) | "Mostly done" | `createApplication` auto-generates the spec's exact 8-item checklist; `computeReadiness` is a clean, pure percentage over non-`not_applicable` items; `updateApplicationStatus`/`updateRequirementStatus` both scope to `user_id` and revalidate correctly. | **Fully exercised live, end to end**: saved MIT as a target → "Start an application" (correctly disabled with an explanatory tooltip before a target exists) → dialog pre-filled the target, created the application → 8-item checklist rendered → toggled "Application" through its status cycle, readiness moved 0%→13% exactly as the formula predicts (1/8) → changed application status via the 8-option dropdown to "Submitted", persisted across navigation. | None found. This is the strongest-verified surface in my territory — matches its "Mostly done" claim; the only genuinely missing piece PHASE_STATUS.md itself already names honestly (a dedicated read-only Portfolio view, not application-tracker-specific) is outside this territory. |
| Monthly review (40) | "Done" | `lib/scoring/monthly-review.ts` is deterministic (no AI call, per Phase 27's "don't spend model budget where arithmetic answers the question"), diffs against the oldest snapshot ≥30 days old, honest `hasHistory: false` empty state when none exists. | `/profile/history` live: "Not enough history yet — Check back after your profile has had a chance to change over a few weeks. Your current Career Profile score is 0/100." Correct — QA-A has 0 achievements, so genuinely no meaningful snapshot to diff. | None found in the code path itself. Only verifiable end-to-end once a persona has ≥30 days of real snapshot history, which no QA account will ever organically have — worth a fixture-backed test rather than waiting on browser time (see Cross-cutting). |
| Goals (66) | "Done" (added as a 10th `AchievementSection`) | `createGoal`/`updateGoal`/`deleteGoal` in `app/(app)/profile/actions.ts`, reusing the generic CRUD form. | Not clicked through live this pass (budget triage — see below); corroborated by data instead: live `career_goals` holds 8 real rows across QA personas, i.e., the write path has demonstrably been exercised successfully by *someone*, recently. | Low-risk gap in my own verification, not a product gap: I'd put a live click-through of Goals CRUD as a cheap first check for whoever picks up Package 3+, just to close the loop, not because anything points at a defect. |
| Time budget / busy mode (64–65) | "Done" (fixed a previously-real "never had a write path" bug) | `features/settings/capacity-form.tsx` calls real `updateTimeBudget`/`updateBusyMode` actions; both fields already flow into `lib/ai/student-context.ts`'s advisor prompt. | Live: Settings → "Study capacity" renders both controls; time budget correctly shows "Not set" for QA-A (consistent with it never having been touched, not with a write-path regression). Interactive click-through of the dropdown itself hit a browser-tool coordinate/timing snag mid-session and I didn't force it through — the code read is thorough enough (identical `Select`/action pattern as three other settings fields I *did* verify write successfully: display name, country, citizenship) that I'm not flagging this as an open question, just an honest note on what was and wasn't clicked. | None found. |

## Cross-cutting

**Test coverage in this territory is close to zero, and it's the specific surface Phase 50
names.** `find . -name "*.test.ts"` across the whole repo turns up 801 tests in ~50+ files
covering scoring, admissions, requirements, benchmarking, opportunities matching/dedup,
search ranking, and more — but inside my territory, only `__tests__/deadlines/ingest.test.ts`
exists (tests deadline *ingestion/parsing*, not the read-side engine) and
`__tests__/opportunities/readiness.test.ts` tests a same-named but unrelated function
(`evaluateRecommendationReadiness` in `lib/opportunities/readiness.ts`, not
`lib/applications/readiness.ts`'s `computeReadiness`, which is the one Phase 70 actually
means). Zero tests exist for: `computeReadiness`, `getUpcomingDeadlines`,
`getUpcomingOpportunityDeadlines`/`getUpcomingUniversityDeadlines`/
`getUpcomingApplicationDeadlines`, `scanDeadlines` and its three source-scanners,
`getMonthlyReview`, `isOpportunityActionable`/`deriveCycleStatusForPassedDeadline`, or any
`weekly_actions` status transition. Phase 50 explicitly names "date calculations" and
status-transition logic as required test surface — this is that surface, untested.

**Everything AI-gated degrades honestly, nothing fakes data.** Every AI-dependent path I
exercised (weekly plan generation, on both the dashboard's automatic path and the standalone
page) either showed a real, honest "not configured" state or silently did nothing — never a
fabricated plan, never invented data. Consistent with Rule 4's non-negotiable. The dashboard
does this well (explicit message + real deterministic Counselor Core fallback); the `/plan`
page does the "silently" half without the "honestly" half, which is the finding above.

**Note for whoever maintains `docs/current-product-capability-map.md`**: its Student-area
row for "Weekly plan" (line 73, compiled 2026-08-20 on `oryn/counselor-data-quality-v1`)
states "no deterministic fallback... not wired as a fallback" for Counselor Core substituting
on an AI outage. That's stale against current `origin/main` — I live-verified the fallback
working today. Not mine to fix (that doc isn't my territory), flagging so it doesn't get
cited as current.

## Ranked finish-order proposal (Package 2+, pending CEO approval)

Package 2 is already decided (the escalation above). This ranks what I'd propose after it,
most valuable first, all scoped small enough to be one PR each per the org's package
discipline:

1. **`/plan` page's silent error swallow** (this doc's first finding). Small, contained fix —
   either suppress the button under `not_configured` the same way the dashboard does, or
   (better, since the standalone page has more room than an EmptyState action slot) surface
   `result.error` via the same `toast.error` pattern already used three files away in
   `RequirementChecklist`. A student clicking "Generate my plan" and getting total silence is
   a worse experience than the dashboard's honest message right next to it.
2. **Pay down territory test debt**, starting with `computeReadiness`, `isOpportunityActionable`
   (partially forced by Package 2 anyway per the CEO's testing requirement),
   `scanDeadlines`'s threshold/dedup logic, and weekly-action status transitions. Phase 50
   names this surface explicitly; right now a regression in deadline math or a status
   transition would ship silently.
3. **Wire an actual scheduler for the background jobs**, at minimum `deadline-reminders` and
   ideally all four `/api/jobs/*` routes. This is infrastructure, not application code — the
   likely shape is a `vercel.json` `crons` entry per route (if Vercel is the deploy target;
   `docs/founder-blocked-backlog.md` should have the hosting decision) hitting the existing
   `CRON_SECRET`-gated routes, zero new business logic needed. Worth confirming the hosting
   decision before building the specific mechanism.
4. **`reflection_note` free-text input.** Small, additive UI change to `weekly-focus.tsx`'s
   existing reflection panel — a textarea next to the 4 outcome chips, wired to the
   already-existing `reflectionNote` parameter on `updateActionStatus`. Closes a real,
   spec-named gap ("allow short notes") cheaply.
5. **A path to `skipped`/`expired` status.** Larger and more judgment-heavy than the above —
   `skipped` plausibly wants an explicit student control (a "not doing this" action next to
   complete), while `expired` plausibly wants a scheduled sweep (itself dependent on item 3's
   scheduler existing) rather than a UI control. Ranked last because it's the least contained
   of the five and benefits from item 3 landing first.

Items 1 and 4 don't depend on anything else and could run in either order or in parallel
with item 2's test-debt work. Item 5 should follow item 3.

## Addendum (2026-08-22, later same day) — a finding from Package 3's test-debt work

Writing tests for weekly-action status transitions (this document's item 5, above) surfaced
something worth recording on its own rather than folding silently into a test file: **there
is no transition validation anywhere.** `updateActionStatus`
(`app/(app)/plan/actions.ts`) writes whatever `status` it's given directly, with no check
against the action's current status first. A student's weekly action can currently go
`expired` → `completed`, or `skipped` → `in_progress`, or any other combination, with
nothing in the code preventing it — not a bug in the sense of doing the wrong thing on a
request, but a genuine absence of a constraint the product's own data model implies one
should exist.

This isn't just a data-integrity nicety. Phase 10's reflection loop and Phase 63's
recommendation history both read `weekly_actions.status` to decide what the advisor says
next (`lib/ai/student-context.ts`'s `recentActionOutcomes`, described in `lib/ai/advisor-
prompt.ts` as "learn from these — don't just repeat what was skipped or didn't work") — so
an unconstrained status history is unconstrained *advisor input*, not just an internal
inconsistency nobody sees.

Not fixed here, and not obviously a bug to fix reflexively: whether transitions should be
constrained, and to what set of rules, is a product decision (does re-completing an expired
action make sense if a student picks it back up? does `skipped` "expire" 's own semantics
even apply once something's already `completed`?) rather than something this audit should
decide unilaterally. Recording as a finding for whoever scopes the eventual fix — likely
paired with item 5's `skipped`/`expired` UI work above, since building explicit transition
controls there is a natural place to also decide what transitions those controls should
allow.
