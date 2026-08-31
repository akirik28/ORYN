# Requirements never carried a real verification_state — 2026-08-31

CEO-assigned, from an incidental finding during the same-day corpus-vetting pass
([[project_oryn_university_depth_lane]]): `lib/requirements/shape-audit.ts` already
documented that `university_requirements` has no "don't show this as current" filter the
way `university_deadlines` does. Brief: build the filter, match deadlines' own semantics
rather than inventing a parallel notion, and report how many existing rows it would
suppress before anything changes on screen.

## The actual root cause is one layer deeper than "no filter"

Before building a filter, I checked what the live column actually holds:

```sql
select verification_state, count(*) from university_requirements group by 1;
-- unverified | 1325
```

**All 1,325 rows, no exceptions.** `AcceptedRequirementRow` (the row `decideRequirement
Ingestion` builds for every insert, in `lib/requirements/ingest.ts`) never set
`verification_state` at all — the field was simply absent from the interface. Every
requirement ever written, by every pathway (the main ingest script, my own 45 rows from
earlier today, the three dated `apply-*-2026-08-23.ts` scripts, all of which reuse the same
function), landed on the column's bare default and stayed there. This is a stricter,
prior problem to the one named in the brief: a filter checking `verification_state` had
nothing real to filter on yet, for any row, ever.

Contrast with `university_deadlines.verification_state`, which is genuinely populated —
193 `VERIFIED_CURRENT`, 140 `VERIFIED_RECURRING_UNDATED`, **101 `VERIFIED_HISTORICAL`**, 26
`unverified`, 5 `VERIFIED_UNDATED` — because `AcceptedDeadlineRow`'s builder does set
`verification_state: record.verification_state` directly. Deadlines' column is free text,
so that direct copy works. Requirements' column is CHECK-constrained to migration 0042's
five lowercase values (`verified_current | verified_historical | verified_derived |
unverified | conflicting` — confirmed against the live constraint, not the aspirational
six-value union in `types/database.ts`, which already includes migration 0059's
`staleness_suspected` even though that migration isn't applied live), so a direct copy of
the research record's own uppercase state (`VERIFIED_CURRENT`, `VERIFIED_HISTORICAL`,
`VERIFIED_UNDATED`, …) would violate the constraint outright. That mismatch — not
indifference — looks like the real reason nobody ever wired this up.

## What was built

**Write side** (`lib/requirements/ingest.ts`):
- `AcceptedRequirementRow.verification_state: VerificationState` — a real field now.
- `mapToRequirementVerificationState()` — maps the research record's state onto the DB's
  five values. `VERIFIED_CURRENT` → `verified_current`, `VERIFIED_HISTORICAL` →
  `verified_historical`. `VERIFIED_UNDATED` → `verified_current`: a fact confirmed true
  with no expiration attached (an eligibility floor, not a dated deadline) is not
  historical — nothing says it has closed — so `verified_current` is the closest genuine
  fit even though the DB has no distinct "undated" value. Anything unrecognized →
  `unverified`, the column's own default — an unmapped value degrades to exactly what
  every row had before this fix, not a guess.
- `decideRequirementIngestion` now sets this on every accepted row. `UNSAFE_VERIFICATION_
  STATES` is unchanged — `VERIFIED_HISTORICAL` is still deliberately NOT refused at
  ingestion, matching `lib/deadlines/ingest.ts`'s own choice for the identical state: land
  the real fact, then keep it out of anything that reads as current. The stale comment
  claiming `VERIFIED_HISTORICAL` "never appears on a requirement record in this corpus" is
  removed — the 2026-08-31 corpus-vetting pass found a live counterexample
  (`REQ-2026-08-22-FI-HEL-001`), which is what started this whole fix.

**Read side** — `NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES` (`lib/requirements/
ingest.ts`, exported): `{verified_historical, conflicting}`. Deliberately excludes
`unverified` — that's the safe default for an ungraded row, not an assertion the fact is
wrong, mirroring deadlines' own set. Applied at every site that reads
`university_requirements` for display or evaluation, matching the exact mechanism
deadlines already use (`lib/deadlines/upcoming.ts`/`scan.ts`'s inline `!SET.has(...)`
filter, not a query-level `.not()`):
- `app/(app)/universities/[id]/page.tsx` — the detail page's own requirement list and the
  "Requirement check" cards.
- `lib/requirements/persist.ts` (`refreshRequirementEvaluations`) — the function that
  actually produces the Met/Not-met/Needs-review verdict shown to a student. Worth being
  precise here: this path already had partial protection via `evaluation_gate` (migration
  0056's `deriveEvaluationGate` already maps a `historical_as_current` shape to the
  `historical` gate, and `evaluateRequirement` already refuses a verdict when a gate is
  set) — so a `VERIFIED_HISTORICAL` row was never going to be silently marked "met".
  What was NOT protected is the raw requirement text itself, still rendered/counted
  verbatim regardless of gate. This fix closes that remaining gap.
- `lib/counselor/state.ts` (`getRequirementCandidateInputs`) — the AI advisor's own
  requirement-derived task candidates. No prior protection here at all; this was the
  highest-consequence gap, since a stale fact reaching the advisor's context could surface
  in generated advice text, not just a database-level detail page card.

Three requirement-writing pathways in the repo (the main ingest script, and
`apply-top5/next10/batch2-2026-08-23.ts`) all construct their row through
`decideRequirementIngestion`, so all three inherit the write-side fix automatically —
nothing else needed changing.

## The number, as asked, before anything changed on screen

**Literal answer: 0 rows suppressed today.** Every one of the 1,325 live rows is
`unverified`, and `unverified` is deliberately not in the non-actionable set — so the
filter changes nothing visible right now. Reporting only that number would be misleading
on its own: it reads as "no problem" when the real finding is "the signal was never
captured for any row, ever," not "the data turned out clean."

**Best-effort backfill estimate**, computed read-only (matched each live row's
`research_record_id` back to a `research_requirement_id` in whatever `.jsonl` files
currently exist in `data/research/university-requirements/`, then ran the new mapping
function against that record's own original state — not applied, nothing written):

- 1,241 of 1,325 rows (93.7%) matched back to a source file still present in the repo.
- Of those 1,241: **1,170 would map to `verified_current`, 67 to `verified_historical`
  (5.4% of matched rows, ~5.1% of all 1,325), 4 to `unverified`.**
- 84 rows (6.3%) didn't match any file currently in the repo — likely from a corpus batch
  that was already superseded or cleaned up since it was applied; genuinely unresolved,
  not estimated as either state.

Not a large number in absolute terms, and not zero either — 67 real, currently-displayed-
as-current requirement facts that a research pass already confirmed closed. A full
backfill (UPDATE the 1,241 matched rows to their correct state) is a separate, bounded
task I have not done — flagging it as a natural next step rather than doing it inside
this same change, since it touches live data rather than adding new capability, and 6.3%
of rows can't be resolved from files currently in the repo at all.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2725/2725 passed, 182 files — 5 new,
targeted tests added: the four state mappings plus the non-actionable set's membership),
`npm run build` all green on branch `oryn/req-verification-state-2026-08-31`, branched
from `origin/main` post-merge (`51f6a468`).

Spot-checked live in the running app (UCL's detail page): existing `unverified`
requirements (all of them, today) still render exactly as before — the filter is additive
and does not regress the feature this session already built.
