# How many of the 289 visible opportunities have an age/grade restriction that isn't a simple range

CEO's pre-committed rule, stated before this measurement so the count itself decides it: fewer
than 10 rows → no new columns, flag stays, document that the schema can't express it; 10 or more
→ add `age_restrictions`/`grade_restrictions` text columns (mirroring `citizenship_restrictions`/
`residency_restrictions`, migration 0008/0047), CEO assigns the number.

## Method

Three sources, all against the same live 289-row set (`status='active'`, `cycle_status` not
closed/historical/discontinued, deadline not passed):

- **My own 96** (`docs/opportunity-96-partial-eligibility-findings-2026-09-05.md`) — fresh,
  first-hand research today, spot-checked against live pages.
- **Slice A, rows 1–95** (`docs/opportunity-zero-eligibility-slice-a-2026-09-05.md`) — another
  lane's completed research, read directly, not re-fetched by me.
- **Slice B, rows 96–190** (`docs/opportunity-fill-96-190-progress-2026-09-05.md`) — same, a
  third lane's completed research.
- **The 3 all-full rows** — queried directly; all three (Simons, Scholastic Art & Writing, Clark
  Scholars) have a genuinely simple age/grade range. Scholastic's one sub-detail (a Portfolio
  category open only to graduating seniors) is a minor secondary category inside an otherwise
  clean grades-7-12 entry gate, not counted.

The 190 and 3 counts are read from two other lanes' own documentation, not independently
re-verified by me the way my own 96 was — flagged so the provenance is clear. Given the total is
3x the decision threshold, this doesn't change the qualitative answer even allowing for some
margin of error in that reading.

## Count: 31 of 289 (≈10.7%)

| source | count | shapes found |
|---|--:|---|
| My own 96 | 4 | conditional (1), different-system (3) |
| Slice A (1–95) | 12 | different-system (7), tiered/multi-program (5) |
| Slice B (96–190) | 15 | different-system (8), tiered/multi-program (6), derived (1) |
| 3 all-full | 0 | — |
| **Total** | **31** | |

Two more (UChicago Pre-College, Brown University) are suspected multi-program bundles but
without confirmed per-program numbers on file yet — not counted in the 31, since what's measured
here is a **known** restriction with a non-simple shape, not "research incomplete, might turn
out either way."

## Examples, matching CEO's own four categories

- **Conditional**: Wharton Global HS Investment Competition — "16+" applies to the team leader
  role only, not every participant (mine, already flagged).
- **Different system**: UK Year/S-level grades (9 UKMT competitions across both slices plus
  Millfield/Nuffield/Blackstone from mine — England/Wales "Year 12", Scotland "S4", Northern
  Ireland "Year 13" are three different numbers for the same real grade), Hong Kong "Secondary
  N", Italian POLIMI's "second year of high school (or first year in four-year programs)",
  Taiwan's "senior high school" track.
- **Derived**: TISDC's real rule is a birth-date cutoff plus a maternity-leave extension no
  single age integer can capture cleanly ("younger than 30... born after April 27, 1996");
  several rows' real gate is enrollment status ("not yet started university," "within one year
  of graduating") rather than a number at all.
- **Tiered**: University of Toronto, BU Summer Programs, Oxbridge Academic Programs (9 named
  sub-programs, union spans grades 8–12, no single program does), American University (6+
  programs, each with its own band), Cornell Precollege (4 tracks, ages 15–19/16–19/16–18/<18),
  UAL International Summer School (two distinct age cohorts, 11–15 and 16–18, with a described
  gap between them), UCSB (excludes 12th graders specifically, two sub-programs).

## What this excludes, deliberately

Several other flagged rows across both slices are a **different** problem, not this one, and
aren't counted: wrong `official_url` entirely (Bocconi's page is a university-only program,
Universidad de Navarra's two URLs describe two unrelated competitions, Trinity College
Ireland's page has nothing to do with a 14-18 audience), and duplicate catalog entries (Wharton
Data Science Competition vs. Wharton Sports Analytics, same real competition twice). These are
data-integrity issues fixable by pointing at the right source — not a case where the schema
itself can't hold the true value.

## Answer, per the rule set before this measurement

**31 ≥ 10 → add `age_restrictions` and `grade_restrictions` text columns.** Same shape as
`citizenship_restrictions`/`residency_restrictions` (migration 0008/0047): plain text, populated
only when a source states a restriction too complex for the structured columns, read by
`lib/counselor/eligibility.ts` and surfaced to the student as an advisory note, never a hard
exclusion on its own. Waiting on a migration number before writing anything.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
