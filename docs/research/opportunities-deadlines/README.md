# RES-R2 — Opportunity deadlines & cycle status (Package 1)

**Lane:** RES-R2 (research org, per `docs/ORYN-ORG-STRUCTURE.md`) · **Branch:** `oryn/res-r2-opportunity-deadlines` · **ID prefix:** `DLOPP-`
**Started:** 2026-08-22 · Research output only — no live-DB writes. Ingestion belongs to RES-I2 after RES-V1/V2 verification.

## Scope (package 1)

Current-cycle application deadlines + cycle status for all live `opportunities` rows with
`verification_state = 'verified_current'` in five categories: **competition (47),
scholarship (8), research (7), internship (7), fellowship (5) = 74 rows** (live-measured
2026-08-22; only 22 of the 74 carried a `deadline`). The verified `summer_program` subset
(87 rows) is a later package, not this one.

## Record contract (`data/research/opportunities/dlopp_batch*.jsonl`)

One JSON object per line. Every record is self-contained: a verifier needs no chat
context — the cited `source_url` plus the record's own fields are the whole claim.

| field | meaning |
|---|---|
| `research_record_id` | `DLOPP-B<batch>-<nn>`, unique across the whole corpus |
| `opportunity_id` | live `opportunities.id` (uuid) the fact is about |
| `opportunity_title` / `organization` / `category` | identity snapshot from the live row |
| `db_state_at_research` | the row's `deadline` / `cycle_status` / `current_cycle_label` as measured 2026-08-22, so the delta is auditable |
| `finding_type` | `dated_current_cycle` \| `undated_recurring` \| `closed_historical` \| `nothing_published` \| `deferred` |
| `found_deadline` | ISO date **only when the source itself states the year**; otherwise null |
| `found_deadline_kind` | what the date is (registration close, submission, phase end, …) |
| `undated_deadline_verbatim` | day-month (or season) deadline exactly as the page words it — **no year ever synthesized** |
| `cycle_label_found` / `cycle_status_found` | the cycle the page describes and its state (`open`/`closed`/`upcoming`/`date_not_announced`/`unknown`) |
| `next_cycle_signal` | any published signal about the next cycle (e.g. "applications open December 2026") |
| `source_url` / `source_domain` / `source_type` | provenance; official organizer pages only |
| `verbatim_evidence` | the deadline-bearing sentence(s) as returned from the fetched page |
| `year_convention_note` | enrollment-year vs cycle-year labeling check for this page |
| `retrieved_at` / `fetch_method` | retrieval date; `webfetch_summarized` = fetched and quoted via a summarizing fetch tool (verifier should re-fetch to confirm exact wording) |
| `confidence` + `confidence_reason` | high/medium/low with the reason stated |
| `conflicts` | disagreements (source vs source, or source vs stored DB value) — recorded, never resolved |
| `robots_check` | robots.txt AI-crawler result for the domain (all domains pre-checked 2026-08-22) |
| `researcher_notes` | anything else a verifier or ingester needs |

## Evidence rules honored (from the RES-R2 brief, verbatim in spirit)

- A genuinely undated recurring deadline ("applications open each September",
  "October 1st!") is recorded verbatim; a year is **never** synthesized onto it.
- A closed-for-this-cycle deadline is a real recordable historical fact, not a blank.
- Enrollment-year vs cycle-year page labeling is checked per page (`year_convention_note`).
- Conflicts between sources (including against the stored DB value) are recorded, never
  resolved by preference.
- Prior knowledge of a program's "usual" deadline is never evidence.
- robots.txt AI-crawler blocks are respected. Pre-check of all 72 scope domains
  (2026-08-22) found two genuine blocks: `technovationchallenge.org`
  (`anthropic-ai`/`Claude-Web` → `Disallow: /`) and `www.cshl.edu`
  (`anthropic-ai`/`ClaudeBot` → `Disallow: /`) — those rows are researched only via a
  permitted official alternative host, or recorded deferred-with-reason.
  Squarespace-hosted sites in scope (nhseb.org, brumo.org, civiced.org, stemracing.com,
  thehuea.org, wearefamilyfoundation.org) name AI crawlers but merge them into the
  `User-agent: *` record with only path-specific disallows (config/search/account/API) —
  content pages are permitted. `firstinspires.org` explicitly allows ClaudeBot.

## Batches — package 1 complete (2026-08-22)

**74/74 scope rows researched, one record per row, all `opportunity_id`s verified against
the live DB (exact 74/74 match on the scope query).** Every record ID `DLOPP-B<n>-<nn>`,
unique across the corpus.

