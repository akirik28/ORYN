# FEAT-2 multi-axis status audit — 2026-08-22

Package 8. ORYN-CEO asked FEAT-2 to audit its territory for the same problem the research
org found in four columns today: a single enum field forced to represent what is actually
two (or more) independent real-world axes at once, losing one when it picks a value for
the other. The sharpest instance named directly: `opportunities.cycle_status` needing
`closed` and `date_not_announced` simultaneously.

**Status: complete.** Pushed incrementally in two steps rather than only at package close,
per the founder-driven instruction that six of thirteen sessions ended without warning
this afternoon — favor work that survives an abrupt ending. The first push (two confirmed
findings, three items still open) would have stood on its own if the session had stopped
there; this revision closes out the remaining three checks and adds the ranked summary.

Audit only — nothing fixed. Three findings below, ranked, for CEO to sequence.

## Confirmed: the named instance, and why it's specifically FEAT-2's problem to report

`opportunities.cycle_status` (`types/database.ts:1375`): `"open" | "upcoming" | "closed" |
"date_not_announced" | "historical" | "discontinued" | "unverified"`. This conflates two
genuinely independent axes into one enum:

- **Axis A — lifecycle position of the cycle we know about**: open / upcoming / closed /
  historical / discontinued.
- **Axis B — whether we know the next cycle's date at all**: date_not_announced /
  unverified.

A real, common situation needs both facts at once: *last cycle's deadline has passed
(closed) AND we don't yet know when the next cycle opens (date not announced)*. The
schema can only hold one, so ingestion has to pick — and whichever it picks, a downstream
reader loses the other fact. This isn't a table FEAT-2 owns (research/data-acquisition
territory), but the consequence lands in `lib/opportunities/lifecycle.ts`'s
`isOpportunityActionable` and — via it — directly in FEAT-2's own deadline engine
(`lib/deadlines/upcoming.ts`, `lib/deadlines/scan.ts`, fixed in Package 2/PR #29): a row
that's actually "closed, next cycle TBD" gets a single label, and whichever one it is,
the deadline engine's "Due soon"/notification logic can only reason about the axis that
survived. Documented here as confirmation of the named instance and its concrete effect
on my territory's own code; not something I can fix (schema + ingestion behavior belong to
research org / whoever owns `opportunities`), so recording it rather than acting
unilaterally, consistent with how #38's `achievement-section.tsx` finding was handled.

## Confirmed in FEAT-2's own tables: `ApplicationStatus` / `TargetStatus`

`ApplicationStatus` (`applications.status`) and `TargetStatus`
(`target_universities.status`) — both mine — share the identical shape:
`not_started/exploring → ... → accepted | waitlisted | rejected | withdrawn`. Same
conflation, a different pair of axes:

- **Axis A — the institution's decision**: accepted / waitlisted / rejected (or no
  decision yet).
- **Axis B — the student's own choice to continue**: withdrawn (can happen at any point —
  before a decision, or *after* being accepted and choosing not to attend).

These are independent. A student can be accepted and then withdraw (chose a different
school); the current single-enum design has no way to represent "accepted, then
withdrawn" — setting status to `withdrawn` overwrites whatever decision was there,
silently discarding the fact that the institution said yes.

**This is not hypothetical — found a real, live consumer that already gets it wrong as a
direct consequence.** `lib/scoring/monthly-review.ts:48`:

```ts
supabase.from("applications").select("id", { count: "exact", head: true })
  .eq("user_id", userId)
  .in("status", ["submitted", "under_review", "accepted", "waitlisted", "rejected"])
  .gte("updated_at", since)
```

`withdrawn` is deliberately excluded from this list — presumably written with "withdrew
before a decision" in mind. But a student who was **accepted** and then withdrew (a real
success, arguably the single most positive outcome the Monthly Review could report) drops
out of this count entirely the moment they record the withdrawal, because the enum can no
longer show they were ever accepted. The Monthly Review's "Applications submitted" count
(Phase 40's own example output names "Applications submitted: 2" as the kind of number
this feature exists to report) silently undercounts real acceptances specifically in the
one case a student is most likely to want reflected accurately.

**Not a total, permanent loss — but not a real mitigant either, worth stating precisely
rather than overclaiming.** `updateApplicationStatus` (`app/(app)/applications/
actions.ts`) logs `application_updated` to `product_events` on every transition,
including the "accepted" one before a later "withdrawn" overwrites the live column — so a
raw history trail technically exists. But `product_events` is explicitly framed (Phase 52,
PHASE_STATUS.md) as internal instrumentation with no user-visible payoff, isn't exposed in
any UI, and `lib/scoring/monthly-review.ts` — like every other product surface — reads the
live `applications`/`target_universities` tables, not the event log. Functionally, from
every surface a student or Oryn's own reasoning can actually see, the acceptance is gone
the moment `withdrawn` is recorded.

## Checked, not found — negative results worth recording

