# Tracing the student's core loop, end to end

**Date:** 2026-09-03. **Author lane:** this session. **CEO dispatch**: nobody had checked
that the product's central thesis (Phases 9/10 — profile → score → 3 prioritized actions →
completion → reflection → the next plan changes) actually closes end to end. Read-only
against live code and data throughout; no plan generation triggered (a real, billed AI call
against a real student's allowance) per explicit instruction.

**This builds directly on an existing audit, not a fresh investigation** —
`docs/reflection-loop-audit-2026-09-02.md` (memory:
[[project_oryn_reflection_loop_audit]]) already answered most of this yesterday, live-verified
on a QA account. Grepped memory before drawing any conclusion, per this session's own
standing discipline, and it changed what this document set out to do: not "does the
mechanism exist" (already proven) but "has it ever actually closed with real data, and what
does the live database say now."

## What's already proven, and by whom — not re-claimed here

- **The write path works.** `app/(app)/plan/actions.ts`'s `updateActionStatus` →
  `lib/plan/status-patch.ts`'s `buildActionStatusPatch` → `weekly_actions` update. Confirmed
  by the 2026-09-02 audit via a real UI click-through on a QA account (`status: completed`,
  `reflection_outcome`, `reflection_note`, `completed_at` all verified directly in the
  database, not the UI's optimistic state).
- **The read query is correct.** `lib/ai/student-context.ts` reads exactly
  `title, status, reflection_outcome, reflection_note` from `weekly_actions`, filtered to
  `status IN (completed, skipped, expired)`, ordered newest-first, capped at 10 — the same
  audit re-ran this exact query against the QA account's real completion and confirmed it
  returns the row, then hand-applied the file's own `describe()` formatting to produce the
  literal string the advisor prompt would contain.
- **A real, historically-destructive bug in this exact loop was found and fixed.**
  [[project_oryn_plan_regenerate_reflection_loss]]: regenerating a plan used to run an
  unconditional `DELETE FROM weekly_actions WHERE plan_id = ...` before inserting the new
  actions — including any `completed` row with a reflection attached. Confirmed historically
  real via `product_events` (4 distinct `weekly_action_completed` ids from 2026-08-22/23,
  since absent from `weekly_actions` — an append-only event log proving the completions
  happened, against a table that had since been wiped). **Re-verified myself, independently,
  reading current `lib/plan/persist.ts:195` directly**: the delete is now scoped to
  `.in("status", ["not_started", "in_progress"])` — completed/skipped/expired rows are
  structurally exempt. Confirmed this fix is genuinely on the current `main`
  (`git merge-base --is-ancestor 72c0a563 HEAD` → yes), not just described in a memory file.

## What had not been proven, and is the actual gap

The 2026-09-02 audit's own words: *"This audit's own live test is the first direct proof the
reflection half specifically works, not an extension of the historical evidence"* — and it
stopped exactly there, deliberately, to avoid an unnecessary billed generation call. It proved
the query returns the right row. It did not — could not, under the same cost constraint this
pass also operates under — prove that a real subsequent `generateWeeklyPlan()` call actually
produces a visibly different plan because of it.

**Checked whether the live database has since closed that gap on its own. It has not.**

Every account with more than one `weekly_plans` row (4 of them) was checked directly:

| Account | Plan 1 | Plan 2 | Were plan 1's actions reflected on before plan 2 was generated? |
|---|---|---|---|
| Founder (`ccf2161e…`) | 2026-08-24 | 2026-08-30 | No — all 3 still `not_started` |
| `e9eba798…` | 2026-08-23 | 2026-09-02 06:58 | No — all 3 still `not_started` |
| `46dd6f7e…` | 2026-08-23 18:57 | 2026-08-23 21:12 | No — 2h 15m apart, no time to act |
| `026e9295…` | 2026-08-23 16:04 | 2026-08-24 14:06 | No — all still `not_started` |

**The one piece of real reflection data in the entire database was created *after* the only
second plan that could have consumed it.** `e9eba798…`'s single reflected action (`Apply to
Yale Young Global Scholars`, `status: completed`, `reflection_outcome:
completed_successfully`) has `created_at: 2026-09-02 07:15:41` — this is the 2026-09-02
audit's own QA test row. That account's plan 2 was generated at `06:58:51` the same day, 17
minutes *before* the test reflection existed. There is no plan 3 for this account. The loop's
consumption side has never run against real reflection data, not once, in this database's
history — not because the join is broken, but because no plan has ever been generated at a
moment when reflected-on data existed to feed it.

**Worth naming precisely, because it changes what "the join might go nowhere" means here.**
This isn't `weekly_actions` accumulating rows nobody reads (checked: the query and formatting
are both real and correct). It's closer to a bridge that's been built and load-tested on one
side, with no vehicle having yet driven all the way across. Both are real gaps; they call for
different next steps. A broken join needs a code fix. This needs either organic use to
accumulate (a student completes and reflects, then later returns for a fresh plan — nothing
in the code prevents this) or one more deliberate, billed test call carrying the process
forward from where 2026-09-02 stopped — a decision for whoever weighs that cost, not made
here.

## The other half of the question: do the three actions trace to real gaps, not generic advice

**Yes, checked directly, and the founder's own two plans are the clearest evidence.** Plan 1
(2026-08-24): *"Your profile is empty, so nothing can be scored or recommended with
confidence yet... foundation-building: get your academic and activity data on record."*
Plan 2 (2026-08-30, six days later): *"Ödüller güçlü ve liderlik... muhtemelen sağlam, ama
Akademik (43/100) ve Entelektüel Merak (12/100) gerçek zayıf noktalar"* ("Awards are strong
and leadership is likely solid, but Academic (43/100) and Intellectual Curiosity (12/100) are
the real weak points") — citing real, specific numeric scores and a real count ("4 existing
projects") that did not exist in plan 1's context at all. The three actions that followed —
attach evidence to existing claims, write a depth summary of an actual named research
internship, apply to a specific named summer program — map onto exactly those two named weak
dimensions, not a generic template. This is real, profile-grounded output, not filler.

**A second, real form of continuity exists — worth distinguishing from the reflection
mechanism, not conflating with it.** `e9eba798…`'s two plans both reference the same MIT
checklist and the same Yale Young Global Scholars program, 10 days apart, and plan 2's
*"MIT's deadline is five weeks away with nothing on the checklist started"* reads like
continuity. It is not reflection-driven — no action was ever marked done or skipped between
the two — it comes from `buildStudentAdvisorContext`'s independent, always-fresh reads of
`upcomingDeadlines`/`pendingApplicationRequirements`/`targetUniversities`, which correctly
re-surface an unclosed gap every time regardless of whether the reflection mechanism has
anything to say. A real, working, separate channel — cited here so it isn't mistaken for
proof of the mechanism this document was actually asked to check.

## One related, still-open finding — not new, re-confirmed live

The same regenerate-bug family ([[project_oryn_plan_regenerate_reflection_loss]]) also caused
100 duplicate `avoid_for_now` `ai_recommendations` rows for the founder's own account (2
distinct titles), written every regeneration with no dedup before the 2026-09-01 fix. **The
write-side fix does not touch existing rows, and this was explicitly left for whoever has
write access. Re-confirmed live, unchanged**: the founder's account still carries exactly 100
`avoid_for_now` rows across 2 distinct titles today. `student-context.ts`'s own query for this
data takes the 15 most recent — against a pool that's 100/102 the same two titles, that cap
does very little. If a plan were generated for the founder's account today, the "don't repeat
this" signal Counselor Core feeds the model would be dominated by stale duplicate noise for
this one account specifically, not the diverse recent history the mechanism is built to
provide. Not this pass's to fix (a live write, not code) — flagged as still-live rather than
assumed resolved by the write-side fix landing.

## Gates

Read-only throughout. No plan generation triggered. Two claims verified independently rather
than trusted from the memory record consulted (the delete-scope fix's presence on current
`main`; the 100-duplicate-row founder account still being exactly that today). No code
changed, so no gate beyond confirming this document.
