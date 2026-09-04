# Opportunity duplicate scan (2026-09-04)

CEO's trigger: the University of Edinburgh duplicate found while computing the night's
closing eligibility measurement — one program had two rows, and 0133's own country-basis fix
landed on the row no student currently sees. CEO's framing: universities were scanned four
independent ways tonight and found zero; opportunities never got the equivalent pass.

That premise needed checking, not assuming — a real duplicate-opportunity sweep already
happened on **2026-09-03** (`oryn/duplicate-opportunity-sweep-2026-09-03`, commit `a164b7e1`,
merged): 421 rows, two methods (fuzzy title/domain/org similarity, and an exhaustive
`GROUP BY official_url HAVING count(*) > 1`), zero new pairs found, 8 already-resolved pairs
confirmed still correctly resolved. This scan is a **re-run against the current 422-row
catalog**, not a first pass — and it found what that one didn't.

## Method

Same exact-URL grouping the 2026-09-03 sweep used (`GROUP BY official_url HAVING count(*) >
1`, all 422 active+disabled rows), re-run because the catalog can drift even without growing
much (421 → 422). Every candidate group read in full — title, organization, description,
eligible_grades/age/country fields — per that sweep's own standing rule: verify identity by
reading text, never trust the URL match alone (its own near-miss, University of Miami vs. UM
Academies sharing one listing page while being genuinely different programs, is exactly why).

Searched **both directions**, per CEO's explicit instruction:
- **Same program split into two rows** (Edinburgh's own shape) — the exact-URL grouping above.
- **One row bundling several distinct programs** (Waterloo/CEMC's own shape, from earlier
  tonight) — a text search over active rows' descriptions for umbrella/multi-track language
  ("umbrella", "different contests/programs", "X tracks", "bundled", etc.), each hit read in
  full to check whether the bundled sub-programs actually carry *different* eligibility the
  row's own single set of structured fields can't represent — not merely different course
  topics under one uniform eligibility, which is common and not a problem.

## Result: 11 exact-URL groups, 3 of them a genuine live problem; 1 genuine bundling problem

### Already correctly resolved — re-confirmed, not re-litigated

Every one of these was already handled (a disabled thin/stale sibling next to an active
current one, or a shared listing page for genuinely distinct programs) — checked directly
against live data, not assumed stable from the 2026-09-03 sweep's own list:

- **SSTP** (`3533791e...` disabled / `418217ec...` active) — on that sweep's own 8-pair list.
- **TechGirls** (`7081b03a...` active / `58d2e707...` disabled) — same list.
- **Boston University** (`4b9f3125...` active / `e03e1172...` disabled) — same list.
- **Oxford Royale** (`6f80e90f...` active / `7cfc009f...` disabled) — same list.
- **University of Miami / Two-week UM Academies** (`1228cff1...` / `889c580c...`, both active)
  — the sweep's own explicitly-verified near-miss: same listing page, genuinely two different
  programs (2-week non-credit bundle vs. 3-week credit-bearing program, different fields).
- **JHU CTY** (`8a302e54...` under_review / `4f668b96...` active) — two different named
  courses sharing one parent listing page, same shape as Miami, already noted by that sweep.
- **UKMT's Cayley/Maclaurin/Hamilton Olympiad trio** and **Grey/Pink Kangaroo** (5 rows, all
  active) — genuinely different UKMT competitions sharing one shared listing page, the exact
  "many real programs, one shared domain" pattern that sweep documented for this organizer.
- **Rockefeller SSRP** (`a29d4ef0...` "SSRP 2023", disabled / `2bbea7da...` "The Rockefeller
  University SSRP", active) — same already-good pattern (year-specific old cycle correctly
  retired next to the current record) as the 8 named pairs, just not on that exact list.

### NEW — three real, live, unresolved split-duplicate pairs

All three share the identical shape: same official_url, same real program, BOTH sides
`status = 'active'`, and — measured the same way Waterloo/CEMC's footprint was measured before
proposing anything — **exactly one side sits in a real student's current top-5, the other in
neither top-5 nor any saved_opportunities row**:

