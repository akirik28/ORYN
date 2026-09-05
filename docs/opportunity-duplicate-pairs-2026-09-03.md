# Duplicate-pair resolution — 2026-09-03

CEO asked for the duplicate pairs flagged in passing across the last two sweeps (Lehigh
Iacocca, Edinburgh Pre-University) to actually get resolved now that organization is
filled or staged for 190 records — "the precondition everyone kept deferring to." Brief:
find the real pairs across the active catalog, work out which row survives and what has to
move before the other retires, stage but don't apply, and report rather than merge anything
uncertain.

**Result: 4 confirmed duplicate pairs staged for resolution, 2 uncertain pairs flagged
without merging, and one adjacent-but-different pattern (3 examples) flagged separately.**

## Why the existing tooling didn't catch these

Read `lib/opportunities/dedup.ts` and `lib/opportunities/duplicates.ts` first, per the
brief. Two separate gaps, not one:

1. **`dedup.ts`'s `isDuplicateOpportunity()`** (the ingest-time check) only compares
   organization+title when *both* organizations are non-empty strings:
   `orgA && orgA === orgB && titleSimilarity(...) >= 0.6`. When both sides are null — the
   state of every raw-scrape record before organization gets researched — `orgA` is `""`,
   which is falsy, so the whole branch short-circuits to `false` regardless of title
   similarity. All four confirmed pairs below were null-organization on both sides at
   ingest time. Filling organization now doesn't retroactively dedupe anything already
   ingested; it only stops blocking the check for future ingests (or a human audit, like
   this one).
2. **`duplicates.ts`'s `findDuplicateCandidates()`** (the audit-time check, run via
   `scripts/audit-opportunity-duplicates.ts`) groups by *exact hostname* (stripping only
   `www.`), then only compares titles within a group. Real institutions routinely split
   content across department- or service-specific subdomains, so two pages about the same
   programme on different subdomains of the same institution never land in the same
   comparison group. Confirmed for all four pairs by re-deriving the exact hostnames the
   live tool computes:

   | Pair | Hostname A | Hostname B |
   |---|---|---|
   | Lehigh | `global.lehigh.edu` | `health.lehigh.edu` |
   | Edinburgh | `col.ed.ac.uk` | `study.ed.ac.uk` |
   | SAIC | `saic.edu` | `continuingstudies.saic.edu` |
   | Stony Brook | `stonybrook.edu` | `news.stonybrook.edu` |

   None share an exact hostname, so none would ever surface from the tool as currently
   written — a structural blind spot in the grouping key, not a similarity-threshold
   problem. Not fixed here (a code change to a shared module is out of scope for a
   staged-data task); the natural fix is grouping by registrable domain (eTLD+1) instead of
   exact hostname, which needs a proper public-suffix list to handle multi-part TLDs like
   `.ac.uk` / `.edu.tr` correctly rather than a hand-rolled heuristic.

## Method

Live SQL grouping of all 282 active opportunities with an `official_url`, two ways: exact
hostname (reproducing what the existing tool actually does — reference, not the fix) and a
registrable-domain heuristic (last 2 labels, or last 3 when the pattern looks like a
multi-part TLD). The registrable-domain pass surfaced ~20 same-institution clusters. Each
was read individually rather than trusted as a hit — most turned out to be genuinely
distinct sibling programs from one provider: MIT's BWSI/PRIMES/MITES/Zero Robotics,
Columbia's Spring/Online/Commuter tracks, UKMT's ten different named competitions, Girl
Up's three different initiatives. This is exactly the false-positive shape
`duplicates.ts`'s own code comments already warn about (six different Columbia pre-college
offerings on one domain). Four clusters survived close reading as real duplicates.

## Safety check before proposing anything

Every id below — both survivor and retiree, all 8 — was checked against every table with
an `opportunity_id` column:

```sql
select
  (select count(*) from activities a where a.opportunity_id = c.id) as activities_n,
  (select count(*) from opportunity_matches m where m.opportunity_id = c.id) as matches_n,
  (select count(*) from opportunity_sources s where s.opportunity_id = c.id) as sources_n,
  (select count(*) from saved_opportunities so where so.opportunity_id = c.id) as saved_n
...
```

**`activities`: 0 rows for all 8. `saved_opportunities`: 0 rows for all 8.** No student has
saved or logged an activity against any of these eight records — retiring the losing row
in each pair drops nothing a student put there. `opportunity_sources` has exactly 1 row
each (routine provenance, not user data). `opportunity_matches` has 9 rows for six of the
eight ids and 4 for `dc762fce` — those are computed by a batch job, not authored by a
student, and are left alone below; a disabled row should simply stop being matched or
surfaced going forward, and the next scheduled match run will regenerate what it needs to.

Retirement is `status = 'disabled'`, matching this repo's own established convention (the
audit script's own summary line already says this is how a confirmed pair should be
resolved). No row is ever deleted.

## The 4 confirmed pairs

1. **Lehigh University — Iacocca Global Entrepreneurship Intensive.** Survivor `d12506f1`
   (official_url `global.lehigh.edu`, at least plausible). Retire `a7a89e1e` (official_url
   is a health-sciences *graduate* admissions event-schedule page — unrelated to an
   undergraduate high-school programme, and very likely why this became a second row
   instead of an edit to the first). Merged `a7a89e1e`'s two facts the survivor lacked
   ("more than 64 countries," "four-week residential") into the surviving description.
