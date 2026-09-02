# Opportunity data: the decision, on one page

Three staged artifacts from the last two nights of work, no order given yet. This page gives
one. Full technical detail lives in the three source docs, linked at the bottom — this page
duplicates only what's needed to decide and sequence, not to re-derive.

**Nothing here has been applied. No database write has happened anywhere in this chain of work.**

## Bottom line

This is worth doing for **breadth**, not **urgency**. Of the 1,447 lines of research behind
this, only **14 carry a deadline a student could act on soon** (3 in the new candidates, 11 in
the enrichments). The value is a meaningfully bigger, more accurate catalogue — not a pile of
time-sensitive opportunities waiting to expire. Sequence and apply on that basis, not with any
urgency behind it.

## The sequence — backfill first, then re-check candidates, enrichments any time

**1. Backfill (109 rows) → 2. Re-run the candidate dry-run → 3. Apply candidates → Enrichments
whenever, independently.**

**Why backfill first, confirmed against the actual data rather than assumed:** the backfill
fills in `organization` on rows the dedup gate currently can't see. Checked directly: **7 of the
109 backfill targets are also enrichment targets** (Polygence, Lumiere Education, UCSB Research
Mentorship, and four more) — but they touch entirely different columns in every case (backfill
writes `organization`; enrichments propose `deadline`/`cost`/`country`/eligibility fields), so
there's no conflict in applying both to the same row, in either order.

**The concrete reason to backfill before the candidates, beyond "repairs the dedup surface"**:
11 of the 97 new candidates are likely duplicates of already-live rows that the dedup gate missed
*because those live rows have `organization: null`* (2 are exact title matches — Technovation
Girls, The Diana Award). **If the backfill runs first, re-running the real dedup check
afterward will very plausibly catch most of these 11 automatically** — the normal
organization+title match starts working the moment those specific rows have a real organization
value. Applying candidates *before* backfill means someone has to manually exclude all 11 by
hand instead; applying *after* means the code does more of that work correctly by itself. Either
way, **re-run the dry run after the backfill lands — don't reuse the pre-backfill accept/reject
list.** If some of the 11 still show as accepted afterward (a genuinely different program that
happens to share a name), that's real information, not a bug to chase.

## The three artifacts

### 1. Backfill — `data/research/opportunities/organization_backfill_2026-09-02.sql`

- **What it changes**: fills `organization` on 109 existing rows currently `null`. No new rows,
  no rows removed, no other column touched.
- **Cost to apply**: one SQL script, no AI spend, no new tooling — needs to be run directly
  against the database (no existing runner script executes an arbitrary UPDATE batch like this;
  whoever applies it runs the SQL directly).
- **What breaks if wrong**: very little. Every value comes from a `organization`/`organizer`
  field already committed in `data/research/opportunities/*.jsonl` — checked for cross-file
  disagreement before staging (6 of 109 had more than one phrasing on file; all 6 were the same
  real organization under translation or a suffix, not a genuine conflict). Worst case is a
  slightly awkward phrasing on a few rows, not a wrong fact.
- **How to undo**: trivial. Every target row's current value is `null`; reverting is
  `UPDATE opportunities SET organization = NULL WHERE id IN (...)` against the same 109 ids.
  **Lowest-risk artifact of the three.**

### 2. New candidates — `data/research/opportunities/staged_s5s6s7_new_candidates_2026-09-02.jsonl`

- **What it changes**: adds up to 97 new rows to `opportunities` (86 once the 11 flagged
  likely-duplicates are excluded or resolved by the backfill re-check above).
- **Cost to apply**: `npm run ingest:opportunities -- data/research/opportunities/staged_s5s6s7_new_candidates_2026-09-02.jsonl --apply`
  — one command, no AI spend (already decided, not re-extracted), a few seconds.
- **What breaks if wrong**: a wrongly-inserted duplicate is *visible* — it shows up twice in
  Browse/search, looks sloppy, and is easy to notice and fix. This is the safer failure
  direction, and it's why the 11 flagged titles are named rather than silently included or
  silently dropped.
