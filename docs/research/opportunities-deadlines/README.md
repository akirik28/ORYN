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

## Batches

Filled in as batches land; see each `dlopp_batch*.jsonl` and the closing summary below.
