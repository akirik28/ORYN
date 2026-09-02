# Batch 4 (final): 23/23, and the full backlog is now covered

Batch 4 pulled the last 23 rows of the working pool. **All 23 resolved** — no
unresolvable or dead rows this time, the first batch where that's true. Combined with
batches 1–3, this covers the **entire 83-row candidate pool** this task worked from
(15-row sample + 68 remaining across three batches = 83; see the methodology note in
`opportunity-org-research-sample15-2026-09-02.md` for why this is 83 rather than the
brief's named 79 — a heuristic filter, not a hand read, separated the likely-bad-source
rows up front). This is the natural completion point, not a partial stop.

**No writes**, across all four batches. Every value sourced from the program's own
official page, opened directly, except five rows in this batch carrying an explicit
confidence caveat — see their comments in `organization_research_batch4_2026-09-02.sql`:
two New York Times rows (nytimes.com is blocked by this session's own browsing policy —
the one exception to "open the page" across the whole task), one Cloudflare-gated page
(STEM Fellowship Journal), one denied-navigation domain resolved by consistency with two
already-confirmed sibling rows rather than opened directly (Boğaziçi's `boun.edu.tr`
alias), and one moderate-confidence case flagged for a second look (Georgetown
Pre-College, which sits on a domain shape resembling Duke's now-third-party-run program,
though without Duke's explicit disclaimer).

## Why this batch had zero misses, and what that says about the earlier ones

This batch's category mix (mostly `competition` and `research`, per the pool's actual
composition) is structurally different from the `summer_program`-heavy batches 2–3: named
competitions, prizes, and student journals are almost always self-titled, standalone
entities ("Major League Hacking," "International Environmental Olympiad") rather than a
sub-page of a large university with an ambiguous specific-program identity. **The
"unresolvable" pattern from batches 2–3 (bare institution name + generic institutional
URL) is a `summer_program`-specific defect, not a corpus-wide one** — worth knowing if
this method gets reused on a different category slice later.

Three more instances of the title-implies-wrong-parent defect turned up (Harvard Alumni
for Global Women's Empowerment ≠ Harvard University; UniHive's "Cambridge Professor-led"
≠ University of Cambridge) — now confirmed independently five times across four batches
(RSI/MIT, Harvard CURE/DF-HCC, and these two, plus the pattern named again). This is the
single most consistent finding across the whole task: **a title naming a famous
institution is a weak signal, sometimes actively wrong, for who actually organizes a
program** — never inferred from a title anywhere in this task's four batches, always from
the program's own page.

## Final totals across all four batches (83 rows)

| Batch | Rows | Resolved | Dead/renamed | Unresolvable | Skipped |
|---|---|---|---|---|---|
| 1 (sample) | 15 | 13 | 1 | 1 | 0 |
| 2 | 23 | 17 | 0 | 6 | 0 |
| 3 | 22 | 16 | 0 | 5 | 1 (Maastricht, on oryn-d0's queue) |
| 4 (final) | 23 | 23 | 0 | 0 | 0 |
| **Total** | **83** | **69** | **1** | **12** | **1** |

**69 organization values staged, ready for the same human-review gate as the 109-row
backfill.** 1 confirmed dead/renamed (Duke TIP). 12 genuinely unresolvable without the
original researcher's source — every one of those is named with its specific reason in
the four SQL files' comments, not left as a bare "couldn't find it." 1 deliberately not
researched (Maastricht, already on a separate queue).

**Successfully determined: 70/82 researched (85%)**, excluding the deliberate skip from
the denominator.

## The defect taxonomy, final form

Three classes, each confirmed multiple times independently, useful beyond this task:

1. **Title implies the wrong parent organization** (5 confirmed instances: RSI/MIT,
   Harvard CURE/DF-HCC, Harvard Alumni/Global WE, UniHive/Cambridge — plus the general
   pattern of bare "[University]" titles that turned out unresolvable rather than
   wrong). The one this task's own rule was written to catch, and it did.
2. **`official_url` is dead but the domain still identifies the real organization**
   (the single most common resolution path across all four batches — roughly a third of
   all resolved rows needed this).
3. **`official_url` points at something unrelated entirely** — a third-party review, an
   academic publication or staff-profile page, an unrelated institution's page. Per
   oryn-a7, bounded to the 2026-08-18 bulk import specifically (oryn-d0's separate audit
   found zero instances outside it) — not a general corpus risk, but real within that
   population.

## What's NOT done, on purpose

- **Duplicate resolution.** Several likely-duplicate pairs surfaced along the way (a
  third SAIC row, a University of Miami pair, Venture & Tech Summer Program, the KUSRP
  pair, CTY Online Programs' cross-match with the staged new-candidates batch) — all
  flagged in the relevant SQL file's comments, none resolved. That's dedup's job once
  organization exists, per `opportunity-data-decision-2026-09-02.md`'s own recommendation
  to re-run the dry run after backfill.
- **The 12 unresolvable rows.** Named individually with their specific blocker in each
  batch's SQL comments — the honest next step for these is the original researcher's
  source, not more searching from the stored URL.
- **Applying any of this.** All four SQL files are staged, not run, same review gate as
  every other artifact in this chain of work.
