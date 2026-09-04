# D4 — university de-duplication: already done, verified against live data

**Assigned:** CEO, migration number 0128, framed as a destructive merge (move dependents off
the losing row, then delete it, prove re-runnable and reversible-in-testing). **Finding:**
that mechanism already exists — `supabase/migrations/0043_university_duplicate_supersession.sql`
(2026-08-22-era work) — and is already correctly applied to all three named pairs (MIT, HKUST,
UCL) plus six more, non-destructively. No migration 0128 is needed. What follows is the
verification trail, not an assumption taken from a code comment.

## Why not the destructive-merge design CEO described

Measured first, per the plan's own rule 5. `information_schema` shows **16 tables** carry a
foreign key to `universities.id`, not the 6 CEO named (`university_requirements`,
`_statistics`, `_sources`, `_deadlines`, `target_universities`, `applications` — the last of
which doesn't even reference `universities` directly, only `target_universities` does).
Missing from that list, found by querying the constraint catalog directly rather than
re-deriving it by hand: `deadline_research_queue`, `program_research_queue`,
`requirement_research_queue` (all `NO ACTION` — a bare `DELETE` on the loser would fail
outright), and `requirement_source_conflicts`, `university_notification_log`,
`university_profile_metrics`, `university_profile_verification_queue`, `university_rankings`
(all `CASCADE` — a bare `DELETE` would silently destroy their data). A migration written
against CEO's 6-table list alone would have either errored live or lost data live, depending
on which of the missing ten happened to have a row.

Migration 0043's own header names this exact risk and its own reason for existing instead of
deleting: *"any automated process that deletes a `universities` row risks silently cascading
away another workstream's data the moment a row it assumed was empty stops being empty."* It
adds `duplicate_status` ('canonical' | 'superseded') and `superseded_by_id` — the loser row is
kept, never deleted, marked superseded, and excluded from listing/search. Additive, reversible
(clear the two columns to undo), and needs no per-table coordination at all — the exact
property the 16-table surface above shows really matters here.

## Verified, not assumed, against `oryn-qa-scratch` (read-only queries only)

**All three pairs CEO named are already superseded, pointing at the winners a fresh
measurement would independently pick:**

| Row | duplicate_status | superseded_by_id |
|---|---|---|
| Massachusetts Institute of Technology | canonical | — |
| Massachusetts Institute of Technology (MIT) | superseded | → the row above |
| The Hong Kong University of Science and Technology | canonical | — |
| The Hong Kong University of Science and Technology (HKUST) | superseded | → the row above |
| University College London | canonical | — |
| UCL | superseded | → the row above |

**Every `canonical_entity_id` with more than one `universities` row (9 total) has exactly one
canonical + one superseded — zero unresolved pairs remain**, confirmed by grouping
`universities` on `canonical_entity_id` directly rather than trusting the audit script's own
38-entry manifest (most of those 38 are canonical-entity-level matches with only one real
`universities` row to begin with — "orphan pairs" in the script's own terms — not a backlog of
un-superseded row pairs; the live grouping query is what actually proves the backlog is zero,
not the manifest's line count).

**MIT's loser row is the one case with any real dependent data** — one `university_statistics`
row, everything else zero. Compared field-by-field against the winner's own stats row: same
admission rate, SAT/ACT ranges, graduation rate, cost, source string, even the same College
Scorecard UNITID — a genuine duplicate write, not conflicting data. Nothing to reconcile.

**The display/search layer already filters correctly.** `lib/universities/canonical.ts`'s
`loadSupersessionMap`/`excludeSupersededUniversities`/`getSupersededUniversityIds` are
consumed by 26 files including `app/(app)/universities/page.tsx` — confirmed directly:
`lib/universities/browse-page.ts` calls `.not("id", "in", supersededIds)` on both its main
browse query and a secondary one. A student was never going to see MIT, HKUST, or UCL listed
twice.

## What genuinely doesn't duplicate-adjust: the measurement, not the product

`lib/universities/data-depth.ts`'s `lacksResearchDepth` is a small pure function over
already-fetched counts — correctly scoped, doesn't need to know about supersession itself.
D3's own 68.8% / 703-universities figure was computed without excluding the 9 known-superseded
rows (D3's own doc says so directly: "not duplicate-adjusted"). Recomputed both ways against
live data, same logic D3 used (confirmed by reproducing D3's own 703 exactly first):

| | count | of | % |
|---|---|---|---|
| Unfiltered (D3's number) | 703 | 1019 | 68.99% |
| Canonical-only (duplicate-adjusted) | 695 | 1010 | 68.81% |

**The percentage is essentially unchanged** (68.8% either way, rounded) — worth stating
plainly rather than overselling this finding: 8 of the 9 superseded rows were themselves
completely empty, so they'd have counted toward "lacks depth" whether included or excluded: 8
in the numerator, 9 in the denominator, nearly cancels out. The **count** most people would
actually read off a dashboard shifts by 8 (703 → 695), which is real but modest. This finding
is precise, not more useful than it actually is.

## What this means for D1/D2's own remaining fill work

D3's own priority list ("skip these five named rows specifically if picking up D1 before
[D4] lands") can be read literally now: **skip the 9 superseded rows, research the 695**.
Filling a superseded row's own depth would be wasted research effort on a row a student can
never independently see.

## Not done here, and why

No migration filed — there is nothing for one to do. No code change to
`lib/universities/data-depth.ts` or `browse-page.ts` — both are already correct; adding a
redundant filter to an already-filtered path would be the same "rewrite what's already
written" mistake rule 5 exists to prevent, just one layer removed. No change to the 38-entry
manifest or the audit script — out of scope for what CEO actually asked, and the live data
already shows the row-level backlog is zero regardless of what the manifest's remaining
entries represent.
