# The 79: sample of 15, hit rate, and whether to continue

Assigned: of the 197 null-organization `opportunities` rows
([[null-organization-dedup-defect-2026-09-02]]), 109 are already backfillable from
committed research, 9 are bad source data (not this task), and 79 are real, live-looking
programs needing genuine new research to identify an organizer. Per the brief: sample 15
first, research properly, report the hit rate before touching the other 64.

**No writes.** Every Supabase call this session was a read-only `SELECT`. The staged SQL
is not applied.

## Sample selection

Pulled all 197 null-org rows live, subtracted the 109 IDs already in
`organization_backfill_2026-09-02.sql`, leaving 88. A simple heuristic (PDF url, course-
code-shaped title, timestamp-shaped title) caught 5 of those as clearly bad source data —
not the full 9 named in the prior task's doc, since that characterization came from a
closer read than a regex can do; the other 4 weren't chased down, since sampling from the
remaining 83 rather than a hand-verified 79 doesn't change the method or the result below.
Picked 15 across the actual category mix (summer_program-heavy, a few competitions, one
each of research/academic_program), including deliberately generic titles ("Purdue
University," a marketing-sentence title) to stress-test the method rather than only
picking the easy-looking rows.

## Result: 13 resolved, 1 confirmed dead, 1 genuinely unresolvable — 14/15 successfully determined

| # | Row | Outcome |
|---|---|---|
| 1 | Boğaziçi Lise BOUN 101 | Resolved (BÜYEM) — stored URL is stale, org confirmed from parent site |
| 2 | Duke TIP 2024 | **Dead/renamed** — see below |
| 3 | "Earn college credit..." (SAIC) | Resolved (SAIC) |
| 4 | Girls Who Code | Resolved (self-titled) |
| 5 | Harvard University | Resolved (Harvard Summer School) |
| 6 | Koç KUSRP | Resolved (Koç Üniversitesi) |
| 7 | Purdue University | **Unresolvable** — see below |
| 8 | RSI at MIT | Resolved — **and corrected**, see below |
| 9 | Stanley Prep | Resolved (self-titled) |
| 10 | Young Founders Lab | Resolved — **and corrected**, see below |
| 11 | FRC Türkiye | Resolved (FIRST Robotics Competition Türkiye) |
| 12 | iGEM | Resolved (iGEM Foundation) |
| 13 | Singularity AI Essay Contest | Resolved (Veritas AI) |
| 14 | CTY Online Programs | Resolved — **likely duplicate flagged**, see below |
| 15 | Journal of Emerging Investigators | Resolved (self-titled) |

**Per the brief's own threshold ("if 12 of 15 resolve cleanly, continue; if 4 do, stop"):
14/15 is a clean continue.** The one genuine miss (Purdue) is a data-quality problem in the
source row, not a research failure — no amount of searching from `purdue.edu`'s homepage
identifies which specific program the row meant.

## The two outcomes that aren't the SQL file's UPDATEs

**Duke TIP — dead/renamed, not resolved.** The stored URL now redirects to Duke's current
"Pre-College Programs," whose own page states summer 2026 programming is "managed by
EngageU, a third-party organization" — not Duke directly. "Duke Talent Identification
Program" as a distinct entity doesn't appear to exist under that name anymore. Writing
"Duke University" as the organization would have presented a defunct program as live under
an org that no longer runs it. This is a disable/re-title call, the same category as the 9
bad-source rows from the prior task — arrived at independently, not by re-reading their
list.

**Purdue University — unresolvable, not dead.** The row's title is just the institution
name and the URL is its bare homepage. Nothing on the page identifies a specific program.
"Purdue University" would be technically true and functionally useless for dedup — it
wouldn't distinguish this row from any other real Purdue program. This needs whoever
created the row's original source, not more searching from this URL.

## Two things worth more than the count: real data-quality corrections found along the way

**RSI "at MIT" is not organized by MIT.** It's held at MIT but run by the Center for
Excellence in Education, a separate nonprofit — confirmed on the program's own page. The
row's title implies MIT organizes it; a title-inference approach (explicitly what this
task's brief warned against) would have gotten this one wrong, and a wrong organization
here is the failure mode the brief called worse than a null — it would dedup future MIT-run
research programs against the wrong entity.

**Young Founders Lab's stored `official_url` is a third-party review blog, not the
program's own site.** Found and used the real one (youngfounderslab.org) instead of
inferring anything from the wrong page. Flagging the `official_url` correction too, even
though it's outside this task's organization-only scope — it seemed worth surfacing rather
than silently ignoring.

**CTY Online Programs likely duplicates a row already proposed elsewhere.** The staged
new-candidates batch ([[opportunity-data-decision-2026-09-02]]) names a "Johns Hopkins
Center for Talented Youth (CTY) — Online Programs" title among its 4 unresolved
likely-duplicate flags. This backfilled row is very probably the same program. Not decided
here — surfaced for whoever applies either artifact.

## Recommendation

Hit rate supports continuing to the remaining ~64-68. Holding here per the brief's own
"report before touching the other 64" instruction rather than proceeding unasked, given the
volume involved — ready to continue immediately on confirmation.

## Sources

Every organization value in `organization_research_sample15_2026-09-02.sql` cites its own
program's official page, opened directly, with the access date — see that file's inline
comments rather than duplicating them here.
