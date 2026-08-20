# Data batch — status/verification consistency fix + duplicate resolution

Applied 2026-08-20 to `qtcvcflzxbuagvvwahhu` via `SUPABASE_SECRET_KEY` (admin client, same
mechanism as every other batch in this directory). Two distinct fixes, both live-verified
via `npm run audit:recommendation-readiness` / direct query before and after.

## Status/verification inconsistency (8 rows recovered)

`lib/opportunities/browse.ts`, `persist-matches.ts` (which feeds `opportunity_matches`, which
`lib/counselor/state.ts` reads from), `lib/entities/search.ts`, and `lib/search/index.ts` all
filter `.eq("status", "active")`. A record can be fully `verification_state='verified_current'`
and still be invisible everywhere a student can reach if `status` is still `'under_review'` —
these are independent columns and nothing keeps them in sync automatically.

Found 8 such rows, all from this session's own three earlier verification batches (economics-
business, social-science-humanities, STEM) — those batches updated `verification_state`,
`cycle_status`, `fields`, `cost`, etc. but never touched `status`, and all 8 happened to still
carry `status='under_review'` from the original Drive-corpus import:

Baltic Sea Philosophy Essay Event (BSPEE), Zero Robotics, The Diamond Challenge, Blue Ocean
Competition, Conrad Challenge (Space Center Houston), Waterloo Mathematics and Computing
Contests, Battle Code MIT, Penn Apps.

Fix: `update opportunities set status = 'active' where status = 'under_review' and
verification_state = 'verified_current'`. Non-destructive, reversible, matches how `status`
is already used elsewhere (e.g. the Conrad Challenge duplicate below). **Any future
verification batch must set both `verification_state` and `status` together** — noted here so
this doesn't recur.

Effect: opportunities reachable by a student (`status='active' AND
verification_state='verified_current'`) went from 72 to 80.

## Duplicate resolution (3 pairs, all disabled via existing `status='disabled'` mechanism)

Found via a domain+title-similarity pass (group by `official_url` hostname, Jaccard word-
overlap within each domain group ≥ 0.6) — not title-only, per the explicit requirement not to
dedupe on title alone. 6 candidate pairs surfaced; 3 were deterministic (same real program,
same domain, essentially the same official page), 2 involve Immerse Education's own multiple
genuinely-distinct offerings (left alone — see Open Question below), 1 (Phillips Exeter
Academy variants) needs human review, not resolved here.

Disabled (loser id in parens), canonical row kept as-is:
- **Diamond Challenge** (`cb1ae3e2-...`) — duplicate of **The Diamond Challenge**
  (`30a605ab-...`, already researched this session, see
  `2026-08-19-economics-business.md`). Same domain (`diamondchallenge.org`), same deadline
  (2027-01-14) on both rows, kept the row pointing at the specific `/competition/` page.
- **RSI (Research Science Institute) at MIT** (`b2246380-...`) — duplicate of **Research
  Science Institute (RSI)** (`d5e774ed-...`). Same organizer domain (`cee.org`), same real
  program (CEE-run, hosted at MIT); kept the row categorized `research` (more accurate than
  the loser's `summer_program`). Neither row is `verified_current` yet — disabling a
  duplicate doesn't require the surviving row to be verified first, it's independent of the
  content-verification pass.
- **Clark Scholars Program** (`676bc788-...`) — duplicate of **Anson L. Clark Scholars
  Program** (`4fe18f68-...`, already `verified_current`). Same domain
  (`depts.ttu.edu/clarkscholars`), kept the verified row.

## Open finding, not resolved this pass — bare institution-name rows

14 opportunity rows have a title that's essentially just an institution name + location
("Carnegie Mellon University (PA, USA)", "Cornell University", "University of Chicago
Chicago, IL", "Phillips Exeter Academy", ...) rather than naming an actual program. Some sit
in the same `official_url` domain group as a real, specifically-named program from the same
provider (e.g. `precollege.brown.edu`: "Brown University (RI, USA)" next to "Summer@Brown";
`sce.cornell.edu`: "Cornell University" next to "Cornell Precollege Studies Summer Residential
Program") — consistent with these being import artifacts (a fallback title where a specific
program name wasn't extracted) rather than real distinct opportunities, but **not confirmed**
without per-row research, so nothing was changed. Needs a dedicated pass: either research each
into a real named program, or disable as unusable placeholders. Full list in this session's
completion report.

## Open question — Immerse Education (5 rows, not touched)

`immerse.education` has 5 rows: "Immerse Education Essay Competition", "Immerse Education
Residential and Online Programmes 2025-2026", bare "Immerse Education", "Future Innovators
Scholarship Competition", "Immerse Education Competitions". The provider genuinely runs
multiple distinct programs/competitions (matches this session's own product-spec caution:
"Immerse Education ≠ every individual Immerse competition/program"), but the two bare-ish
entries ("Immerse Education", "Immerse Education Competitions") may be redundant umbrella
placeholders rather than real distinct offerings. Left alone — ambiguous, needs human review
per the same standard applied everywhere else in this pass, not a deterministic match.