| batch | rows | contents |
|---|---|---|
| `dlopp_batch1.jsonl` | 15 | competitions 1-15 (120 Hours … EUCYS) |
| `dlopp_batch2.jsonl` | 15 | competitions 16-30 (FRC … Scholastic) |
| `dlopp_batch3.jsonl` | 15 | competitions 31-45 (Science Olympiad … IFAW art contest) |
| `dlopp_batch4.jsonl` | 14 | competitions 46-47 (YIS, Zero Robotics) + all 7 research + all 5 fellowship |
| `dlopp_batch5.jsonl` | 15 | all 7 internship + all 8 scholarship |

### Outcome distribution (74 records)

- **dated_current_cycle: 14** — a year-bearing official deadline for the live cycle.
  Student-actionable OPEN ones right now: Gates 2026-09-15 · Breakthrough Junior
  2026-09-15 · Wharton Investment 2026-09-11 · Coca-Cola 2026-09-30 · QuestBridge
  2026-10-01 · Congressional App Challenge 2026-10-26 · Cooke 2026-11-11 · plus dated
  upcoming/future-cycle: FRC 2026-11-17 · CEMC CTMC 2026-11-19 · Blue Ocean 2027-02-21 ·
  Diamond Challenge 2027-01-14 · UK Chemistry Olympiad 2027-01-11 (new fact — DB had only
  the open date) · Wharton Hack-AI-thon 2027-04-01 · Conrad 2026-10-30 (conflicts with
  stored 2026-10-29).
- **undated_recurring: 8** — real deadlines the source itself refuses to date
  (CyberPatriot "October 1st!", Concord Review's standing quarterly schedule, Türkiye
  Scholarships' year-less national calendar "January 10 – February 20", Ron Brown's
  award-year-labeled "December 1", IPPF "mid-October", Scholastic's regional Decembers,
  PennApps "October", We the People "every spring"). No year synthesized on any of them.
- **closed_historical: 21** — concluded cycles recorded as dated historical facts
  (e.g. JLI 2026-05-31, DNA Day 2026-03-04, SEES 2026-02-22, YIS 2026-02-20, BrUMO
  2026-02-15, IFAW 2026-02-01, GENIUS 2026-03-07), most with no next cycle announced yet.
- **nothing_published: 26** — verified absence, three distinct shapes: (a) genuinely
  not-yet-announced next cycles, (b) **by-design no-deadline programs** (IJHSR's verbatim
  "no deadline… all year long", JRHS rolling, InvestIN rolling bookings), and
  (c) **structural no-central-deadline models** (EUCYS/IPO/IYPT national-nomination entry,
  DECA/HOSA/NHD/Science Olympiad/NEC chartered-association or state-chapter deadlines,
  Scholastic regional, STEM Racing per-country coordinators, Genesys Works per-city).
- **deferred: 5**, each with the reason in-record: Technovation + CSHL Partners for the
  Future (robots.txt blocks Anthropic crawlers — respected; archive.org deliberately not
  used), BSPEE + Ashoka + Girl Up (server-side HTTP 403 with clean robots.txt).

### Conflicts recorded (never resolved) — 5

1. **Conrad Challenge**: stored deadline 2026-10-29 vs official page's Phase 1 end
   "Ends Oct. 30, 2026" (B1-11).
2. **IPsyO**: fetched official page shows the 2025 cycle ("Registration closes July 2,
   2025") vs the stored 2026-cycle state recorded a day earlier (B2-06) — verifier should
   browser-fetch.
3. **IPPF**: the site's own homepage (2026-27) vs /howtoparticipate (2025-26) disagree on
   season label; stored dated deadline 2026-10-13 seen on neither page (B2-07).
4. **CEMC/Waterloo**: stored 2026-10-22 absent from the row's own URL; earliest published
   registration deadline there is 2026-11-19 (CTMC lottery). Series-row modeling problem
   noted (B3-10).
5. **Özyeğin HSRI**: "APPLICATIONS FOR 2026 ARE NOW OPENED!" banner vs late-August
   calendar plausibility (B4-06).

### Deltas the ingester/verifier should look at first

- **SIP (UCSC)**: stored `cycle_status='upcoming'` is now wrong — the page says
  "SIP 2026 Has Officially Concluded" (B4-08).
- **Ron Brown**: stored dated 2026-12-01 rests on projection of an undated recurring
  pattern; the 2027 competition is not yet open on the site (B5-13).
- **We the People**: stored `application_url` returns HTTP 404 (B3-11) — URL-repair flag.
- **UK Chemistry Olympiad**: genuinely new dated fact (registration closes 2027-01-11).
- All `fetch_method: webfetch_summarized` quotes should be treated as
  re-fetch-and-confirm targets by RES-V2 — the fetch tool summarizes with a small model;
  quotes were requested verbatim but are not byte-guaranteed.

### Not in this package

The verified `summer_program` subset (87 rows) — next package. Rows outside the five
scope categories (student_program, entrepreneurship, volunteering, online_program,
conference, academic_program — 27 more verified_current rows) also remain.
