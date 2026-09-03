# University requirements — depth pass, 2026-09-03

CEO's brief: `university_requirements` covers 111 of 1,019 universities and 32 of 17,046
programs — 0.19%. Rather than widen that thin layer, go deep on a small, relevance-bounded set:
universities already in `target_universities`, plus the obvious targets for this product's
stated corridor (US, UK, Europe, Turkey) at the level a 14–18 year old realistically aims for.
"Depth on twenty institutions a student will actually look at beats a thin layer over a thousand
they won't." Every row needs `source_url` + `retrieved_at`. Explicit reassurance going in:
`structured_rule` is 0 of 1,325 rows product-wide, so nothing staged here can produce a wrong
*evaluated* verdict — the only risk was a wrong *fact*. **Staged, not applied.**

## Scope: 14 institutions, not 20

Selected Warwick, Imperial, METU, Sabancı, Bocconi, TU Delft, MIT, Caltech, Harvard, Princeton,
Boğaziçi, Koç, Oxford, Cambridge — a deliberate mix across the stated corridor (UK: 4, Turkey: 4,
Europe: 2, US: 4) skewing toward institutions genuinely reachable by a strong applicant in this
product's age band, not a prestige list for its own sake. Dispatched 7 parallel research agents,
2 institutions each, each given the exact schema, the 15-value `requirement_category` enum, the
house sourcing convention (verbatim-or-lightly-trimmed quotes, not paraphrase), and instructed to
check existing rows first rather than assume a clean slate.

## What landed: 192 rows (1 dropped, see below)

| Institution | Existing rows (before) | New rows staged | After |
|---|---|---|---|
| Bocconi | 4 | 13 | 17 |
| Boğaziçi | 5 | 5 | 10 |
| Caltech | 0 | 19 | 19 |
| TU Delft | 30 | 13 | 43 |
| Harvard | 20 | 12 | 32 |
| Imperial | 12 | 17 | 29 |
| Koç | 17 | 10 | 27 |
| MIT | 0 | 15 | 15 |
| METU | 11 | 13 | 24 |
| Princeton | 15 | 12 *(13 researched, 1 dropped)* | 27 |
| Sabancı | 9 | 12 | 21 |
| Cambridge | 7 | 22 | 29 |
| Oxford | 6 | 19 | 25 |
| Warwick | 5 | 10 | 15 |
| **Total (these 14)** | **141** | **192** | **333** |

Product-wide, once applied: 1,325 → 1,517 total rows. Universities with ≥1 requirement row:
111 → 113 (only MIT and Caltech are net-new to that count — the other 12 of these 14 already
had *some* coverage, just thin). Programs with ≥1 row: **stays at 32** — every one of tonight's
192 rows is university-wide (`program_id` left `NULL`), consistent with the 6.6%-linkage pattern
already documented in the earlier coverage audit. This was a deliberate choice, not an oversight:
these agents were pulling institution-wide admissions facts (minimum grades, standardized tests,
English proficiency, curriculum rules), and a handful of genuinely course-specific facts (Oxford's
and Cambridge's per-course grade variations, Imperial's per-course UCAT/ESAT/TMUA requirements)
were staged as clearly-titled rows rather than force-linked to a `program_id` that doesn't yet
have a clean 1:1 match in `university_programs`.

The headline coverage percentage barely moves (111→113 of 1,019). That's the correct outcome for
what was asked: this was never meant to move the product-wide percentage — it was meant to make
the 14 institutions a real applicant is actually staring at meaningfully more useful, which it
does (141 → 333 rows, more than doubling depth on this set).

## The collision this task caught: a real duplicate, and a real gap in how I checked for it

Dry-running the first 40-row chunk hit a live constraint violation:

```
ERROR: 23505: duplicate key value violates unique constraint
"university_requirements_university_type_scope_title_idx"
DETAIL: Key (university_id, requirement_type, scope, md5(title))=
(Princeton, international_requirement, '', a014fe823f...) already exists.
```

This index — `(university_id, requirement_type, COALESCE(scope,''), md5(COALESCE(title,'')))
WHERE program_id IS NULL` — never showed up in my earlier `pg_constraint` check, because it's a
`CREATE UNIQUE INDEX`, not a table constraint. Querying it directly confirmed a Princeton row
titled *"The full need of all admitted international students is met the same as it is for
students from the United States"* was already in the table, retrieved 2026-08-21 — nearly two
weeks before tonight. My Harvard+Princeton research agent independently re-found and re-staged
the identical fact from the identical source page.

This mattered more than one dropped row: not every one of the 7 dispatched agents was told to (or
did) check for pre-existing rows before staging — only some batches' scratch files carry an
"Existing: N rows" line. Given that, a single caught collision doesn't prove the other 191 rows
are clean; it just proves the one the dry run happened to hit first. So rather than fix-and-retry
chunk by chunk, I ran a systematic check: computed `md5(title)` in Python for all 193 staged rows
and cross-referenced against every existing `(university_id, requirement_type, md5(title))` triple
for these 14 institutions (139 keys, pulled via one `md5()` query so no title text needed manual
retyping). Result: **exactly the 1 collision already found — nothing else.** The other 191 rows
are genuinely new content despite 12 of the 14 institutions already having non-trivial existing
coverage. The build script (`build_ur_sql.py`, kept in the scratchpad) now does this dedup check
automatically before generating SQL, in case this pattern recurs on a future pass.

## Dry-run: clean

