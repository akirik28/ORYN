# RES-R2 handoff — opportunity deadlines & cycle status, package 2 (2026-08-22)

**Lane:** RES-R2 · **Branch:** `oryn/res-r2-summer-programs` (research-only; no live-DB
writes, no app code, no migrations) · **ID prefix:** `DLOPP-SP-` (plus `DLOPP-RCHECK-0x` for
two rows re-diagnosed and corrected mid-package, filed against their original P1/P2 IDs)
**Consumers:** RES-V1 (contract/ID validation) → RES-V2 (source spot-checks) → RES-I2 (the
only lane that may write these facts to `opportunities`).

## What this package is

One research record per live `opportunities` row with `category='summer_program'` and
`verification_state='verified_current'` — **87 rows, 87 records, 100% coverage**, all scope
UUIDs re-verified against the live DB at close (87/87 exact match, unchanged from the
package-open count). Files:

- `data/research/opportunities/dlopp_sp_batch1.jsonl` … `dlopp_sp_batch6.jsonl` (15×5+12)
- `data/research/opportunities/dlopp_sp_rcheck1.jsonl` (2 corrected records, see below)
- Contract + full outcome summary: `docs/research/opportunities-deadlines/README_summer_programs.md`

## Headline numbers

| finding | count |
|---|---|
| closed_historical | 48 |
| nothing_published | 27 |
| deferred | 10 (net 9 after the Koç recovery below) |
| dated_current_cycle | 2 |
| confidence high / medium / low | 48 / 22 / 17 |
| conflicts recorded (never resolved) | 8 |

Two genuinely open, student-actionable dated deadlines (rare in this package — most official
pages describe already-concluded cycles in present-tense language, see the temporal-sanity
rule below): **Tisch Summer High School** (NYU) 2026-12-01, and **University of Notre Dame
Summer Scholars** opening 2026-10-19.

## What a verifier should scrutinize first

1. **Yale Young Global Scholars** (`DLOPP-SP-B6-87`) — stored `cycle_status='open'` with a
   2027-01-06 deadline directly contradicted by the official page's "currently closed...
   anticipate late September." Highest-priority conflict in this package.
2. **Interlochen Arts Camp** (`DLOPP-SP-B2-28`) — a full one-year discrepancy: stored
   deadline 2027-01-15 vs. the official page's own heading "Key dates for Camp **2026**" with
   a Jan.15 deadline. Could mean the page is stale or the DB value is wrong; not determined.
3. **Stale `upcoming`/`open` cycle_status correction candidates**, same shape as package 1's
   SIP-UCSC finding (source directly contradicts a stored non-closed status): BU Summer HS
   Programs (`DLOPP-SP-B1-04`), İTÜ Lise Yaz Okulu (`DLOPP-SP-B2-30`), Wharton M&TSI
   (`DLOPP-SP-B6-80`), and — unconfirmed but flagged — Columbia NYC Commuter Summer
   (`DLOPP-SP-B1-12`).
4. **fetch_method caveat carried from package 1**: all records except the 5 close-out/rcheck
   ones are `webfetch_summarized`. Package 1's own verification found this risk did NOT
   materialize into defects (14/14 dated records confirmed byte-exact on re-fetch) — still,
   any record here flagged with an internal-inconsistency note (SSP International's Dec 31
   2025 vs. `date_not_announced`; University of St Andrews' ambiguous reopening year; MIT
   BWSI's mixed 2025/2026 references) is a good target for a direct non-summarizing re-fetch.
5. **Two self-flagged, self-corrected process errors** — Tufts (`DLOPP-SP-B5-70`) and Penn
   Pre-College Residential (`DLOPP-SP-B6-79`) — both got fetched despite being on this
   package's own pre-check hard-defer list (confirmed genuine robots.txt policy blocks).
   Content from both fetches was discarded and is not used as evidence anywhere; both rows
   are correctly recorded as `deferred`. Flagging prominently because a verifier scanning for
   "was blocked content ever used" should be able to confirm the answer is no, directly.

## Rules honored (and where they bit)

- **Temporal-sanity check (new this package)**: retrieval happened 2026-08-22; any source's
  own stated date before that is an elapsed historical fact regardless of the page's
  present-tense framing. This was the single most common pattern in the package — dozens of
  official pages had not been refreshed for the off-season. Never used to invent a year, only
  to classify an already-dated fact as `closed_historical` rather than `dated_current_cycle`.
- **RULE-FETCH-001's three shapes** (policy block / tooling 403 / active challenge), adopted
  mid-package from ORYN-BASORG, applied both to the 3 assigned package-1 rows and
  retroactively to this package's own 2 same-day 403 deferrals (Koç recovered as shape 2;
  Johns Hopkins CTY confirmed shape 3, stays deferred with the verified reason).
- **Never synthesize a year**: held throughout, including on rows where a day-month was found
  but the source's own text didn't restate the year (Immerse Education's "25 May" left
  unpaired with 2026 despite matching `db_state` exactly; İTÜ's "16 TEMMUZ" year WAS read
  because the same page's adjacent session-date text stated it explicitly — a documented
  distinction between contextual reading and invention).
- **Conflicts recorded, never resolved**: 8 across the package, from a one-year discrepancy
  (Interlochen) to a live open/closed contradiction (Yale) to page-internal inconsistencies
  (SSP International, St Andrews).
- **robots.txt-before-content ordering**: this package's full 96-domain pre-check ran as one
  sequential pass, entirely before any content fetch — no correction needed here, but noted
  since three peer lanes hit the ordering slip independently the same day.

## Incidental data-quality flags (outside this lane's scope, for the relevant owners)

- Washington University in St. Louis College Prep Program: stored `official_url`
  (pathway.wustl.edu) now 302-redirects to WashU's general admissions site, not
  program-specific content — URL-repair flag.
- Georgetown's row may bundle two sub-programs (in-person HS sessions, now full; online
  program, rolling) under one `cycle_status` field that can't represent both — possible
  data-model gap, same shape as package 1's Girl Up per-region-pathway finding.
- Sciences Po's row similarly bundles an On-Campus and a separate Online Programme track with
  distinct deadlines.

## Suggested next package (not started)

The brief's own scope order: the 27 remaining `verified_current` rows outside package 1's
five categories and this package's `summer_program` — student_program, entrepreneurship,
volunteering, online_program, conference, academic_program.