Per org rule 20 (state what a verdict does and doesn't cover) and this audit's own
standard: checked every other enum in FEAT-2's territory for the same shape.

- **`RequirementStatus`** (`not_started/in_progress/completed/not_applicable`) — one
  clean progress axis; `not_applicable` is a fourth state on that same axis, not a second
  dimension. No conflation found.
- **`ReflectionOutcome`** — one categorical axis (how an action went). No second
  dimension competing for the same field.
- **`GoalStatus`** (`active/achieved/abandoned`) — sequential, single axis. No conflict
  found; a goal being both "achieved" and later "abandoned" for unrelated reasons is a
  stretch, not a real instance.
- **`TimeBudget`** — a single quantity bucket. Not applicable.
- **`university_deadlines.verification_state`** (read-heavy in my deadline engine, not
  owned by FEAT-2) — checked specifically because it looks superficially similar to
  `opportunities.cycle_status` and even has a `CURRENT_CYCLE_NOT_PUBLISHED` value that
  looks like `date_not_announced`'s twin. **Genuinely different shape, not the same bug**:
  `university_deadlines` is one row per dated deadline event, not one row per program —
  so "last cycle's deadline, now historical" and "next cycle confirmed not yet published"
  can coexist as two separate rows rather than needing to share one field. The row-based
  model already avoids the conflation `opportunities.cycle_status`'s single-row-per-program
  design falls into. Worth naming as a positive contrast: this table solved the same
  underlying problem correctly, elsewhere in the same codebase.

## Remaining checks, completed

- **`saved_opportunities.status`** (`saved/applied/not_interested`) — traced every
  consumer (`lib/opportunities/matching.ts`, `lib/opportunities/persist-matches.ts`, the
  opportunities pages/actions/cards). **Clean, no conflation.** These three values sit on
  one genuine decision axis (interested → did it, or decided against) — unlike
  applications/target status, there's no independent second fact (like "was I ever
  accepted") competing for the same field. `not_interested` doesn't overwrite a prior
  institutional decision the way `withdrawn` does, because opportunities don't have one.
- **`ActionStatus`** (`weekly_actions.status`) — firmer verdict reached: **a real,
  structurally identical risk, but not a currently-live bug**, because `skipped`/
  `expired` are unreachable today (no UI sets `skipped`, no scheduler sets `expired` —
  confirmed in Package 1's audit and still true). The moment either gets built (Package 1's
  ranked item #5), the same shape applies: `expired` would overwrite whatever the action's
  progress axis held (`not_started` vs. `in_progress`), losing whether the student had
  actually started before time ran out — information Phase 10's reflection loop would
  plausibly want (an untouched action and an abandoned-mid-progress one are different
  signals for what to recommend next). Distinct from this territory's already-recorded
  finding (`docs/feat2-loop-audit-2026-08-22.md`'s addendum: no transition *validation*
  exists) — that one is about unconstrained movement between states; this one is about
  whether a single field can hold the truth at all once movement happens. **Recommendation:
  whoever builds the `skipped`/`expired` UI (ranked item #5) should design the schema
  change alongside it** (e.g., a separate `had_progress` boolean, or promoting `expired`
  to a modifier on the progress axis rather than a fifth sibling value) rather than
  building the UI first and hitting this same conflation live, the way `applications`/
  `target_universities` already did.
- **`lib/admissions/outlook.ts`** and the rest of the codebase — grepped for every
  consumer of `ApplicationStatus`/`TargetStatus` beyond `monthly-review.ts`. Admission
  outlook itself doesn't read either (it computes from profile scores + institutional
  selectivity, independent of the student's own application status) — the loss doesn't
  reach that surface. `lib/deadlines/{upcoming,scan}.ts`'s `ACTIVE_TARGET_STATUSES` filter
  reads `target_universities.status` too, but only to decide whether to keep surfacing
  deadline reminders — correctly stops reminding once a target reaches `accepted`/
  `withdrawn`/etc., regardless of which; the conflation doesn't affect that read.
  `monthly-review.ts` remains the one confirmed live consumer where the lost fact
  actually produces a wrong number.

## Ranked summary

1. **`ApplicationStatus`/`TargetStatus` (`accepted` → `withdrawn` loses the acceptance) —
   live, verified, one concrete wrong number today** in Monthly Review's "Applications
   submitted" count. Mine to fix (both tables, both consumers, are FEAT-2 territory).
   Smallest real fix: a separate boolean or timestamp (`was_accepted`/`accepted_at`) set
   once on the `accepted` transition and never cleared by a later `withdrawn`, independent
   of the live `status` column — same shape as how `evidence_status` avoids re-conflating
   "verified" with later edits elsewhere in this codebase. Not attempted in this package
   (audit only, per instruction); ranked #1 for whoever sequences the next fix package.
2. **`opportunities.cycle_status` (`closed` vs. `date_not_announced`)** — the named
   instance, confirmed with concrete effect on FEAT-2's deadline engine, but the table
   itself isn't mine. Recording for whoever owns `opportunities`' schema; FEAT-2's own
   consuming code (`isOpportunityActionable`, Package 2's fix) already does the best it
   can with the single value it's given.
3. **`ActionStatus`'s latent `expired`-vs-progress conflict** — real, same shape, but not
   live yet (the states are unreachable). Lowest urgency of the three precisely because
   nothing is wrong *today* — flagged so it's designed in from the start rather than
   retrofitted, when `skipped`/`expired` UI work eventually happens.

`saved_opportunities.status`, `RequirementStatus`, `ReflectionOutcome`, `GoalStatus`,
`TimeBudget`, and `university_deadlines.verification_state` — all checked, all clean,
recorded above as negative results rather than left unstated.

Audit complete. Nothing fixed — three findings ranked for CEO to sequence, consistent
with how this territory has handled every cross-boundary or schema-shaped finding today
(#29's cycle_status guard was the one exception, and only after explicit escalation and
ruling).