All 192 inserts were dry-run live against the real DB in 5 statement-safe chunks (40/40/40/40/32
rows), each its own self-contained `begin;...rollback;` transaction — zero constraint violations,
zero syntax errors, including the one row with the extra `evaluation_gate`/`recency_rule` columns.
A fresh post-rollback count confirmed the table is back at the 1,325 baseline. Full SQL:
[`data/research/sql-dry-runs/university-requirements/requirements_depth_2026-09-03.sql`](../data/research/sql-dry-runs/university-requirements/requirements_depth_2026-09-03.sql).

## METU's inverted-recency IELTS rule

METU: *"IELTS exams taken on or after 24 December 2022 will not be accepted."* This is the exact
motivating case from `docs/handoffs/requirements-ingestion-design.md` — bounded from **below**
(freshness disqualifies, not staleness). A naive max-age model would invert it and tell a student
their brand-new IELTS certificate qualifies when freshness is exactly what disqualifies it. Staged
with `evaluation_gate = 'inverted_recency'` and `recency_rule =
{"direction":"not_valid_on_or_after","boundaryDate":"2022-12-24"}`, not left as an ordinary row.

## A genuine catch of my own dispatch-prompt error

I told the Harvard+Princeton agent "both reinstated testing requirements post test-optional
years" — true for Harvard, **false** for Princeton, which remains test-optional through the
2026–27 cycle (fall 2027 enrollment) and only becomes required starting 2027–28 (fall 2028). The
agent verified live rather than trusting my framing, flagged the discrepancy explicitly, and
staged both Princeton states as separate rows rather than picking the one I'd implied. No action
needed beyond recording it here — a clean example of the fleet-wide "don't accept a dispatcher's
framing without re-verifying" discipline holding under a case where the dispatcher (me) was wrong.

## Operational note: ku.edu.tr blocks WebFetch specifically, not every tool

The Boğaziçi+Koç agent hit the same WebFetch 403 on every `ku.edu.tr` subdomain already on
tonight's known-blocked-domain list — then tried the Browser tool (real headless Chrome, no
evasion) and it loaded `registrar.ku.edu.tr` cleanly. Worth refining that list going forward:
ku.edu.tr blocks WebFetch, not necessarily every tool.

## A discovery worth flagging, not chasing tonight

`data/research/university-requirements/` already holds ~100 raw-research `.jsonl` files dated
2026-08-21 through 2026-08-31, including dedicated files for several of tonight's institutions —
`us_requirements_harvard_2026-08-21.jsonl` (22 rows), `us_requirements_princeton_2026-08-21.jsonl`,
`us_requirements_caltech_2026-08-21.jsonl`, `uk_requirements_warwick-baseline_2026-09-01.jsonl`,
among many others. A quick look at the Harvard file shows the same kind of verbatim-quoted,
source-linked structure used tonight, with a `research_requirement_id`, `verification_state`, and
detailed `researcher_notes` — clearly a serious prior research pass. Harvard currently has 20
rows in the live table against this file's 22, so it's unclear whether this file was the source of
those 20 (partially converted, or converted then diverged) or an entirely separate, never-applied
batch sitting alongside them. I did not open and reconcile the ~100 files against the live table —
that's a real audit task in its own right, out of scope for tonight's brief, and risked a long
detour this late in the session. Flagging it because if a meaningful fraction of these files were
never converted, that's a much cheaper path to further depth than fresh live research: converting
already-researched, already-source-linked content instead of re-researching from scratch.

## What was not found / genuinely uncertain (preserved per-institution, not smoothed)

- **Boğaziçi**: no published numeric minimum-grade threshold — deferred to an annual Senate
  decision rather than a fixed cutoff.
- **Koç**: exact SAT/ACT/IB/A-Level numeric cutoffs are locked in a force-download PDF; agent
  correctly declined to download without permission (WebFetch also 403'd the same PDF). A Fall
  2026 admissions deadline block found on the same page was already fully lapsed as of today and
  was deliberately not staged as an `application_deadline` row, to avoid presenting a closed cycle
  as current.
- **Oxford**: sampled 5 courses (chosen to span the grade/subject spectrum) rather than every
  course Oxford offers; no verbatim 40-point IB example was found in the pages checked.
- **Cambridge**: sampled 4 courses on the same basis; several third-party aggregator sites that
  surfaced during search were deliberately avoided in favor of Cambridge's own pages.
- **METU/Sabancı**: TR-YÖS percentile/score thresholds found are current-cycle figures, not
  guaranteed stable across admissions years — flagged in the row text itself where the source
  page didn't state permanence.
- **MIT/Caltech**: both institutions' published deadlines (EA/RD, REA/RD) carry no year on the
  source page — staged with an explicit "NO YEAR STATED... treat as annually-recurring" note in
  `requirement_detail` rather than silently implying a specific cycle.
- **Imperial**: the 2026-entry GCSE English equivalent (Grade 5, up from Grade 6 for 2025 entry)
  is flagged in its own row text as a recently-changed policy that should be re-verified per
  cycle, since it's exactly the kind of year-to-year drift this table doesn't yet model.

## Files changed

- `data/research/sql-dry-runs/university-requirements/requirements_depth_2026-09-03.sql` — 192
  `INSERT` statements, staged, not applied.
- This doc.

## Next step

Staged only, per CEO's own framing — no further action needed from me unless CEO/founder wants it
applied, or wants the `data/research/university-requirements/` `.jsonl`-vs-live-table reconciliation
picked up as its own task.
