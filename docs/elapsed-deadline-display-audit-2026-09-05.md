# Elapsed `university_deadlines` display audit, 2026-09-05

CEO's follow-up question, prompted by today's cost-side fix (an undated Peking fee read as
current) and this batch's own repeated finding that Chinese/Korean admission-cycle documents go
stale by publication date. Asked: are elapsed deadlines already live in the DB, where does the
product show them, and — the actual question — does an elapsed date ever look like an upcoming
one? Measure and report; no fix written here.

## 1. How many, live right now

```
university_deadlines rows total:                          470
  elapsed (deadline_date < 2026-09-05):                    186  (39.6%)
  future-dated:                                            124
  recurring_annual_undated (no year, so never "elapsed"):  160

Universities with at least one elapsed row:                 62
  of those, with ZERO replacement on file
  (no future-dated row, no recurring row, for that university): 33
    of THOSE 33, the elapsed row's own type is
    "application" or "early" (not e.g. "scholarship"):      27
```

Named examples of the 27 (most recently elapsed first): Humboldt-Universität zu Berlin (elapsed
2026-08-31 — five days before this audit), University of Geneva (2026-08-15), Koç University
(2026-08-05), Università di Padova (2026-08-02), Dublin City University (2026-08-01), Complutense
University of Madrid (2026-07-20).

## 2. Where the product shows this data — three surfaces checked, all read from `university_deadlines` except one

1. **Homepage "Due soon" widget** — `lib/deadlines/upcoming.ts`'s `getUpcomingUniversityDeadlines`.
2. **University detail page's "Important Dates" section** — `app/(app)/universities/[id]/page.tsx`.
3. **University compare page's "Application Deadline" row** — `app/(app)/universities/compare/page.tsx`.
4. **Application tracker — does NOT read this table at all.** It reads the student's own
   `applications.deadline` (a self-reported/tracked field, Phase 22), a different table
   entirely; `getUpcomingApplicationDeadlines` in the same file as (1) queries `applications`
   directly with its own `.gte("deadline", today)`. Named by CEO as a surface to check; ruled
   out as a distinct risk because it structurally can't inherit this specific bug.

## 3. The actual question: does an elapsed date ever look like an upcoming one?

**No — not on any of the three surfaces.** All three apply the identical `>= today` rule,
computed fresh at request time (`new Date().toISOString().slice(0, 10)`, not a cached or
build-time value):

- `getUpcomingUniversityDeadlines`: `.gte("deadline_date", today)` directly in the Supabase
  query (line 141) — an elapsed row is never even fetched.
- Detail page: `datedDeadlines = actionableDeadlines.filter((d) => isDatedDeadlineUpcoming(d, today))`
  (line 224-226) — explicitly commented as a **documented SEV-1 fix, 2026-08-22**
  (`docs/research/verification/requirements-deadlines-audit-2026-08-22.md`), because
  `verification_state` alone was previously trusted as "actionable," which doesn't cover a date
  that simply passed since the row was last verified.
- Compare page: `soonestApplicationDeadline` (`lib/universities/data-depth.ts:144-161`) applies
  the same `isDatedDeadlineUpcoming` check per candidate row before ever considering it, and
  correctly rolls a `recurring_annual_undated` row forward to its next actual occurrence rather
  than comparing month/day directly against a full date.

This was already fixed, two weeks before this session, not something this audit is surfacing
for the first time — checked the actual code paths rather than assuming from the fix's own
docstring that it covers all three surfaces, since a fix documented for one surface silently
not reaching a sibling surface is exactly this project's own recurring failure shape
([[feedback_integration_defects_only_the_integrator_can_see]] applies here too, on a table
instead of a page — verified all three independently rather than trusting the pattern to have
propagated everywhere it needed to).

## What I found instead: a real, milder, previously-unmeasured inconsistency

Both the detail page and the compare page gate their "no actionable deadline" messaging on
`lacksApplicationDeadline(deadlineTypes)` (`lib/universities/data-depth.ts:56-58`) — which
checks whether an `"application"` or `"early"`-typed row exists **anywhere in the array**,
regardless of whether its date has passed. It cannot distinguish "never researched" from
"researched, now stale" — both read as "not lacking."

For the 27 universities above (an elapsed application/early row, nothing else to fall back on):
`lacksApplicationDeadline` returns `false` (a real row of that type does exist), so:

- **Detail page**: `datedDeadlines` and `recurringDeadlines` are both empty (correctly filtered
  by date) AND `missingApplicationDeadline` is `false` (the type-presence check passed) — so the
  section's own render guard (`datedDeadlines.length > 0 || recurringDeadlines.length > 0 ||
  missingApplicationDeadline`, line 834) is entirely false. **The whole "Important Dates"
  section silently disappears** — no stale date, but also no honest "not confirmed" message,
  for a university that plainly needs one right now (Humboldt's case: elapsed five days ago).
- **Compare page**: same `lacksApplicationDeadline` gate skips the "not confirmed" message for
  the same reason, but then calls `soonestApplicationDeadline`, which — unlike the detail page's
  render guard — re-applies its own date filter internally and correctly returns `null` when
  nothing survives it. The cell renders `NA` ("Not available").

**Same underlying data gap, two different and inconsistent presentations** — one surface goes
fully silent, the other shows an honest-enough "N/A." Neither is the "looks like it's upcoming"
outcome CEO named as the trigger for opening a new task, so that specific trigger isn't met.
But the detail page's silent disappearance is a real, if smaller, gap in its own right: Rule 45
(human-readable errors, not silence) and Phase 43 (every empty state should help the user act)
both argue the detail page should do what the compare page already does for the identical
condition, not what it currently does.

**Not fixed here** — scoped as measure-and-report, and CEO's own framing treated this as a
report-first item ("ölç ve raporla, düzeltme yazma"). If wanted, the fix shape is narrow: give
`lacksApplicationDeadline` (or a sibling check reused by the detail page's render guard) the
same date-awareness `soonestApplicationDeadline` already has, so "an application deadline exists
but every instance of it has elapsed" reads as its own case rather than collapsing into
"covered."
