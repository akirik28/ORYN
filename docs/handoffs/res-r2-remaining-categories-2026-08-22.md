# RES-R2 handoff — opportunity deadlines & cycle status, package 3 (2026-08-22)

**Lane:** RES-R2 · **Branch:** `oryn/res-r2-remaining-categories` (research-only; no live-DB
writes, no app code, no migrations) · **ID prefix:** `DLOPP-P3-`
**Consumers:** RES-V1 (contract/ID validation) → RES-V2 (source spot-checks) → RES-I2 (the
only lane that may write these facts to `opportunities`).

## What this package is

One research record per live `opportunities` row with `verification_state='verified_current'`
outside package 1's five categories and package 2's `summer_program` — **27 rows, 27
records, 100% coverage** (volunteering 6, entrepreneurship 6, conference 2, student_program
7, online_program 6; `academic_program` contributes 0 rows, all 3 of its rows are
`unverified`). Re-verified against the live DB at both package open and close (27/27 exact
match both times). This is the final package in RES-R2's brief scope order. Files:

- `data/research/opportunities/dlopp_p3_batch1.jsonl` (14 records: volunteering, entrepreneurship, first 2 of conference)
- `data/research/opportunities/dlopp_p3_batch2.jsonl` (13 records: student_program, online_program)
- Contract + full outcome summary: `docs/research/opportunities-deadlines/README_remaining_categories.md`

## Headline numbers

| finding | count |
|---|---|
| nothing_published | 15 |
| dated_current_cycle | 4 |
| closed_historical | 4 |
| deferred | 4 |
| confidence high / medium / low | 17 / 8 / 2 |
| conflicts recorded | 0 |

Four genuinely open, student-actionable dated deadlines — the highest concentration of live
findings across all three RES-R2 packages: **Habitat Derneği's Sustainable Livelihoods
Train-the-Trainer Program** (2026-08-26, **4 days** from retrieval — most time-critical
finding of the whole project), **THIMUN The Hague** (2026-09-25, ~1 month out), **Inspirit AI
Scholars Live Online** (2026-09-01, ~10 days out), **Diamond Challenge** (2027-01-14, ~5
months out).

## Mid-package data-integrity item (resolved, separate PR)

ORYN-BASORG flagged that package 1's CyberPatriot record (`DLOPP-B1-12`) had recorded
`robots_check: "no AI-crawler block"` — narrowly true (checking for named-bot rules) but
materially wrong: `www.uscyberpatriot.org/robots.txt` is a bare `User-agent: * / Disallow: /`,
a total block that is a superset including Claude. Confirmed the record's evidence traced to
an actual fetch of that domain and purged it (not deferred) per standing policy — see
`oryn/res-r2-cyberpatriot-purge` (separate branch/PR, not part of this package's diff). Swept
all three RES-R2 packages for the same shape: P1 had exactly this 1 hit (now purged), P2 had
2 genuine hits already correctly handled at research time (alternate clean domains were used)
plus 1 regex false-positive correctly ruled out (a `Host:`-scoped staging-domain rule that
doesn't apply to the production domain actually fetched), P3 had 0 hits.

## What a verifier should scrutinize first

1. **Habitat Derneği** (`DLOPP-P3-01`) — deadline 4 days from retrieval; if this PR sits
   unverified for even a few days, the finding itself may go stale before ingestion. Worth
   fast-tracking relative to the rest of the package.
2. **Genç UPSHIFT** (`DLOPP-P3-07`) — deferred for a shape not covered by RULE-FETCH-001:
   two independent fetch attempts both returned HTTP 522 (Cloudflare origin-unreachable), and
   the domain's own robots.txt precheck also failed at the connection level. This reads as
   genuine site downtime, not a block — worth a retry on a later pass rather than a permanent
   defer classification.
3. **RULE-FETCH-005 host-scoping caveat**: flagged to ORYN-BASORG directly — a pure string
   match for `User-agent: * + Disallow: /` will false-positive on `Host:`-scoped rules (see
   the uwc.org case above). A verifier applying this rule mechanically to other lanes' work
   should read the raw file, not just grep for the pattern.

## Rules honored (and where they bit)

- **RULE-FETCH-003 (defer-list gates the fetch, not a post-hoc review)**: the mechanism this
  package was built around, per package 2's own two self-flagged failures. Robots.txt
  pre-check (28 domains, one sequential pass) produced a blocked-domain file; every row's
  domain was checked against that file programmatically before a single `WebFetch` call was
  drafted, producing a fixed dispatch plan (24 to fetch, 3 gated). The 3 gated rows were
  written directly as `deferred` with `fetch_method: not_fetched` — no call was ever issued,
  so there was nothing to discard.
- **RULE-FETCH-001's three shapes**, applied to 3 more rows this package: Alpha Leo Club
  (shape 2, tooling 403, recovered via `browser_render`), Girl Up Teen Advisor Board + Girl
  Up Club (shape 2, on a domain already independently confirmed clean during package 1's
  close-out — not re-treated as a fresh ambiguous signal), İstanbul Kent Konseyi (a related
  but distinct failure: a TLS certificate error, not a 403 — recovered via a different fetch
  path without ever bypassing certificate verification).
- **Temporal-sanity check**, carried from package 2: applied to Girl Up Teen Advisor Board
  (deadline elapsed 3 weeks before retrieval despite an active "APPLY NOW" button) and UNO's
  "Spring 2026 cohort" reference.
- **Structural no-central-deadline findings**, the dominant shape in this package: Alpha Leo
  Club, Rotary Interact Club (join a local chapter any time), Coursera (course marketplace),
  JA Company Programme, Young Enterprise (per-school/country delivery), Erasmus+ Youth
  Exchanges (per-National-Agency deadlines) — six rows where `nothing_published` reflects the
  programme's actual design, not a research gap.

## Incidental data-quality flags (outside this lane's scope, for the relevant owners)

- Columbia University Pre-College Online Summer's actual "Dates and Deadlines" URL was not
  located, the SECOND time this exact site-navigation gap has been hit (package 2's Columbia
  NYC Commuter Summer row hit the identical problem). Worth a dedicated pass to find the real
  URL under this domain's navigation rather than continuing to guess paths per-row.
- Georgetown-shape data-model gap possibly recurring: Girl Up's Teen Advisor Board page title
  ("2025-2026") and body text ("2026-2027") disagree internally — likely an un-refreshed page
  title, not a data conflict, but worth knowing before ingestion trusts either title-derived
  or body-derived year framing blindly.

## Not in this package — none

This closes RES-R2's full brief scope order (package 1's five categories, package 2's
`summer_program`, and this package's six remaining categories). See
`README_remaining_categories.md`'s closing note on re-check cadence as the most likely
highest-leverage next step for whoever owns `opportunities` data freshness going forward.
