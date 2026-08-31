# The other 30 historical requirement rows — 2026-08-31

CEO-assigned, following the CAO display task: 67 requirement rows are
`verified_historical`; 37 are now tagged `cao_points_ie`
([[project_oryn_university_depth_lane]]). This investigates the remaining 30 — classify,
find where they concentrate, check pilot overlap. **Report only — nothing in the
database or codebase was changed in this pass**, per the explicit instruction. No
model-backed tool used; every source URL was checked directly (`curl`), every record
read from its own corpus file.

## Classification

Read all 30 from their own research records (`data/research/university-requirements/*.jsonl`)
— not summarized — and checked every unique `source_url` directly. Of CEO's three named
buckets, one didn't materialize at all:

| Bucket | Count |
|---|---:|
| Recoverable — source page still live, describes an annual-refresh pattern | 19 |
| Superseded in principle, no replacement published (TCD-shaped) | 5 |
| **Permanently gone** (programme discontinued, requirement abolished) | **0** |
| *(off-taxonomy findings, below)* | 6 |

**Zero permanently-gone cases.** Every one of the 30 either has a live source that will
plausibly be refreshed, or is the TCD guide case already fully investigated (5 rows, same
PDF, already confirmed byte-identical during the Ireland pass — nothing new to check
here, this bucket is closed, not open). Worth stating plainly since it's a real negative
result, not an oversight: nothing in this batch is dead in the sense CEO asked about.

**All 16 distinct live source URLs checked directly**: 15 return HTTP 200. One
(Tilburg's selection-procedure page) returns 403 to an automated request — the same
class of result as Cardiff's fees page during the earlier corpus vetting: a fetch-access
problem, not evidence the content is gone.

## Three things that don't fit the three-bucket taxonomy, found while classifying

**One is a bug of mine, not a data problem.** `REQ-2026-08-21-IE-UCC-011` (UCC's CAO
Round 1 cut-off ranges) is a genuine CAO-points-outcome record — its own
`researcher_notes` say "Recorded per the standing instruction to treat CAO points as a
competitive outcome, not a requirement" — but the tagging script's text match only
checked `requirement_text` and `limitations`, and this record's only mention of "CAO" is
in `researcher_notes`, which the script never read. It should be among the 37, making the
real total **38**, not 37. Trivial to fix (one row, same script, one more field to
search) — not fixed here, since this pass is report-only, but flagged precisely so it
isn't lost.

**One already has its fix sitting in the table.** `REQ-2026-08-21-STU0018` (Stuttgart's
pre-2026 TOEFL threshold) says so itself: "Superseded by REQ-2026-08-21-STU0019... as of
the source's own stated 2026 cutover." Checked directly: `STU0019` is already
`verified_current` in the live table. Nothing to recover — the current value already
exists, this old row is correctly excluded, and no further action is needed here at all.

**One was already re-researched tonight, by this same lane, without realizing it was the
same fact.** `REQ-2026-08-23-WAR0001` (Warwick's IELTS bands, retrieved 2026-08-23) is
the same fact this session re-researched fresh on 2026-08-31 for the university-depth
pass (Band A/B/C, sourced directly from `warwick.ac.uk`). The old row is superseded by
this lane's own later work, just never reconciled against it.

## A second calendar-bound candidate, found in the same pass

Three records don't read as "stale" in the CAO sense at all — they read as the CEO's own
prediction from the previous task landing early: **"UCAS cycles, ÖSYM's yearly kılavuz,
Studielink deadlines... will not be the only one."**

- `REQ-2026-08-21-UCL0036` / `UCL0037` (UCLA's admit-rate-by-school and GPA-of-admits
  statistics, Fall 2025): the researcher's own limitations call these "HISTORICAL,
  DESCRIPTIVE INSTITUTIONAL STATISTIC[S]" and explicitly say to "treat the Fall 2027 (or
  even Fall 2026) equivalent as current" — UCLA republishes this exact page annually,
  the same shape as CAO points (a competitive outcome, refreshed once a year), just for a
  US institution instead of an Irish national system.
- `REQ-2026-08-21-CMU0056` (CMU's per-college evaluative emphasis): different in kind —
  the researcher's own note says this "is unlikely to be a fact that changes
  cycle-to-cycle... likely still descriptive of current practice," meaning it was
  probably over-conservatively cycle-labeled rather than genuinely stale. Not a
  calendar-bound candidate the way the other two are; flagged separately as a possible
  case for reconsidering how institutional-practice descriptions get dated at all,
  distinct from numeric thresholds.

Not acted on here — surfacing it, since it's exactly the pattern the CEO named as likely
to recur, is the point of this report.

## Where they concentrate

| Country | Count |
|---|---:|
| Netherlands | 8 |
| Ireland | 6 (5 TCD guide + 1 misfiled CAO row) |
| United Kingdom | 5 |
| United States | 5 |
| France | 4 |
| Canada | 1 |
| Germany | 1 |

Not one dominant cluster the way Ireland's CAO points were 88% of that batch. But
**Netherlands is a real, specific pattern of its own**: 8 rows across 5 different
universities (Delft, Erasmus, Tilburg, Amsterdam ×3, Groningen ×2), every one describing
a *numerus fixus* (capped-programme) selection procedure — capacity, ranking weights,
selection-round dates. Not one national exam system like CAO; a shared *admission
mechanism* that several Dutch institutions independently run through the same kind of
annual cycle, so descriptions of its specific parameters go stale together across
institutions for a related but not identical reason. `REQ-2026-08-21-UVA0048`'s own note
states this precisely: "the general one-attempt rule and its mechanism are very likely
evergreen; the specific trigger dates... will shift for future cycles by the same
pattern."

## Pilot overlap

**9 of 30 (30%)** are in the 40-institution pilot — and they cluster exactly where the
country table above points: all 8 Dutch numerus-fixus rows (Delft, Erasmus, Tilburg,
Amsterdam ×3, Groningen ×2), plus Warwick's 1 (already resolved by this lane's own
earlier work, above). Zero Turkish or Italian pilot institutions appear anywhere in this
set of 30.

## What this means for the "package vs. backlog" call

Not a clean fit for either of the options named. The Dutch numerus-fixus cluster — 8
rows, 5 institutions, all pilot, all the same live-page-annual-refresh shape, all
independently confirmed reachable — is a real, coherent, small package: revisiting 5
Dutch selection-procedure pages in one focused pass, not eight unrelated chores. The
remaining 22 (30 − 8 Dutch) are genuinely closer to scattered singles — one or two rows
per institution, 8 different countries, no shared mechanism to batch them by — which
reads as backlog, not urgent, especially with zero pilot institutions among them once the
Dutch cluster and the 3 already-resolved/miscategorized rows are set aside.

So: **a small package for the 8 Dutch pilot rows if this is worth doing now; backlog for
the other 22.** Recommend closing the 3 no-action-needed findings (UCC-011's tag, the
Stuttgart cross-reference, the Warwick dedup) as trivial fixes regardless of what happens
with the rest — none of them need research, just a data correction each.

## Verification

Read-only investigation — no requirement row modified, no code changed. `npm run lint`,
`npm run typecheck`, `npm run test`, `npm run build` all green (nothing to break) on
branch `oryn/other-historical-req-2026-08-31`, branched from `origin/main` post-merge
(`6ce6a37f`).
