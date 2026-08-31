# Building what was argued: a display path for CAO points — 2026-08-31

CEO-approved and assigned: build the presentation path argued for in
[[project_oryn_university_depth_lane]]'s calendar-cadence task — a calendar-bound fact
shown dated, never as a threshold, and structurally incapable of a Met/Not-met verdict.
Scoped to exactly the CAO points rows, not every historical requirement. No model-backed
tool used — Anthropic credits are still out.

## The count needed correcting before anything was tagged

Before touching the database, I re-ran the same text-matching the prior report used and
checked every match's `verification_state` before tagging it — a habit, not a special
precaution for this task. It caught something: of 43 rows whose research record mentions
"CAO" and "points"/"Round", **6 are `verified_current`**, not `verified_historical`.

All 6 are ordinary Leaving Certificate eligibility floors ("Minimum grade H4 in two
subjects...", UCC-003) whose *limitations* field happens to mention CAO or an unrelated
"points"/"Round" in passing — one explicitly says "combine... subjects (not points)
across sittings," talking about matriculation subjects, not a cutoff score. The text
heuristic that found 43 CAO-points rows earlier tonight was matching on stray words in
free text, not the fact's actual shape.

**The real count is 37, not 43** — every genuine CAO-points-outcome record in the Irish
corpus was independently confirmed `VERIFIED_HISTORICAL` during the Ireland investigation
with no exceptions, so requiring that state is a real filter, not an arbitrary
tightening. Reported here plainly, the same way the 38→43 correction was reported
earlier tonight: a number checked against the data is worth more than one defended.

## What was built

**Migration 0071** — `university_requirements.calendar_bound_fact_class`, nullable,
CHECK-constrained to `'cao_points_ie'` today. A new, dedicated column, not a reuse of
`verification_state` or `evaluation_gate` — neither of those can distinguish "this
specific historical row is a calendar-bound fact" from "this is an ordinary stale fact,"
and overloading either would mean two different concerns sharing one column, which is
exactly the kind of near-duplicate the CEO's own instruction was warning against ("erodes
when someone later tidies up two similar-looking paths"). `verification_state` and
`evaluation_gate` are untouched — read by this migration and the tagging script that
follows it, never written.

**`scripts/tag-cao-points-requirements.ts`** — tags exactly the 37 genuine rows (dry-run
by default, `--apply` to write). Live result: **37/37 tagged, 0 failures**, 6 false
positives correctly excluded and logged, not silently dropped.

**The type-level enforcement** — `lib/requirements/calendar-bound.ts`'s
`CalendarBoundFactDisplay` carries `id`, `factText`, `sourceUrl`, `retrievedAt`,
`nextCheckLabel`. No `RequirementEvaluationStatus`. No reasoning field. Nothing
`evaluateRequirement()` produces or `RequirementEvaluationBadge` reads. This is the
"impossible, not discouraged" the CEO asked for: `CalendarBoundFactList`
(`features/universities/calendar-bound-fact-card.tsx`) is typed to accept only this
shape, so it has nothing to render a verdict *from* — a future edit that tried to merge
this with the ordinary requirement card would have to change the data shape first, not
just wire up an existing prop.

**`factText` is the row's own verbatim `requirement_detail`, never reformatted.** Every
genuine CAO row already states its own cycle year and figure in its own words ("2025 CAO
Round 1 points for DN400 Medicine: 738"). Parsing a number back out of free text to build
a templated sentence was considered and rejected — real variety in the source text ("533
(Round 1); 522 (Round 2)", "N/C (New Course)", "728\*") makes that a real risk of
distorting a figure, which is the wrong kind of error to introduce while building a
safety feature. `buildNextCheckLabel` is the only synthesized text, and it needs no
number extraction — it's computed purely from `retrieved_at` via `nextAnnualWindowStart`.

**`buildNextCheckLabel` says a different thing depending on which side of the window
`now` sits on**, and getting that direction wrong would be a real bug, not a wording
nicety: "the next figure is expected around X" (forward-looking, window still ahead) vs.
"a fresher figure was expected around X — not yet re-checked, so it may already be
published" (backward-looking, window already passed). Tested explicitly on both sides of
the boundary, including the exact case that matters today: retrieved 2026-08-21, checked
now (past the 25 August window) — reads as overdue, never as still-pending.

**Turkish sentence not shipped, on purpose.** Checked first: `app/(app)/universities/
[id]/page.tsx` and every component under `features/universities/` have zero
`useTranslations`/`getTranslations` usage today — the i18n lane's own pattern currently
covers app-shell/navigation chrome only (`nav.universities` is the only university-
related key in `messages/en.json`), not page content. Per the CEO's own conditional
("if the i18n lane's pattern reaches that file cleanly") — it doesn't, so wiring in a
one-off translation for just this sentence would be inventing a second convention rather
than following theirs. The English string ships; the CEO's own Turkish phrasing is kept
verbatim as a doc comment on `buildNextCheckLabel` for whenever the i18n lane's pattern
does reach this page.

## What it looks like on TCD and UCD — live, not described

**Trinity College Dublin** (`/universities/ff8cefad-48bc-4538-b8dc-422adbf4ca37`): a new
"Recent admissions data" section appears below "Requirement check", disjoint from it —
checked the requirement section directly and confirmed no CAO text or Met/Not-met badge
appears there. First entries as actually rendered:

> **Past cycle** — 2025 CAO End-of-Season (final round) minimum entry points for TR051
> Medicine: 739. Note: assessed via HPAT Ireland test plus Leaving Certificate results;
> marked R... This is the score of the last student actually offered a place that
> season, NOT a published minimum entry requirement.
> A fresher figure was expected around August 2026 — not yet re-checked, so it may
> already be published.
> Checked 11 days ago · Source

**University College Dublin** (`/universities/a4b19944-a2f8-4400-af65-2dd8629ac8ee`):
same section, same shape:

> **Past cycle** — 2025 CAO Round 1 points for DN230 Actuarial and Financial Studies:
> 613. unchanged from 2024. This is the score of the last student offered a place in
> Round 1, NOT a published minimum entry requirement.
> A fresher figure was expected around August 2026 — not yet re-checked, so it may
> already be published.
> Checked 11 days ago · Source

UCD's `Requirement check` section, confirmed unchanged directly: still shows its real,
current IB policy threshold (24+ points, named subject requirements) exactly as it did
before this task — this feature is additive, not a replacement for what already worked.

## What stayed suppressed, on purpose

The other 30 historical requirement rows (67 total historical − 37 tagged) are untouched
— not tagged, not surfaced, filtered out of the normal list by the existing
`NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES` exactly as before. Verified directly:
`verification_state` counts are identical to before this task (1,170 current / 88
unverified / 67 historical) — only the new, additive `calendar_bound_fact_class` column
changed, on 37 rows, nothing else.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2807/2807 passed, 186 files — 8 new
tests for `calendar-bound.ts`, 2 existing fixtures updated for the new required field, 1
migration-count guard bumped 70→71, the same expected maintenance this test's own comment
already documents), `npm run build` all green on branch
`oryn/cao-calendar-display-2026-08-31`, branched from `origin/main` post-merge
(`d9334b45`). Live-verified on both universities the CEO asked about, not just described.