| Program | Visible row (real top-5 count = 1) | Invisible twin (count = 0) | Has real data landed on the invisible twin? |
|---|---|---|---|
| University of Edinburgh Pre-University Summer School | `30436a92` "...International Summer School" | `dc762fce` "...Pre-University Summer School 2026" | **Yes** — `dc762fce` has a real deadline (2026-05-19), a real age bound, and (as of tonight's 0133 country-fill) `country_eligibility_basis`; `30436a92` had none of this until a narrow parity fix was applied a few messages ago (`docs/edinburgh-duplicate-row-parity-fix-2026-09-04.sql`) to close the gap for age/grade-blank but country-basis-fixed. |
| Garcia (Stony Brook, Garcia Center for Polymers) | `d83d7048` "Garcia Summer Scholars" | `a37fa810` "Garcia Summer Research Program" | **Yes** — `a37fa810` carries a real `minimum_age=16` and a real, specific `citizenship_restrictions` value ("International students may apply only if they already hold legal documentation to be in the U.S...") — this is in fact the exact row `lib/opportunities/matching.ts`'s own code comment names as the live-confirmed example for the Package 8 citizenship-prose fix. `d83d7048`, the one a student actually sees, has none of it: every eligibility field null. |
| Lehigh University (Iacocca Global Entrepreneurship Intensive) | `d12506f1` "Lehigh University" | `a7a89e1e` "Lehigh University: Bethlehem, PA" | No — neither row has any age/grade/country data at all. Symmetric duplicate, no differential impact beyond a wasted, redundant catalog slot and (if a student saves/views one) a confusing second entry for the same program. |

**saved_opportunities is 0 for all six rows** — no save-migration concern for any of the three
pairs, same as Waterloo/CEMC's own measured footprint.

**A shared clue across two of the three pairs, not conclusively traced but worth naming**:
`d83d7048` (Garcia Summer Scholars), `d12506f1` and `a7a89e1e` (both Lehigh rows), and
`30436a92` (Edinburgh's own visible-but-empty twin) all carry the *identical*
`updated_at = 2026-09-03 06:28:54.381135+00`, to the millisecond — some batch process touched
all of these specific rows in one transaction that morning, apparently without recognizing any
of them as duplicates of a richer sibling row it didn't also touch. Not independently
confirmed what that process was; flagged as a pattern, not a diagnosis.

### NEW — one genuine "bundled row" problem, Waterloo/CEMC's own shape, the other direction

**Worldwide Youth in Science and Engineering (WYSE)** (`22fb607f-3aab-4320-a737-3531d0b96702`,
active) bundles two real UIUC Grainger College of Engineering programs under one row and one
`eligible_grades = ['9','10','11','12']`:
- **"Exploring Your Options" (EYO)** — a week-long residential camp, described as open to
  rising 9th-12th graders broadly (with an equity-access framing, "invite-focused on students
  from traditionally excluded populations in STEM"), no stated residency limit.
- **"Young Scholars Summer STEMM Research Program"** — a 6-week mentored research program,
  restricted to rising 10th-12th graders **and explicitly only from seven named US states**
  (Illinois, Indiana, Kentucky, Michigan, Missouri, Iowa, Wisconsin).

The row's own `eligible_countries = []` (never researched/confirmed) gives no hint that HALF
of what this row represents has a real, structural, named geographic restriction — a Turkish
or non-Midwest-US student reading this one row has no way to know the Research Program half
specifically excludes them, while the EYO half (per its own description) may not. Same
category of problem as Waterloo's grade-band bundling, but the hidden dimension here is
country/residency, not grade — arguably a sharper case, since eligible_countries being empty
elsewhere in this catalog usually means "never researched," not "definitely open," and this
row's emptiness actively hides a real, known exclusion rather than just an unresearched one.

**Measured before proposing anything**: `saved_opportunities` = 0, real top-5 matches = 0 —
not currently visible to any student. Genuinely latent, not live, unlike the three split
pairs above.

**Checked and ruled out, same bundling question, for completeness** (read in full, not judged
by title alone): Downing College (a prior researcher already corrected this row's own
`official_url` and scope down to one specific track of the college's five, documented
directly in the row's description — already handled, not a live problem); Wall Street 101
("bundled 2-week program plus competition" is a *pricing* bundle, both halves share the same
grades 9-12 audience, not an eligibility mismatch); Northwestern CTD's two tracks (Advanced
Enrichment vs. Accelerated — same grade band 6-12 for both, split by academic
tier/selectivity, not by age/grade/country); several other "N tracks" hits (Andover Summer,
CMIMC, Dive Into Engineering, Emerging Engineers @ UVA, UT Austin WiSTEM, York Helix) — each
describes multiple *subject* tracks under one uniform eligibility, the ordinary and unproblematic
shape, not Waterloo/WYSE's shape.

## Second, independent method — corroborates the three pairs above, finds no new live problem

The exact-URL method only catches byte-identical URLs — matching universities' own D9 scan
used four independent methods precisely because one method has blind spots a second one
doesn't share. Ran two more against all 422 rows:

**Trigram title similarity** (`pg_trgm`, `similarity(a.title, b.title) > 0.35`, same threshold
D9 used) — 100+ candidate pairs, read in full rather than trusted by score, since a bare
generic title ("Pre-College Program," IE University's own, real and specific despite the
vocabulary) trigram-matches half a dozen unrelated programs on shared words alone. After
reading every pair above a genuine similarity floor: no new live "both sides active" pair
turned up beyond the three already found. Confirmed several already-resolved pairs the exact-
URL method also caught (Clark Scholars, RSI at MIT, FRC Türkiye — all three explicitly on the
2026-09-03 sweep's own list) and ruled out real false positives with shared vocabulary but
genuinely distinct eligibility (Wharton's own FBW vs. LBW tracks, UKMT's Senior/Junior team
challenges, the "International ___ Olympiad" cluster, Garcia vs. Simons — the last two already
on the 2026-09-03 sweep's own ruled-out list too).

**Normalized-URL grouping** (strip `https://`/`www.`/trailing slash, lowercase, then the same
`GROUP BY ... HAVING count(*) > 1`) — closes the exact-URL method's real blind spot: two rows
can describe the identical page while differing only in a `www.` prefix, which byte-exact
`GROUP BY official_url` never catches. Found exactly **one previously-uncounted pair**, both
already correctly resolved: **UCSB Research Mentorship** — `647eb8da` "UCSB Research
Mentorship Programs" (active) and `8296f39c` "Research Mentorship Program" (disabled) are the
same `summer.ucsb.edu` page, one with and one without the `www.` prefix; the disabled sibling
is the thin/generic-titled one, same shape as every other already-resolved pair. One more of
the same shape found this way too: **School of the Art Institute of Chicago** (`e9c4cd39`
"Early College Program (ECP)...", active / `07504254` "School of the Art Institute of Chicago
(SAIC)...", disabled) — not previously on any list, but already correctly resolved, not a new
live problem. No new "both active" pair surfaced by this method either.

**Net effect of both additional methods**: stronger confidence the three real pairs (Edinburgh,
Garcia, Lehigh) plus WYSE are the complete set of live problems in the current catalog, not an
artifact of only having looked one way — a second, structurally different method independently
lands on the same three, rather than surfacing a fourth.

## Not done here, per CEO's explicit instruction

Nothing merged, disabled, or split. No SQL prepared this pass — this is the list, the
evidence, and which side of each pair is currently visible, exactly as asked. Decisions
(which row survives each split pair, whether/how to split WYSE) are CEO's.

## Answering the framing question directly

Of tonight's whole opportunity-eligibility body of work, **at least two confirmed instances**
landed research on a row's invisible duplicate twin rather than the one a student actually
sees: the University of Edinburgh fix (this session's own 0133 country-basis work, already
caught and given a narrow parity fix a few messages ago) and Garcia Summer Research Program
(an EARLIER pass, predating tonight — the citizenship-restrictions prose fix `matching.ts`'s
own code comment cites as its live-confirmed example landed on `a37fa810`, not the row
(`d83d7048`) a student in the current visible set actually sees). Lehigh's pair carries no
research to have landed on the wrong side of, since neither side has any.
