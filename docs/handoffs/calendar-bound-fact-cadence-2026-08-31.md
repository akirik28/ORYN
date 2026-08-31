# A refresh cadence for calendar-bound annual facts — 2026-08-31

CEO-assigned, following directly from the Ireland investigation
([[project_oryn_university_depth_lane]]): 88% of Ireland's stale requirement rows are CAO
points — a fact that goes stale on a fixed annual schedule, not because anyone was
careless. `lib/acquisition/verification.ts`'s existing `CADENCE_DAYS` model (re-check N
days after last look) doesn't fit that shape and would leave a fact stale for months
before ever firing again. Brief: design and implement the mechanism, use CAO as the first
instance, argue (not assume) what should surface to a student meanwhile, and explicitly
leave the TCD guide and the actual data decision out of this change. No model-backed tool
used — Anthropic API credits are still out.

## 1. The mechanism

Added to `lib/acquisition/verification.ts`, beside `CADENCE_DAYS` rather than in a new
file — same module, same "freshness" concept, one more way to answer the same question:

- **`AnnualCalendarWindow`** — `{ label, month, day }`. One anchor date: the earliest
  point in the calendar year fresh data could exist. Deliberately not a start+duration
  window — a duration would claim more precision about the publication's own spread than
  the sourcing actually supports.
- **`nextAnnualWindowStart(window, after)`** — the next occurrence of that annual date on
  or after a given instant. Pure, no I/O.
- **`isDueForAnnualRecheck(window, retrievedAt, now)`** — true once `now` has reached the
  first window-start that falls *after* `retrievedAt`. This is what fixes the drift: a
  fact checked in March is due the moment *this* year's window opens (August), not 365
  days after March; a fact checked right after last year's window closed correctly isn't
  due again until next year's, regardless of which day inside the window it happened to
  land on.

10 new tests in `__tests__/acquisition/verification.test.ts` cover
`nextAnnualWindowStart`'s year-boundary cases and `isDueForAnnualRecheck`'s drift
scenario directly — the March-check case and the just-after-last-window case are each
asserted both "not yet due" and "due" on either side of the anchor date, so a future
change to the comparison direction (`>` vs `>=`) would fail loudly rather than silently.

## 2. CAO points as the first instance

```ts
export const CAO_POINTS_IE: AnnualCalendarWindow = {
  label: "CAO points (Ireland) — Round 1 offers",
  month: 8,
  day: 25,
};
```

25 August, from three independently-sourced agreements within a two-day span (all
already in the corpus from the Ireland investigation, none newly fetched for this task):
CAO's own official 2026 guidelines state results are allocated "mid-late August each
year"; four separate 2026-08-21 research records (Galway, Limerick, Maynooth)
independently state 2026 Round 1 offers were "not expected until on/around 26 August";
the 2025 precedent is a UCD article on that cycle's Round 1 results published 27 August
2025. 25 August is a day early relative to all three — a re-check attempted a couple of
days before results are actually out just finds nothing new yet (cheap); a fact that
reads as fresh for days after it actually went stale is the expensive direction to get
wrong.

**Demonstrated against real, live data, not just synthetic test dates** —
`scripts/report-calendar-bound-requirements.ts` (read-only, writes nothing, kept in the
repo as a reusable report matching the existing `report:*` scripts): matches the 67
backfilled rows back to their research records, identifies which are CAO points by the
record's own text, and evaluates each with `isDueForAnnualRecheck`. Run just now:

```
Matched 43 live university_requirements rows [to CAO-points research records].
Due for re-check: 43
Not yet due: 0
For comparison, a rolling 365-day cadence... would call 0 of these 43 due today.
```

That's the drift made concrete: all 43 were retrieved 2026-08-21, so a 365-day model
wouldn't reconsider any of them until 2027-08-21 — a full year of sitting on 2025's
numbers even after 2026's were published. The calendar-anchored model correctly flags
all 43 as due, because today already sits past this year's 25 August window.

