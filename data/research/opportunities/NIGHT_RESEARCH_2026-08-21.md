# Night research campaign — global opportunities intelligence (2026-08-21)

Founder brief: "ORYN NIGHT RESEARCH — GLOBAL OPPORTUNITIES INTELLIGENCE", timeboxed to
2026-08-21 11:00 Europe/Istanbul (session started ~01:22 local). Goal: build a large,
highly trustworthy set of real student-opportunity records worldwide, prioritizing
categories/geographies the live `opportunities` table currently under-represents.
Output only — **no production DB writes, no schema changes, no application code**, per
the brief's explicit instruction. This package is research/evidence for a later,
separate ingestion pass (by DATA-A or the founder), same contract as every prior
`data/research/opportunities/*.jsonl` batch in this repo.

## Isolation note (important for whoever reconciles this later)

This session found the shared primary checkout (`/Users/adasarpkirik/Desktop/Founder/ORYN`)
being actively branch-switched and committed to by another live session in real time
(observed `HEAD` move from `oryn/programs-pipeline-reconciled`@`5ec6700` to a brand-new
`oryn/counseling-intelligence-research`@`148a2d6` between two consecutive `git` calls, with
9 total peer Claude sessions active per `ListAgents`). Per this repo's own established
parallel-session discipline (protect first, isolate, never assume shared state is stable),
this campaign's work was moved into its own worktree/branch rather than committed into the
shared checkout: worktree `.claude/worktrees/night-opportunities-research`, branch
`oryn/night-opportunities-research-2026-08-21`, branched from the confirmed-safe
`origin/oryn/programs-pipeline-reconciled` @ `60d52a3` ("apply Wave 3 summer programs").
Not merged/rebased onto anything else mid-session to avoid compounding the risk — pushed
standalone, for the founder or DATA-A's next checkpoint to integrate.

## Live baseline (measured 2026-08-21 ~01:35 local, read-only, `qtcvcflzxbuagvvwahhu`)

`opportunities`: **369 total**, 166 `verified_current` (45%), 46/369 have a `deadline`,
18/369 have `eligible_countries` populated, 134/369 have `country` populated (235 NULL).

By category: summer_program 252, competition 72, research 13, scholarship 9, internship 8,
online_program 6, entrepreneurship 3, academic_program 3, fellowship 2, volunteering 1,
**hackathon 0, conference 0, student_program 0**.

By country (top): United States 105, United Kingdom 9, Turkey 8, Germany 2, France 2,
Spain 2, then Canada/Denmark/Switzerland/Italy/Belgium/"International" at 1 each. **Zero**
rows tagged to any Middle Eastern, East Asian, South Asian, Australian/NZ, or most
continental-European countries. 235/369 rows have no `country` at all (pre-existing gap,
not fixed here — this campaign's own new records all populate `country`).

Full dedup reference (title | organization | official_url | category | country for all 369
live rows) extracted to
`/private/tmp/claude-501/-Users-adasarpkirik-Desktop-Founder-ORYN/eb923a9f-1130-4bd1-b08e-afd777a6860e/scratchpad/existing_opportunities_baseline.txt`
(local scratch, not committed — regenerate via Supabase MCP `execute_sql` if this file is
gone in a future session). Also known-pending-not-yet-live: two records in
`data/research/opportunities/counseling-list-verification_2026-08-21.jsonl` on
`origin/oryn/research-turkey-schools` (Berkeley Math Tournament, Stanford Math Tournament —
do not re-research).

## Priority (per founder brief: accuracy > provenance > freshness > completeness > volume)

1. **Empty/near-empty categories**: hackathon, conference, student_program, volunteering,
   fellowship, entrepreneurship, academic_program, online_program, internship, scholarship,
   research — all far behind summer_program/competition.
2. **Empty/thin geography**: Middle East, East Asia, South Asia, Australia/NZ, Canada,
   continental Europe beyond the current handful, and growing Turkey further (explicit
   initial-market focus per `AGENTS.md`).
3. Global/online opportunities (bypass visa/travel barriers, help both axes at once).
4. Do not add more US summer programs — that category is already the best-covered by far
   and has its own dedicated campaign (`SUMMER_PROGRAMS_350_TRACKER.md`).

## Method

Parallel background research agents (general-purpose, WebSearch+WebFetch+Write), each
assigned a distinct category/geography slice to avoid overlap, each required to follow the
exact `docs/research-handoff-opportunities.md` JSONL contract and this repo's established
verification discipline (page-fetched not search-snippet, selectivity_evidence required
above open_enrollment, manual today-vs-quoted-date check, drop rather than guess). Each
writes to its own file under this directory; this session reviews, schema-validates,
dedupes across all files + the live baseline, and commits in batches.

## Wave log

| Wave | Agents | Scope | Candidates researched | Accepted | Rejected/dropped | Status |
|---|---|---|---|---|---|---|
| 1 | 4 | International olympiads/global competitions; Middle East + South Asia; East Asia + Australia/NZ; Canada + Turkey + continental Europe | TBD | TBD | TBD | Dispatched 2026-08-21 ~01:40 local |

(Filled in as each wave completes.)
