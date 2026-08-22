# FEAT-2 multi-axis status audit — 2026-08-22

Package 8. ORYN-CEO asked FEAT-2 to audit its territory for the same problem the research
org found in four columns today: a single enum field forced to represent what is actually
two (or more) independent real-world axes at once, losing one when it picks a value for
the other. The sharpest instance named directly: `opportunities.cycle_status` needing
`closed` and `date_not_announced` simultaneously.

**Status: in progress, pushed incrementally per the founder-driven instruction that six of
thirteen sessions ended without warning this afternoon — favor work that survives an
abrupt ending, push after every meaningful step rather than at package close.** This
document will be extended in place as the audit continues; each section below is already
independently useful if the session stops here.

Audit only — nothing fixed. Findings below, ranked, for CEO to sequence.

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

## Not yet checked (this document will be extended)

- `saved_opportunities.status` (`saved/applied/not_interested`) — same rough shape as
  applications/target status; not yet traced to a concrete downstream consumer the way
  monthly-review.ts was for applications. Worth the same treatment before closing this
  audit.
- `ActionStatus` (`weekly_actions.status`) — briefly considered; the candidate second axis
  ("was in progress when it expired" vs. "never started, then expired") reads as a weaker,
  softer instance than the two confirmed above — two flavors of one terminal state rather
  than two independent facts a downstream reader actually needs simultaneously. Related to
  but distinct from this territory's already-recorded finding (the
  `docs/feat2-loop-audit-2026-08-22.md` addendum: `updateActionStatus` has no transition
  validation at all) — that's about unconstrained *transitions*, this audit is about
  whether one field can represent the truth at a single moment. Needs a firmer verdict
  before ranking, not yet reached.
- `lib/admissions/outlook.ts` and any other consumer of `ApplicationStatus`/`TargetStatus`
  beyond monthly-review.ts, to see how widely the accepted-then-withdrawn loss actually
  propagates.
