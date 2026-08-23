# Next-10 requirement/deadline sourcing — handoff (2026-08-23)

Assigned by ORYN-CEO as the throughput follow-up to the completed top-5 package
(`oryn/top5-requirements-2026-08-23`, already ingested by DATA — not touched here). Same
methodology: `AGENTS.md` §7 official-source priority, `source_url`+`retrieved_at`+`confidence`
per record, live-DB identity check (canonical status + current req/deadline/programme
counts) before researching each university.

## Live-DB identity check done before research started

All 10 confirmed `duplicate_status='canonical'`, `req_count=0`, `deadline_count=0`, and
programme counts matching the CEO's package definition exactly:

| University | `university_id` | `programme_count` |
|---|---|---|
| University of Illinois Urbana-Champaign | `1d1473c9-d592-4a5a-bc67-d0c3b0e0c0f7` | 127 |
| Loughborough University | `9a1990de-1e02-424e-b4ca-5fe6c603d5cd` | 124 |
| Istanbul University | `a28e4468-489d-482d-970b-c2964e43f7fc` | 124 |
| The University of Sheffield | `4d211dd5-b88f-43f1-968a-47711b9acc8b` | 111 |
| University of Rochester | `dd1392b3-ccbf-42a4-b533-d81fe8b7536e` | 99 |
| University of Leicester | `65a15e7d-1cfd-4108-91b0-130aa738b84c` | 98 |
| City St George's, University of London | `36fb76fa-9b86-48dc-a8c9-530cf13f43d6` | 97 |
| University of North Carolina at Chapel Hill | `307ba676-a87c-4baf-926f-e7488ac6562e` | 95 |
| University of Virginia | `2861b0d3-a42b-4c5a-8451-d32623575ae8` | 90 |
| Emory University | `d8dc88c8-3e7d-4a90-a10b-a54ff77406e4` | 89 |

**Identity trap caught and avoided**: "Rochester" and "Virginia" both have a same-country,
different-institution near-miss in the live DB — Rochester Institute of Technology
(`3302ff29...`, 0 programmes, unrelated to University of Rochester) and Virginia Tech
(`07ed75e5...`, 0 programmes, unrelated to University of Virginia). Neither was queried
against; both target records use the correct canonical id above.

## Coverage — all 10 universities have ≥1 requirement + ≥1 deadline record

12 requirement + 11 deadline records total (23 records). Per-university breakdown and
confidence is in the files themselves (`confidence`/`verification_state` fields) — summary:

- **High/medium confidence, directly fetched**: UIUC, Loughborough, Istanbul University,
  Sheffield, Rochester, UNC, Emory (7 of 10) — at least the deadline record or the primary
  requirement record was confirmed via a direct WebFetch/curl+pypdf against the official
  page, not just search-engine synthesis.
- **Low confidence, `NEEDS_REVIEW`, WebSearch-synthesized only**: Leicester (requirement),
  City St George's (requirement + deadline caveat), UVA (requirement + deadline). Three
  UK/US domains (`le.ac.uk`, `citystgeorges.ac.uk`, `admission.virginia.edu`) either 403'd
  every fetch attempt (including a browser-UA curl, which resolved Durham's equivalent
  block in the prior package) or returned an empty JS-rendered shell. These records are
  included so every one of the 10 universities has coverage, but they should be the first
  candidates for a follow-up direct-fetch pass before being trusted at the same level as
  the rest of this batch — flagged explicitly via `verification_state: NEEDS_REVIEW` and a
  `confidence: low`, not silently presented as equally solid.

## Recurring patterns confirmed again in this batch

1. **ETS TOEFL 21-January-2026 rescale** — fourth confirmed sighting (Loughborough, after
   USC/Purdue/Warwick-adjacent findings in the prior package). Solidly established as an
   ETS-wide change now, not an institution artifact.
2. **UK institutions' own sites lag `ucas.com`'s national 2027-entry date** — hit again at
   Loughborough (own page still only has 2026 dates); Sheffield/Leicester/City St George's
   were given the national date directly without separately checking each institution's own
   site this pass (time-bounded choice, noted per-record in `limitations`).
3. **A same-calendar-day ED-II/RD deadline** appears at both Rochester (Jan 5) and Emory
   (Jan 1) — not a data-entry pattern to "fix", a real recurring structural choice among
   test-optional private US universities.
4. **A genuinely novel testing-policy shape**: UNC Chapel Hill's GPA-conditional
   requirement (below 2.8 weighted GPA → must submit ACT≥17/SAT≥930; 2.80+ → optional) is
   structurally distinct from every "test-optional"/"test-required"/"test expected" pattern
   seen in either package — set at the UNC System level, not just this campus.

## Identity note

`Istanbul University` (istanbul.edu.tr) required active identity discipline — search
results repeatedly surfaced "Istanbul University-Cerrahpaşa" (`iuc.edu.tr`, a separate
institution since a 2019/2020 split) and, once, an unrelated national civil-service exam
(İdari Yargı Ön Sınavı, also abbreviated "İYÖS") under similar-sounding queries. Every
source used for the two Istanbul University records was checked to reference
`istanbul.edu.tr`/`cdn.istanbul.edu.tr` specifically before use.

## Files

- `data/research/university-requirements/next10_requirements_2026-08-23.jsonl` — 12 records.
- `data/research/university-requirements/next10_deadlines_2026-08-23.jsonl` — 11 records.

Not yet ingested — research handoff only, per this lane's `RESEARCH` mandate (no live-DB
writes). Follows the existing JSONL contract in
`docs/research-handoff-university-requirements.md`. Scope held to exactly these 10
universities per the CEO's package definition.