2. **University of Edinburgh — Pre-University Summer School.** Survivor `dc762fce`
   (official_url `study.ed.ac.uk/summer-school`, and the one with an already-verified
   2026-08-24 direct-fetch confirmation of current dates/deadline). Retire `30436a92`
   (official_url `col.ed.ac.uk/our-programmes`, a general listing page, never independently
   re-verified, stuck on stale 2025 text). Merged `30436a92`'s course example
   (Pre-University Social Sciences) and its "accommodation included in the fee" detail into
   the surviving description.
3. **SAIC — Early College Program / ECPSI.** Survivor `e9c4cd39` (complete, substantive,
   already queued for a prose rewrite in the prior sweep). Retire `7f8281b0` — its title is
   a marketing tagline ("Earn college credit that may transfer to any college you attend"),
   its description is two orphaned fragments about a webinar and visiting artists, and its
   official_url path (`.../ecposi/overview`) literally names the same ECP+ECPSI pairing
   `e9c4cd39` already covers. Nothing worth merging. One thing flagged for a human glance,
   not asserted: `7f8281b0`'s URL may actually be the more precisely-targeted page — neither
   was independently re-fetched live to settle that, so the survivor's URL is left as-is.
4. **Stony Brook — Garcia Center research programme.** Survivor `a37fa810` "Garcia Summer
   Research Program" (organization already filled, official program page as source, a real
   cost figure, names the specific venue students present at — Materials Research Society
   Fall Meeting). Retire `d83d7048` "Garcia Summer Scholars" (sourced from a Stony Brook
   *news article about* the programme rather than the programme's own page; every fact in
   it is a less-specific restatement of something `a37fa810` already says). Nothing worth
   merging.

## Flagged, not merged — genuinely uncertain

**IE University: `41db8ceb` "IE University Pre-University Summer Program" vs. `3c4cbeb7`
"Pre-College Program"** (the record I fixed for Koç-contamination in the earlier sweep).
Same institution, similar age range, but materially different facts: `41db8ceb` states
EUR 5,900, six uniform two-week intakes, targeting the 2027 cycle; `3c4cbeb7` states EUR
4,800, three variable-length intakes, targeting 2026. This could be the same programme's
two different year-cycles (one stale) or two genuinely different IE pre-college products —
IE's own live page is titled "Pre-University Summer **Programs**," plural, suggesting more
than one track exists. Not confident enough to merge; reporting the facts instead.

**Wharton: `fad2bef3` "Wharton Global Youth Program"** doesn't pair cleanly with any one
sibling — see the pattern below instead.

## A related but different pattern: generic overview records shadowing specific programs

Three records read like a general "here's what we offer" or "how to apply" page from an
institution, ingested as if they were one single applicable opportunity, sitting alongside
the specific named programs they actually describe or reference:

- **`fad2bef3` "Wharton Global Youth Program"** — official_url is
  `globalyouth.wharton.upenn.edu/application-information/`, a general admissions-criteria
  page that explicitly discusses eligibility for the named sibling programs (FBW, LBW,
  M&TSI) rather than describing one program of its own.
- **`af30653c` "Northwestern University"** — describes CTD's entire course catalog across
  all ages and modalities, distinct in scope from `c0343703` "Northwestern CTD 3-Week
  Academic Summer Camps," a specific named summer program with its own eligibility tiers.
- **`16d56c3b` "Purdue University"** — describes Purdue's general "Summer College for High
  School Students" (650+ courses across all disciplines), distinct in scope from `1d9d3901`
  "For-Credit Fun-Sized Courses," one specific narrow engineering course (CE299) within
  that catalog — the same record already flagged as too thin to rewrite in the prior sweep.

These aren't duplicates in the sense the brief asked about — retiring the general one
wouldn't be replacing it with an identical row, since it covers ground the specific one
doesn't (and vice versa). But an overview page isn't really one applicable "opportunity"
either. This reads like a product question — should a general admissions/overview page be
its own catalog row at all? — rather than a data-merge decision, so it's flagged here
rather than resolved. Not an exhaustive sweep for more instances of this specific pattern;
these three surfaced as a side effect of the domain-clustering pass.

## What's left unresolved on purpose

The two description UPDATEs in this package (Lehigh, Edinburgh) overlap with rows already
touched by the still-unapplied `scrape_description_prose_rewrite_2026-09-03.sql`. This
file's guards match the current live raw-scrape text and will simply no-op safely
(`UPDATE 0`) if that other file runs first — noted in-line in the SQL file itself, not
something this doc resolves, since it depends on which order a human applies both files in.

---

## ✅ 2026-09-05 audit — closed

The 4 confirmed pairs (Lehigh, Edinburgh, SAIC, Stony Brook/Garcia) staged for disable →
**Closed** — commit `0fc819d7` (2026-09-04), "Package 16: consolidate 3 real opportunity
duplicate pairs, fix the code comment that cited the wrong twin". Verified via `git merge-base
--is-ancestor 0fc819d7 origin/main`.