- **How to undo**: `DELETE FROM opportunities WHERE id IN (...)` against the ids the apply run
  reports as inserted. Clean at the database level. The one caveat: once live, a real student
  could see, save, or apply to one of these before anyone notices a problem — undo the row
  quickly if a mistake surfaces, don't leave it live "to think about it."
- **The 11 to exclude if applying before the backfill re-check**: Technovation Girls, The Diana
  Award, Venture & Tech Summer Program (VTSP), Johns Hopkins Center for Talented Youth (CTY) —
  Online Programs, New York Times Learning Network Student Contests, The International Award for
  Young People (Duke of Edinburgh's International Award), Research Girl Scientific Research
  Mentorship Program, and 4 "Journal of..." titles (National High School Journal of Science,
  Journal of Student Research – High School Edition, Journal of High School Science, High School
  Journal of Contemporary Philosophy) — the last 4 are genuinely ambiguous, not confirmed
  duplicates, listed for a human glance rather than automatic exclusion.

### 3. Enrichment proposals — `data/research/opportunities/staged_s5s6s7_enrichment_proposals_2026-09-02.jsonl`

- **What it changes**: proposes field updates (deadline, cost, country, Turkey-eligibility, and
  similar) on 89 *existing* live rows — 11 of them carry a future deadline for a recognizable,
  already-live competition (AMC 8/10/12, HMMT, Breakthrough Junior Challenge, the Wharton Global
  Investment Competition, the Diamond Challenge, the Conrad Challenge, the Blue Ocean
  Competition) whose deadline is currently stale or missing.
- **Cost to apply: this is the one that isn't a single command.** Confirmed at the code
  (`lib/opportunities/ingest.ts:202-204`) — the existing ingest script's duplicate path returns
  `row: null` and discards everything about a matched candidate. **There is no existing script
  that can apply this file.** Someone has to write a small UPDATE-in-place tool before any of
  this can move, however small the change. A few of the proposed field names
  (`turkey_student_access_PROPOSED_NEW_COLUMN`, named exactly that in the data) don't have a
  column yet either — that would need a short migration first for that one field specifically,
  separate from the tooling gap.
- **What breaks if wrong**: this is the highest-consequence artifact per row, not the largest.
  These are edits to rows already live and possibly already trusted by a student — a wrong
  `deadline` value shown here is worse than a wrongly-duplicated new row, because nothing in the
  product currently flags "this value was just changed" for a user to notice.
- **How to undo**: **not staged as cleanly as the other two.** Applying this without first
  snapshotting each target row's pre-update values would make "undo" harder than it needs to be
  — whoever builds the apply tool should capture the old value alongside the new one at write
  time (e.g. into `opportunity_sources` or a dedicated log), not rely on reconstructing it after
  the fact.

## Separate from this decision: a 79-record research backlog

88 of the 197 null-organization rows have no organization recoverable from anything already
committed to the repo. 9 of those look like bad source data on their own merits (a PDF or CV as
the `official_url`, a webinar time string filed as a title) and are a review/disable decision,
not a research one. **The other 79 are real, currently-live programs — Duke TIP, Girls Who Code,
Fordham, and similar — that would need genuine new research to identify an organizer.** Sized
and named here as its own backlog item, not folded into the sequence above, because it has no
dependency on any of the three staged artifacts and doesn't block any of them.

## Full detail, if needed

- [`docs/opportunity-research-staging-2026-09-02.md`](opportunity-research-staging-2026-09-02.md)
  — the 97 candidates and 89 enrichments: classification methodology, the real decision-code
  run, category-mapping confidence, the honest 97→86 correction.
- [`docs/null-organization-dedup-defect-2026-09-02.md`](null-organization-dedup-defect-2026-09-02.md)
  — the 109-row backfill: how the 197 null rows were traced to one 2026-08-18 import, why
  loosening dedup was rejected in favor of fixing `discover.ts`'s missing guard, the full
  backfillable/unbackfillable breakdown.
- [`docs/unmerged-branch-audit-2026-09-02.md`](unmerged-branch-audit-2026-09-02.md) — where this
  research was found in the first place, and why the other 136 branches weren't a chase.