(43, not the 38 I'd tallied by eye during the Ireland investigation — this script's
matching is systematic against the corpus text rather than a manual read, and is the more
trustworthy count of the two.)

## 3. What should surface to a student meanwhile — argued, not assumed

CEO's lean: show the last known cutoff with an honest label, rather than silence. I agree
with it, and it's not just a lean I inherited — three things in this codebase already
argue for it independently of what the CEO said:

- **Precedent already exists for exactly this shape.** `university_statistics` stores
  `stat_year`-stamped figures and ORYN already displays a dated statistic as informative
  rather than hiding anything not from the current cycle (Cambridge's own admission rate
  in that table is stamped `2025 cycle` and shown, not suppressed for being a year old).
  A CAO cutoff is the same kind of fact — hiding it while showing Cambridge's would be an
  inconsistency in the product, not a safer default.
- **The UI already has the display language for it.** Every sourced card on the
  university detail page already carries `SourceBadge`-style "Checked N days ago" /
  "Recurring — exact year not published" framing (built and shipped earlier tonight for
  deadlines). "CAO points, 2025 cycle: 533 — 2026 figures publish in late August" is the
  same sentence shape, not a new pattern to invent.
- **Silence has a real cost, not just an absence.** A student seeing nothing for a
  competitive programme may reasonably conclude no meaningful threshold exists at all,
  rather than "ORYN doesn't have this year's number yet." A dated fact teaches the
  correct mental model (points recompute yearly); silence teaches nothing.

**Where I'd refine the lean rather than just implement it**: a CAO points fact should
never be allowed to *look* like a current, evaluable requirement — it should be
positioned the way `INFORMATIONAL_CATEGORIES` already positions a deadline
(`lib/requirements/types.ts`): visible, dated, explicitly not something
`evaluateRequirement` produces a Met/Not-met verdict for. Points cutoffs are a different
kind of fact from "IELTS 6.5 required" — a threshold a student can compare themselves
against — and displaying last year's number without that distinction risks a student
reading "was 533" as "needs 533," which the year-old number that produced the biggest
single swing in this exact corpus (UCD Nursing, +34 points in one cycle) shows can be a
real gap. Concretely, I'd recommend: keep the fact visible and dated, but route it
outside the structured evaluation path entirely (an explicit new `requirement_type` or
`evaluation_gate` value, not folded into the existing threshold categories) — informative
context a student reads, never a bar `evaluateRequirement` claims they have or haven't
cleared.

**Not implemented here, on purpose** — the CEO's instruction was explicit: design and
implement the mechanism, leave the data decision to this report. Nothing above resulted
in a code or UI change to what displays; `isDueForAnnualRecheck` only answers "is a
re-check worth attempting," not "what does the student see between checks." That's the
open decision for whoever picks this up next.

## What this explicitly does not cover

- **No requirement row was backfilled, re-marked, or otherwise changed.** Every command
  run in this pass was read-only against the live database.
- **TCD's admissions guide is a separate, smaller problem, not folded in here** — a
  genuinely superseded-feeling document with no actual replacement published, unrelated
  to the CAO points majority this task was about. Noted in the prior Ireland report, not
  re-solved or re-argued here.
- **Nothing is wired into an actual scheduled job.** This is the freshness-decision
  primitive and one worked concrete instance, not a cron/pipeline that acts on it.
  `report-calendar-bound-requirements.ts` is a manual, read-only report — the next step
  (if this direction is taken further) is deciding where "due for recheck" actually
  triggers something, which is a pipeline-ownership decision, not something to guess at
  here.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2771/2771 passed, 185 files — 10 new
tests), `npm run build` all green on branch `oryn/calendar-fact-cadence-2026-08-31`,
branched from `origin/main` post-merge (`140f8dd0`). No model-backed tool used anywhere
in this pass — the CAO evidence was already in hand from the prior Ireland investigation,
and the demonstration script queries the live database directly.
