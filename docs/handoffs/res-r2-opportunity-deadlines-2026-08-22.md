# RES-R2 handoff — opportunity deadlines & cycle status, package 1 (2026-08-22)

**Lane:** RES-R2 · **Branch:** `oryn/res-r2-opportunity-deadlines` (research-only; no
live-DB writes, no app code, no migrations) · **ID prefix:** `DLOPP-`
**Consumers:** RES-V1 (contract/ID validation) → RES-V2 (source spot-checks) → RES-I2
(the only lane that may write these facts to `opportunities`).

## What this package is

One research record per live `opportunities` row with
`verification_state='verified_current'` in five categories — competition (47),
scholarship (8), research (7), internship (7), fellowship (5) = **74 rows, 74 records,
100% coverage**, all scope UUIDs re-verified against the live DB after the last batch
(74/74 exact match). Files:

- `data/research/opportunities/dlopp_batch1.jsonl` … `dlopp_batch5.jsonl` (15/15/15/14/15)
- Contract + full outcome summary: `docs/research/opportunities-deadlines/README.md`

## Headline numbers

| finding | count |
|---|---|
| dated_current_cycle | 14 |
| undated_recurring (verbatim, never year-synthesized) | 8 |
| closed_historical (dated concluded cycles) | 21 |
| nothing_published (verified absence, incl. by-design/no-central-deadline models) | 26 |
| deferred with reason | 5 |
| conflicts recorded (never resolved) | 5 |
| confidence high / medium / low | 50 / 16 / 8 |

Seven of the dated deadlines are OPEN and student-actionable within ~11 weeks of
retrieval (Gates 09-15, Breakthrough 09-15, Wharton Investment 09-11, Coca-Cola 09-30,
QuestBridge 10-01, Congressional App Challenge 10-26, Cooke 11-11) — these are the
highest-value ingestion targets for the dashboard's "Due soon" surface.

## What a verifier should scrutinize first

1. **The 5 conflicts** (Conrad off-by-one; IPsyO page-cycle regression; IPPF same-site
   season-label split; CEMC stored-value provenance; Özyeğin stale-open banner) — listed
   with both sides verbatim in the README and in each record's `conflicts` array.
2. **fetch_method caveat:** every record is `webfetch_summarized` — quotes were requested
   verbatim from the fetched page but pass through a summarizing model; spot re-fetches
   should confirm exact wording before ingestion, especially for the 14 dated records.
3. **SIP (UCSC)** — stored `cycle_status='upcoming'` is contradicted by the page's own
   "SIP 2026 Has Officially Concluded" (DLOPP-B4-08). Cheap, high-confidence data fix.
4. **Ron Brown** — the stored dated deadline (2026-12-01) is a projection; the page shows
   only the undated recurring "December 1" pattern and the 2027 competition is not open
   yet (DLOPP-B5-13). Decide policy: keep projected value labeled as such, or null it.
5. **Deferred rows (5)** need a non-AI fetch path or human check: Technovation and CSHL
   are robots-blocked for Anthropic crawlers (block respected; archive.org deliberately
   NOT used — that would route around the block); BSPEE/Ashoka/Girl Up 403 server-side
   with clean robots.

## Rules honored (and where they bit)

- **Never synthesize a year**: 8 undated-recurring records including Türkiye
  Scholarships' entirely year-less official national calendar and CyberPatriot's
  "October 1st!" — exactly the DE/NL lane's 51%-undated pattern showing up in
  opportunities.
- **Closed cycles are facts**: 21 closed-historical records carry dated concluded
  deadlines (JLI 2026-05-31, SEES 2026-02-22, …) rather than blanks.
- **Enrollment/cycle-year labeling trap**: caught live at Coca-Cola (class-of-2027 label,
  2026 deadline), Ron Brown (award-year labels: "2026 competition" deadline was Dec 2025),
  FRC ("2027 season" = DB's "2026-27 season"), Coolidge (2026-27 cycle for fall-2028
  enrollees). Each has a `year_convention_note`.
- **Identity discipline**: Cambridge's "Baltic Sea Essay Prize" ≠ BSPEE — recorded as an
  explicit identity trap instead of being used as a substitute source (DLOPP-B1-03).
- **Structural findings recorded, not forced into a date column**: 10+ programs whose
  entry model has no central deadline (national-nomination olympiads, chartered-
  association CTSOs, per-city/per-country programs, rolling journals).

## Incidental data-quality flags (outside this lane's scope, for the relevant owners)

- `opportunities` row "We the People" `application_url` → HTTP 404 (moved, likely to
  /hearings) — URL-repair lane.
- Wharton Data Science / Wharton Sports Analytics duplicate pair previously flagged by
  the verification lane is still pending — nothing here changes that.
- Zero Robotics: page's only dated 2026 cycle is the *middle-school* summer program;
  the high-school tournament (the row's real audience) has nothing published — ingester
  must not attach the MS deadline to this row (DLOPP-B4-02).

## Suggested next package (not started)

The brief's own scope order: verified `summer_program` subset (87 rows), then the
remaining 27 verified_current rows in the six small categories outside package 1's five.
